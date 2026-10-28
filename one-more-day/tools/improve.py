"""Second voicing pass for lines the first pass flagged (mostly very short lines, which MMS says badly in isolation).

Each flagged line gets extra takes spoken at the end of a carrier sentence ("แล้วเขาก็ตอบว่า …"), with the carrier cut
off again, so the model hears it in the context it was trained on. Every take - the old one included - is scored the
same way: Whisper hears it after a known carrier phrase, which keeps it from hallucinating on a half-second clip.
The best take replaces the old wav in build/voice/raw (same key, so timeline.py and score.py pick it up unchanged).

Usage: python tools/improve.py build/part1.json [max-cer]
"""
import json, os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
import voice as v

SR = v.SR
CARRIERS = ['แล้วเขาก็ตอบว่า', 'ฉันบอกว่า']
_eng = {}
def det_engine(kind):
    # low noise and fixed durations, so the carrier says the same thing alone and inside the sentence
    if kind not in _eng: _eng[kind] = v.tts_engine(*{'det': (.33, 0.0), 'det2': (.5, .3)}[kind])
    return _eng[kind]
def gen(kind, text, sp): return np.asarray(det_engine(kind).generate(text, sid=0, speed=sp).samples, np.float32)

_car = None
def heard_in_context(x):
    global _car
    if _car is None: _car = v.synth('เขาพูดว่า', 1.0, 'norm')
    h = v.transcribe(np.concatenate([_car, np.zeros(int(SR * .25), np.float32), x]))
    # drop whatever Whisper made of the carrier (it is not always spelled the same)
    for pre in ('เขาพูดว่า', 'เขาพูบว่า', 'เขาพูบ่า'):
        if h.strip().startswith(pre): return h.strip()[len(pre):]
    return h

def trim(x):
    nz = np.where(np.abs(x) > .01)[0]
    return x[max(0, nz[0] - 300): nz[-1] + 800] if len(nz) else x

def cut_take(kind, carrier, text, sp):
    P, Y = gen(kind, carrier, sp), gen(kind, carrier + ' ' + text, sp)
    e = np.convolve(np.abs(Y), np.ones(240) / 240, 'same')
    nz = np.where(np.abs(P) > .01)[0]; end = nz[-1] if len(nz) else len(P)
    lo, hi = max(0, end - int(.05 * SR)), min(len(Y) - 1, end + int(.12 * SR))
    if hi <= lo: return None
    k = lo + int(np.argmin(e[lo:hi]))
    x = Y[k:].copy(); x[:200] *= np.linspace(0, 1, min(200, len(x)))
    x = trim(x)
    return x if len(x) > SR * .12 else None

def improve(l, max_cer):
    path = os.path.join(v.RAW, v.key_for(l) + '.wav'); meta = path + '.json'
    if not (os.path.exists(path) and os.path.exists(meta)): return None
    info = json.load(open(meta, encoding='utf-8'))
    if info['cer'] <= max_cer or info.get('pass2'): return None
    ref = l.get('tts') or l['text']
    plain = v.expand(ref); sp = v.line_speed(l)
    old = sf.read(path, dtype='float32')[0]
    h = heard_in_context(old); best = (v.cer(ref, h), info['take'], h, old)
    for kind in ('det', 'det2'):
        for carrier in CARRIERS:
            for s in (sp, round(sp * .88, 3)):
                for txt in (plain, v.respell(plain)):
                    x = cut_take(kind, carrier, txt, s)
                    if x is None: continue
                    h = heard_in_context(x); score = v.cer(ref, h)
                    if score < best[0]: best = (score, f'cut-{kind}-{CARRIERS.index(carrier)}', h, x)
                    if best[0] <= .15: break
                if best[0] <= .15: break
            if best[0] <= .15: break
        if best[0] <= .15: break
    score, take, h, x = best
    if take != info['take']: sf.write(path, x, SR)
    new = dict(info, cer=round(score, 3), take=take, heard=h, dur=round(len(x) / SR, 3), pass2=True, cer1=info['cer'])
    json.dump(new, open(meta, 'w', encoding='utf-8'), ensure_ascii=False)
    return new

def main(script, max_cer=.35):
    data = json.load(open(script, encoding='utf-8'))
    lines = [i for s in data['scenes'] for i in s['items'] if i['type'] == 'line']
    n = 0
    for l in lines:
        r = improve(l, max_cer)
        if r: n += 1; print(f"{l['id']:18s} {r['cer1']:.2f} -> {r['cer']:.2f} {r['take']:12s} {l['text'][:30]} => {r['heard'][:30]}", flush=True)
    print('improved pass over', n, 'lines')

if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else .35)
