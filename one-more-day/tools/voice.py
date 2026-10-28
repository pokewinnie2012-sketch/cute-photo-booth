"""Voice every line of a parsed screenplay with an offline Thai TTS, checking each take with speech recognition.

    python tools/voice.py build/part1.json            # synthesize + verify (cached, safe to re-run)

For each line several takes are generated (original spelling and a phonetic re-spelling, at normal and
low sampling noise, at two speeds). Each take is transcribed with Whisper and compared with the script;
the take with the lowest character error rate wins, and generation stops early once a take is accurate.
Raw winning takes go to build/voice/raw/<key>.wav and a report to build/voice/report_<name>.json, listing
lines that still mis-recognize so they can get a manual {respelling} in the screenplay.

Models (not in git): MMS Thai VITS for sherpa-onnx and Whisper small for sherpa-onnx, both from
https://github.com/k2-fsa/sherpa-onnx/releases (tts-models/vits-mms-tha, asr-models/sherpa-onnx-whisper-small).
Set MMS_THA_DIR and WHISPER_DIR, or put them in tools/model/.
"""
import hashlib, json, os, re, sys, time

import numpy as np
import sherpa_onnx
import soundfile as sf
from pythainlp.tokenize import word_tokenize
from pythainlp.transliterate import pronunciate
from pythainlp.util import num_to_thaiword

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MMS = os.environ.get('MMS_THA_DIR', os.path.join(HERE, 'model', 'vits-mms-tha'))
WHISPER = os.environ.get('WHISPER_DIR', os.path.join(HERE, 'model', 'sherpa-onnx-whisper-small'))
RAW = os.path.join(ROOT, 'build', 'voice', 'raw')
SR = 16000
GOOD = 0.2

SPEED = {'kan': 1.05, 'film': 1.05, 'film2': 1.05, 'mom': 1.0, 'dad': .92, 'tae': 1.1, 'ball': 1.0, 'ton': 1.08, 'kong': .95,
         'fon': 1.08, 'teacher': 1.0, 'teacher2': 1.0, 'pa': 1.0, 'doctor': .95, 'clerk': 1.05, 'fkan': .92, '???': .9, 'student': 1.05,
         'kan2': 1.0, 'husband': 1.0, 'boss': 1.0, 'child': 1.1}
EMO_SPEED = {'sad': .92, 'cry': .88, 'soft': .95, 'whisper': .93, 'shout': 1.06, 'angry': 1.04, 'weak': .85, 'tired': .94, 'calm': .95, 'cold': .96}
LEXICON = {     # word -> respelling, for words both spellings get wrong (filled from review)
    'มัธยมศึกษา': 'มัดทะยมสึกสา', 'กรุณา': 'กะรุนา', 'โทรทรรศน์': 'โทระทัด', 'ดาราศาสตร์': 'ดาราสาด', 'วิศวะ': 'วิดสะวะ',
    'แพทย์': 'แพด', 'ฟิล์ม': 'ฟิม', 'กันต์': 'กัน', 'สัญญา': 'สันยา', 'รึไง': 'หรือไง', 'บัดดี้': 'บัดดี้',
}

def tts_engine(noise, noise_w):
    return sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{MMS}/model.onnx', tokens=f'{MMS}/tokens.txt', noise_scale=noise, noise_scale_w=noise_w),
        num_threads=4)))
_eng = {}
def engine(kind):
    if kind not in _eng: _eng[kind] = tts_engine(*({'norm': (.6, .8), 'low': (.33, .4)}[kind]))
    return _eng[kind]
_rec = None
def recognizer():
    global _rec
    if _rec is None:
        _rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{WHISPER}/small-encoder.int8.onnx', decoder=f'{WHISPER}/small-decoder.int8.onnx',
                                                         tokens=f'{WHISPER}/small-tokens.txt', language='th', task='transcribe', num_threads=4)
    return _rec

def expand(text):
    """Script text -> what should be heard: repeat words marked with ๆ, spell out numbers."""
    text = re.sub(r'\d+', lambda m: num_to_thaiword(int(m[0])), text)
    out = []
    for tok in word_tokenize(text, engine='newmm', keep_whitespace=True):
        if tok.strip() == 'ๆ':
            prev = next((w for w in reversed(out) if w.strip()), '')
            out.append(prev)
        else:
            out.append(tok)
    return ''.join(out).replace('ๆ', '')

def respell(text):
    out = []
    for w in word_tokenize(text, engine='newmm', keep_whitespace=True):
        if w in LEXICON: out.append(LEXICON[w])
        elif re.fullmatch(r'[ก-๏]{2,}', w):
            try: out.append(pronunciate(w).replace('ฺ', '').replace('-', ''))
            except Exception: out.append(w)
        else: out.append(w)
    return ''.join(out)

def chunks(text):
    """Split at punctuation into (say|pause) pieces the model can read."""
    text = text.replace('ำ', 'ํา')
    out = []
    for part in re.split(r'(…|\.\.\.|[!?,])', text):
        if part in ('…', '...'): out.append(('pause', .32))
        elif part in ('!', '?', ','): out.append(('pause', .14))
        else:
            clean = re.sub(r"[^฀-๿' -]", ' ', part).strip()
            if clean: out.append(('say', clean))
    return out

def synth(text, speed, kind):
    pieces = []
    for k, v in chunks(text):
        if k == 'pause': pieces.append(np.zeros(int(SR * v), np.float32))
        else: pieces.append(np.asarray(engine(kind).generate(v, sid=0, speed=speed).samples, np.float32))
    x = np.concatenate(pieces) if pieces else np.zeros(SR // 4, np.float32)
    # trim leading/trailing near-silence
    nz = np.where(np.abs(x) > 0.01)[0]
    return x[max(0, nz[0] - 400): nz[-1] + 800] if len(nz) else x

def transcribe(x):
    s = recognizer().create_stream()
    s.accept_waveform(SR, np.concatenate([np.zeros(SR // 2, np.float32), x, np.zeros(SR, np.float32)]))
    recognizer().decode_stream(s)
    return s.result.text

def norm(s): return re.sub(r'[^ก-๏]', '', expand(s).replace('ำ', 'ํา'))
def cer(ref, hyp):
    a, b = norm(ref), norm(hyp)
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))

def line_speed(l):
    sp = SPEED.get(l['who'], 1.0) * EMO_SPEED.get(l.get('emo') or '', 1.0)
    return round(sp * (.96 if l.get('vo') else 1.0), 3)

def key_for(l):
    return hashlib.sha1(json.dumps([l.get('tts') or l['text'], line_speed(l), 'v2']).encode()).hexdigest()[:16]

def voice_line(l):
    path = os.path.join(RAW, key_for(l) + '.wav')
    meta = path + '.json'
    if os.path.exists(path) and os.path.exists(meta): return json.load(open(meta, encoding='utf-8'))
    src = l.get('tts') or l['text']
    plain = expand(src)
    sp = line_speed(l)
    tries = [('resp', respell(plain), sp, 'norm'), ('plain', plain, sp, 'norm'), ('resp-low', respell(plain), sp, 'low'),
             ('plain-low', plain, sp, 'low'), ('resp-slow', respell(plain), round(sp * .9, 3), 'low')]
    best = None
    for name, txt, s, kind in tries:
        x = synth(txt, s, kind)
        hyp = transcribe(x)
        score = cer(l['text'] if not l.get('tts') else l['tts'], hyp)
        if best is None or score < best[0]: best = (score, name, hyp, x)
        n_tried = tries.index((name, txt, s, kind)) + 1
        if best[0] <= GOOD or (n_tried >= 3 and best[0] <= .3): break
    score, name, hyp, x = best
    sf.write(path, x, SR)
    info = {'key': key_for(l), 'cer': round(score, 3), 'take': name, 'heard': hyp, 'dur': round(len(x) / SR, 3)}
    json.dump(info, open(meta, 'w', encoding='utf-8'), ensure_ascii=False)
    return info

def main(script):
    os.makedirs(RAW, exist_ok=True)
    data = json.load(open(script, encoding='utf-8'))
    lines = [i for s in data['scenes'] for i in s['items'] if i['type'] == 'line']
    report, t0 = {}, time.time()
    for n, l in enumerate(lines, 1):
        info = voice_line(l)
        report[l['id']] = dict(info, who=l['who'], text=l['text'])
        flag = '  <-- check' if info['cer'] > .35 else ''
        print(f"[{n}/{len(lines)} {time.time() - t0:6.0f}s] {l['id']} {info['cer']:.2f} {info['take']:9s} {l['text'][:40]}{flag}", flush=True)
    name = os.path.splitext(os.path.basename(script))[0]
    out = os.path.join(ROOT, 'build', 'voice', f'report_{name}.json')
    json.dump(report, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = [k for k, v in report.items() if v['cer'] > .35]
    print(f'done: {len(lines)} lines, mean CER {np.mean([v["cer"] for v in report.values()]):.3f}, {len(bad)} to check -> {out}')

if __name__ == '__main__':
    main(sys.argv[1])
