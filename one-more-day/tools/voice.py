"""Voice an episode script with an offline Thai TTS model and inject the result into the episode page.

    python tools/voice.py script_ep1.json ep1.html

For every spoken line this synthesizes speech (MMS Thai VITS via sherpa-onnx), gives each character
their own voice (pitch shift + speed), lays all lines on one timeline (the timeline is driven by the
real speech lengths), measures a loudness envelope for lip-sync, and writes everything into the page
between the /*@@TIMELINE*/ and /*@@END*/ markers as `TL` (timeline) and `VOICE_MP3` (base64 audio).

Model: download https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mms-tha.tar.bz2
and extract it, then point MMS_THA_DIR at the extracted vits-mms-tha folder (default: tools/model/vits-mms-tha).
"""
import base64, hashlib, json, os, re, subprocess, sys, tempfile

import numpy as np
import sherpa_onnx
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get('MMS_THA_DIR', os.path.join(HERE, 'model', 'vits-mms-tha'))
CACHE = os.environ.get('VOICE_CACHE', os.path.join(tempfile.gettempdir(), 'omd-voice-cache'))
SR = 44100
FPS = 30            # lip-sync envelope resolution
GAP = 0.28          # silence between consecutive lines
FX = {              # extra ffmpeg filters per effect
    'think': 'aecho=0.8:0.6:45|90:0.22|0.12',
    'ghost': 'aecho=0.8:0.8:120|240:0.4|0.25,lowpass=f=3200',
    'pa': 'highpass=f=280,lowpass=f=3400,aecho=0.8:0.7:70|140:0.3|0.18',
}

_tts = None
def tts():
    global _tts
    if _tts is None:
        cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{MODEL}/model.onnx', tokens=f'{MODEL}/tokens.txt',
                                                       noise_scale=0.6, noise_scale_w=0.8, length_scale=1.0),
            num_threads=4))
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts

def normalize(text):
    """Map text onto the model's alphabet: split sara am, drop marks it can't read; return phrase chunks with pauses."""
    text = text.replace('ำ', 'ํา').replace('ๆ', '')
    chunks = []
    for part in re.split(r'(…|\.\.\.|[!?,])', text):
        if part in ('…', '...'):
            chunks.append(('pause', 0.32))
        elif part in ('!', '?', ','):
            chunks.append(('pause', 0.12))
        else:
            clean = re.sub(r"[^฀-๿0-9' -]", ' ', part).strip()
            if clean:
                chunks.append(('say', clean))
    return chunks

def synth(text, speed):
    out = []
    for kind, val in normalize(text):
        if kind == 'pause':
            out.append(np.zeros(int(16000 * val), np.float32))
        else:
            a = tts().generate(val, sid=0, speed=speed)
            out.append(np.asarray(a.samples, np.float32))
    return np.concatenate(out) if out else np.zeros(1600, np.float32)

def voice_line(line, voices):
    v = voices[line['who']]
    fx = line.get('fx') or v.get('fx') or ('think' if line.get('kind') == 'think' else None)
    key = hashlib.sha1(json.dumps([line.get('tts', line['text']), v, fx]).encode()).hexdigest()[:16]
    path = os.path.join(CACHE, key + '.wav')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        raw = path + '.raw.wav'
        sf.write(raw, synth(line.get('tts', line['text']), v.get('speed', 1.0)), 16000)
        af = [f"rubberband=pitch={v.get('pitch', 1.0)}:formant=shifted", f'aresample={SR}']
        if fx:
            af.append(FX[fx])
        af.append('apad=pad_dur=0.05')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', ','.join(af), '-ac', '1', path], check=True)
        os.remove(raw)
    x, _ = sf.read(path, dtype='float32')
    x = x / (np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) + 1e-6) * 0.12   # level-match all characters
    return np.clip(x, -0.98, 0.98)

def envelope(x):
    hop = SR // FPS
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x), hop)])
    rms = rms / (rms.max() + 1e-6)
    return ''.join(str(min(9, int(v * 10))) for v in rms)

def main(script_path, page_path):
    script = json.load(open(script_path, encoding='utf-8'))
    voices = script['voices']
    t, lines, scenes, beats, clips = 0.0, [], {}, {}, []
    for sc in script['scenes']:
        t0 = t
        t += sc.get('lead', 0)
        for it in sc['items']:
            if 'beat' in it:
                beats[it['beat']] = [round(t, 3), round(t + it['dur'], 3)]
                t += it['dur']
                continue
            x = voice_line(it, voices)
            d = len(x) / SR
            lines.append({'id': it['id'], 'who': it['who'], 'text': it['text'], 'kind': it.get('kind', 'say'),
                          't0': round(t, 3), 't1': round(t + d, 3), 'env': envelope(x)})
            clips.append((t, x))
            t += d + it.get('gap', GAP)
            print(f"{it['id']:12s} {it['who']:6s} {d:5.2f}s  {it['text']}")
        t += sc.get('tail', 0) - (GAP if sc['items'] and 'beat' not in sc['items'][-1] else 0)
        scenes[sc['id']] = [round(t0, 3), round(t, 3)]
    total = round(t, 3)
    for i, l in enumerate(lines):   # subtitles linger a little, but never past the next line
        nxt = lines[i + 1]['t0'] if i + 1 < len(lines) else total
        l['s1'] = round(min(l['t1'] + 0.35, nxt - 0.05), 3)

    track = np.zeros(int(total * SR) + SR, np.float32)
    for st, x in clips:
        i = int(st * SR); track[i:i + len(x)] += x
    with tempfile.TemporaryDirectory() as td:
        sf.write(f'{td}/v.wav', track, SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{td}/v.wav', '-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', f'{td}/v.mp3'], check=True)
        mp3 = base64.b64encode(open(f'{td}/v.mp3', 'rb').read()).decode()

    tl = {'total': total, 'scenes': scenes, 'beats': beats, 'lines': lines}
    block = f"/*@@TIMELINE*/\nconst TL = {json.dumps(tl, ensure_ascii=False)};\nconst VOICE_MP3 = '{mp3}';\n/*@@END*/"
    page = open(page_path, encoding='utf-8').read()
    page = re.sub(r'/\*@@TIMELINE\*/.*?/\*@@END\*/', lambda m: block, page, flags=re.S)
    open(page_path, 'w', encoding='utf-8').write(page)
    print(f'total {total:.1f}s, {len(lines)} voiced lines, voice track {len(mp3) // 1024} KB base64 -> {page_path}')

if __name__ == '__main__':
    main(*sys.argv[1:3])
