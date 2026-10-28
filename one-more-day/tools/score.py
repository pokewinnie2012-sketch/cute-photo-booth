"""Score and mix a part: character voices, music, ambience and sound effects -> build/partN.wav / .m4a

    python tools/score.py 1

Voices: each character's line is shaped from the raw TTS take with a two-stage pitch/formant shift
(women and children get raised formants as well as pitch, so they sound less like a sped-up man),
a little EQ, and the room of the scene (small room, hall, outdoors, phone, loudspeaker).
Music: a small synthesized ensemble (piano, strings pad, bass, bells) playing a theme chosen per scene,
ducked under dialogue. Everything is rendered scene by scene to keep memory small.
"""
import hashlib, json, os, subprocess, sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 44100
RAW = os.path.join(ROOT, 'build', 'voice', 'raw')
STY = os.path.join(ROOT, 'build', 'voice', 'styled')
rng = np.random.default_rng(7)

# total pitch ratio, formant ratio
VOICE = {'kan': (1.03, 1.02), 'kanyoung': (1.05, 1.03), 'kan2': (.97, 1.0), 'fkan': (.9, .96), '???': (.86, .95),
         'film': (1.55, 1.17), 'filmyoung': (1.58, 1.18), 'film2': (1.52, 1.16), 'fon': (1.63, 1.2), 'mom': (1.42, 1.12),
         'clerk': (1.5, 1.15), 'child': (1.9, 1.3), 'dad': (.82, .93), 'tae': (1.0, 1.0), 'ball': (.9, .95), 'ton': (1.1, 1.05),
         'kong': (.86, .96), 'teacher': (.88, .95), 'teacher2': (.95, .98), 'doctor': (.92, .96), 'pa': (.9, .95),
         'student': (1.08, 1.03), 'groom': (1.0, 1.0)}
ROOM = {'bedroom': 'room', 'dorm': 'room', 'dining': 'room', 'cafe': 'room', 'jewelry': 'room', 'bookstore': 'room', 'office': 'room',
        'livingroom': 'room', 'classroom': 'room', 'lab': 'room', 'restaurant': 'room', 'hospital': 'hall', 'hall': 'hall', 'lecture': 'hall',
        'corridor': 'hall', 'funeral': 'hall', 'wedding': 'hall'}
GAIN = {'shout': 1.5, 'whisper': .62, 'soft': .85, 'weak': .7}

# ---------------------------------------------------------------- voices
def style_voice(line, room):
    who = line['who']; pitch, form = VOICE.get(who, (1.0, 1.0))
    fx = line.get('fx') or ('vo' if line['vo'] else room)
    if who in ('fkan', '???'): fx = 'ghost'
    src = os.path.join(RAW, line['key'] + '.wav')
    if not os.path.exists(src): return None
    key = hashlib.sha1(json.dumps([line['key'], pitch, form, fx, 'v3']).encode()).hexdigest()[:16]
    out = os.path.join(STY, key + '.wav')
    if not os.path.exists(out):
        os.makedirs(STY, exist_ok=True)
        af = [f'aresample={SR}', f'rubberband=pitch={form}:formant=shifted:pitchq=quality', f'rubberband=pitch={pitch / form:.4f}:formant=preserved:pitchq=quality',
              'highpass=f=80', 'equalizer=f=3000:t=q:w=1:g=2.5' if pitch > 1.2 else 'equalizer=f=180:t=q:w=1:g=2']
        af += {'room': ['aecho=0.8:0.35:18|29:0.16|0.1'], 'hall': ['aecho=0.8:0.5:45|70|110:0.22|0.14|0.08'], 'outdoor': [],
               'vo': ['aecho=0.8:0.3:25:0.1'], 'phone': ['highpass=f=420', 'lowpass=f=3200', 'acrusher=bits=10:mix=.25'],
               'pa': ['highpass=f=300', 'lowpass=f=3400', 'aecho=0.8:0.6:90|180:0.3|0.18'], 'ghost': ['aecho=0.8:0.7:110|230:0.35|0.22', 'lowpass=f=3600']}[fx]
        af.append('apad=pad_dur=0.25')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(af), '-ac', '1', out], check=True)
    x, _ = sf.read(out, dtype='float32')
    loud = x[np.abs(x) > .01]
    x = x / (np.sqrt(np.mean(loud ** 2)) + 1e-6) * .1 * GAIN.get(line.get('emo') or '', 1.0) * (.9 if line['vo'] else 1)
    return np.clip(x, -.95, .95)

# ---------------------------------------------------------------- instruments
def env_adsr(n, a, d, s, r):
    e = np.ones(n, np.float32) * s
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if D: e[A:A + D] = np.linspace(1, s, len(e[A:A + D]))
    if R: e[-R:] *= np.linspace(1, 0, min(R, n))
    return e
def piano(f, dur, vel=.25):
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR
    x = sum((1 / k ** 1.4) * np.sin(2 * np.pi * f * k * (1 + .0004 * k * k) * t) * np.exp(-t * (1.6 + k * .9)) for k in range(1, 7))
    x *= np.minimum(1, t / .004)
    return (x * vel).astype(np.float32)
def pad(freqs, dur, vel=.06, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n, np.float32)
    for f in freqs:
        for det in (-.0035, .0035):
            vib = 1 + .002 * np.sin(2 * np.pi * 5 * t + f)
            x += sum((1 / k ** (1.8 / bright)) * np.sin(2 * np.pi * f * (1 + det) * k * vib * t) for k in range(1, 7)).astype(np.float32)
    return x * vel * env_adsr(n, min(1.5, dur * .3), .1, 1, min(1.5, dur * .3))
def bass(f, dur, vel=.18):
    n = int(dur * SR); t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 1.2) * np.minimum(1, t / .01) * vel).astype(np.float32)
def bell(f, dur=2.5, vel=.06):
    n = int(dur * SR); t = np.arange(n) / SR
    return (sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (2 + r)) for r, a in ((1, 1), (2.76, .5), (5.4, .25), (8.9, .1))) * vel).astype(np.float32)
def pluck(f, dur=.5, vel=.12):
    n = int(dur * SR); t = np.arange(n) / SR
    return (sum((1 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (6 + 3 * k)) for k in range(1, 6)) * vel).astype(np.float32)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def band(x, lo, hi, order=2):
    lo = max(20, lo); hi = min(SR / 2 - 100, hi)
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x).astype(np.float32)
def lowp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x).astype(np.float32)
def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x, i = x[-i:], 0
    m = min(len(x), len(buf) - i); buf[i:i + m] += x[:m] * gain
IR = None
def reverb(x, size=2.2, wet=.25):
    global IR
    if IR is None:
        n = int(size * SR); t = np.arange(n) / SR
        IR = (noise(n) * np.exp(-t * 3.2)).astype(np.float32); IR = lowp(IR, 6000); IR /= np.sqrt(np.sum(IR ** 2))
    return (x * (1 - wet) + fftconvolve(x, IR)[:len(x)].astype(np.float32) * wet * 2.2).astype(np.float32)

NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def nf(name):  # 'E5'
    return NOTE[name[:-1]] * 2 ** (int(name[-1]) - 4)
CHORDS = {'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'], 'Dm': ['D', 'F', 'A'], 'Em': ['E', 'G', 'B'],
          'Bb': ['A#', 'D', 'F'], 'E': ['E', 'G#', 'B'], 'Fmaj7': ['F', 'A', 'C', 'E'], 'Cmaj7': ['C', 'E', 'G', 'B'], 'Gsus': ['G', 'C', 'D'], 'Asus': ['A', 'D', 'E']}
def chord_f(ch, octv=3): return [NOTE[n] * 2 ** (octv - 4) * (2 if i and NOTE[n] < NOTE[CHORDS[ch][0]] else 1) for i, n in enumerate(CHORDS[ch])]
MOTIF = ['E5', 'D5', 'C5', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'B4']

THEMES = {
    'love':    dict(prog=['C', 'G', 'Am', 'F'], bpm=70, arp=True, padv=.035, melody=.3),
    'light':   dict(prog=['G', 'Em', 'C', 'Am'], bpm=104, pluck=True, padv=.02, bassv=.12),
    'sad':     dict(prog=['Am', 'F', 'C', 'G'], bpm=60, sparse=True, padv=.045),
    'dream':   dict(prog=['Dm', 'Bb', 'Fmaj7', 'Asus'], bpm=54, sparse=True, padv=.05, bells=True, octave=5),
    'tension': dict(prog=['Em', 'C', 'Em', 'Asus'], bpm=92, pulse=True, padv=.035),
    'rush':    dict(prog=['Am', 'F', 'C', 'G'], bpm=126, pulse=True, padv=.045, arp=True),
    'mystery': dict(prog=['Dm', 'Bb', 'Gsus', 'Asus'], bpm=60, bells=True, padv=.04, drone=True),
    'hope':    dict(prog=['F', 'C', 'G', 'Am'], bpm=76, arp=True, padv=.045, melody=.22),
    'finale':  dict(prog=['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], bpm=72, arp=True, padv=.05, melody=.34),
    'waltz':   dict(prog=['C', 'Am', 'F', 'G'], bpm=84, waltz=True, padv=.03, melody=.2),
}
def music(theme, dur, seed):
    th = THEMES.get(theme)
    n = int(dur * SR) + SR; buf = np.zeros(n, np.float32)
    if not th: return buf[:int(dur * SR)]
    beat = 60 / th['bpm']; bar = beat * (3 if th.get('waltz') else 4)
    t, i, m = 0.0, 0, 0
    while t < dur:
        ch = th['prog'][i % len(th['prog'])]
        place(buf, pad(chord_f(ch, 3), bar + .6, th['padv']), t)
        if th.get('bassv') or th.get('pulse') or th.get('waltz'): place(buf, bass(NOTE[CHORDS[ch][0]] / 4, bar, th.get('bassv', .14)), t)
        fs = chord_f(ch, th.get('octave', 4))
        if th.get('arp'):
            for k in range(int(round(bar / (beat / 2)))): place(buf, piano(fs[[0, 1, 2, 1, 2, 1, 0, 2][k % 8]] * (2 if k % 4 == 2 else 1), beat * .9, .1), t + k * beat / 2)
        elif th.get('pluck'):
            for k in range(int(round(bar / (beat / 2)))):
                if (k + i) % 3 != 1: place(buf, pluck(fs[k % 3] * 2, .4, .07), t + k * beat / 2)
        elif th.get('waltz'):
            place(buf, piano(fs[0] / 2, beat, .12), t)
            for k in (1, 2): place(buf, piano(fs[1], beat * .8, .06), t + k * beat); place(buf, piano(fs[2], beat * .8, .06), t + k * beat)
        elif th.get('sparse'):
            for k in range(2): place(buf, piano(fs[(i + k) % 3] * 2, bar, .1), t + k * bar / 2 + (hash((seed, i, k)) % 7) * .03)
        if th.get('pulse'):
            for k in range(int(round(bar / (beat / 2)))): place(buf, bass(NOTE[CHORDS[ch][0]] / 2, beat * .45, .09), t + k * beat / 2)
        if th.get('bells') and i % 2 == 0: place(buf, bell(fs[(i // 2) % 3] * 4, 3, .03), t + beat)
        if th.get('melody'):
            for k in range(4 if not th.get('waltz') else 3):
                note = MOTIF[m % len(MOTIF)]; m += 1
                place(buf, piano(nf(note), beat * 1.6, th['melody'] * .35), t + k * beat)
        t += bar; i += 1
    if th.get('drone'): buf[:] += lowp(noise(n), 120) * .05
    return reverb(buf, wet=.3)[:int(dur * SR)]

# ---------------------------------------------------------------- ambience & effects
def ambience(kind, n):
    dur = n / SR; x = np.zeros(n, np.float32)
    if kind in (None, '', 'none'): return x
    w = noise(n)
    if kind == 'rain': x += band(w, 900, 9000) * .06 + lowp(w, 400) * .05; drops = (rng.random(n) > .9993).astype(np.float32); x += band(drops * noise(n), 1500, 6000) * .5
    if kind == 'street': x += lowp(w, 300) * .05 + band(w, 300, 1500) * .008
    if kind == 'school':
        x += band(w, 400, 2500) * .01
        for k in range(int(dur / 2)): place(x, bell(2600 + rng.random() * 1400, .25, .01), rng.random() * dur)
    if kind in ('room', 'office'): x += lowp(w, 200) * .012
    if kind == 'office':
        for k in range(int(dur * 2)): place(x, band(noise(600), 2000, 6000) * .04, rng.random() * dur)
    if kind in ('cafe', 'shop', 'party'): x += band(w, 250, 2200) * (.03 if kind != 'party' else .045)
    if kind == 'cafe':
        for k in range(int(dur / 3)): place(x, bell(3000 + rng.random() * 2000, .3, .015), rng.random() * dur)
    if kind == 'night':
        t = np.arange(n) / SR; x += (np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 14 * t) > .6) * (np.sin(2 * np.pi * .4 * t) > 0) * .004).astype(np.float32) + lowp(w, 200) * .01
    if kind == 'morning' or kind == 'park':
        x += lowp(w, 400) * .01
        for k in range(int(dur / 1.5)):
            f0 = 2800 + rng.random() * 1500; tt = np.arange(int(.18 * SR)) / SR
            place(x, (np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.exp(-tt * 14) * .02).astype(np.float32), rng.random() * dur)
    if kind == 'hospital': x += lowp(w, 250) * .015; t = np.arange(n) / SR; x += (np.sin(2 * np.pi * 1000 * t) * ((t % 1.6) < .08) * .01).astype(np.float32)
    if kind == 'temple': x += lowp(w, 200) * .012
    if kind == 'hall': x += band(w, 200, 1800) * .02
    if kind == 'sea': t = np.arange(n) / SR; x += lowp(w, 900) * (.04 + .035 * np.sin(2 * np.pi * t / 7)).astype(np.float32)
    return x
def sfx(kind):
    if kind == 'crash': return (lowp(noise(int(.5 * SR)), 900) * np.exp(-np.arange(int(.5 * SR)) / SR * 9) * .5).astype(np.float32)
    if kind == 'glass': return sum(np.pad(bell(2500 + rng.random() * 3000, .5, .08), (int(rng.random() * .3 * SR), 0)) for _ in range(6)) if False else np.concatenate([bell(3200, .6, .1), np.zeros(10)])
    if kind == 'horn': t = np.arange(int(.9 * SR)) / SR; return ((np.sign(np.sin(2 * np.pi * 420 * t)) + np.sign(np.sin(2 * np.pi * 520 * t))) * .03 * np.minimum(1, (0.9 - t) * 10)).astype(np.float32)
    if kind == 'brakes': t = np.arange(int(1.2 * SR)) / SR; return (band(noise(len(t)), 2200, 5200) * .2 * np.exp(-t * 1.2)).astype(np.float32)
    if kind == 'heartbeat': t = np.arange(int(.5 * SR)) / SR; b = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 18); return np.concatenate([b, b[:int(.35 * SR)] * .7]).astype(np.float32) * .5
    if kind == 'whoosh': t = np.arange(int(1.6 * SR)) / SR; return (band(noise(len(t)), 300, 3000) * np.sin(np.pi * t / 1.6) * .25).astype(np.float32)
    if kind == 'ring': return np.concatenate([np.concatenate([piano(nf(n), .18, .12)[:int(.2 * SR)] for n in ['E6', 'C6', 'G5', 'C6']]), np.zeros(int(.4 * SR), np.float32)] * 2)
    if kind == 'hangup': t = np.arange(int(.25 * SR)) / SR; return (np.sin(2 * np.pi * 480 * t) * .06).astype(np.float32)
    if kind == 'cough': return (band(noise(int(.25 * SR)), 300, 2500) * np.exp(-np.arange(int(.25 * SR)) / SR * 12) * .4).astype(np.float32)
    if kind == 'classlaugh': t = np.arange(int(1.6 * SR)) / SR; return (band(noise(len(t)), 300, 2000) * (.5 + .5 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * t / 1.6) * .08).astype(np.float32)
    return np.zeros(10, np.float32)

# ---------------------------------------------------------------- mix
def load_tl(part):
    s = open(os.path.join(ROOT, 'build', f'part{part}.timeline.js'), encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])
def main(part):
    tl = load_tl(part)
    cues = json.load(open(os.path.join(ROOT, 'build', f'part{part}.cues.json'), encoding='utf-8'))
    out_wav = os.path.join(ROOT, 'build', f'part{part}.wav')
    lines = {l['id']: l for l in tl['lines']}
    with sf.SoundFile(out_wav, 'w', SR, 2, 'PCM_16') as f:
        for si, sc in enumerate(tl['scenes']):
            t0, t1 = sc['t0'], sc['t1']; dur = t1 - t0; n = int(round(dur * SR))
            o = sc['opts']; room = ROOM.get(o.get('set'), 'outdoor')
            voice = np.zeros(n + SR * 3, np.float32); dmask = np.zeros(n, np.float32)
            for lid in sc['lines']:
                l = lines[lid]; x = style_voice(l, room)
                if x is None: continue
                place(voice, x, l['t0'] - t0)
                a, b = int((l['t0'] - t0 - .15) * SR), int((l['t1'] - t0 + .25) * SR); dmask[max(0, a):max(0, b)] = 1
            # music: scene theme, with any @music change inside the scene
            themes = [(0.0, o.get('music', 'none'))] + [(c['t'] - t0, c['value']) for c in cues if c['scene'] == sc['id'] and c['kind'] == 'music']
            mus = np.zeros(n, np.float32)
            for k, (a, th) in enumerate(themes):
                b = themes[k + 1][0] if k + 1 < len(themes) else dur
                seg = music(th, b - a, si * 10 + k)
                fade = min(len(seg), int(.6 * SR))
                if fade: seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
                place(mus, seg, a)
            k = int(.25 * SR); sm = np.clip(fftconvolve(dmask, np.ones(k, np.float32) / k, 'same'), 0, 1).astype(np.float32)
            mus *= (1 - .6 * sm) * .9
            amb = ambience(o.get('amb'), n) * (1 - .3 * sm)
            fx = np.zeros(n + SR * 2, np.float32)
            for c in cues:
                if c['scene'] == sc['id'] and c['kind'] == 'sfx': place(fx, sfx(c['value']), c['t'] - t0)
            mix = mus + amb + voice[:n] + fx[:n]
            edge = min(n // 2, int(.35 * SR)); env = np.ones(n, np.float32); env[:edge] = np.linspace(0, 1, edge); env[-edge:] = np.linspace(1, 0, edge)
            mono = np.tanh(mix * env * 1.25) * .9
            st = np.stack([mono + amb * .15 - amb * .15 * 0, mono], axis=1)
            # a touch of width: ambience slightly decorrelated
            st[:, 0] += np.roll(amb, 331) * .2; st[:, 1] += np.roll(amb, 977) * .2
            f.write(np.clip(st, -1, 1))
            print(f"{sc['id']:16s} {dur:6.1f}s music={o.get('music')} amb={o.get('amb')}", flush=True)
    m4a = out_wav.replace('.wav', '.m4a')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', out_wav, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    print('wrote', out_wav, m4a)

if __name__ == '__main__':
    main(sys.argv[1])
