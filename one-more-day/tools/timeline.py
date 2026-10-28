"""Build the film timeline from a parsed screenplay and the voiced takes.

    python tools/timeline.py build/part1.json build/part1.timeline.js

Times come from the real length of each voiced line. Shots are chosen like a film editor would:
an establishing wide, then shot / reverse shot on whoever speaks (close-up, over-the-shoulder,
medium, two-shot), holding the shot while the same person keeps talking, unless the screenplay names a shot.
Writes `window.TL = {...}` for the renderer and build/<part>.cues.json for the sound mix.
"""
import json, os, sys
import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice import RAW, key_for  # noqa: E402

FPS = 24
GAP, VO_GAP, LEAD, TAIL = .32, .5, .7, .7
SPEAKING_CAST_IGNORE = {'pa', 'student', '???', 'clerk_off'}
PATTERN = ['cu', 'ots', 'mcu', 'cu', 'two', 'ots']

def envelope(path):
    x, sr = sf.read(path, dtype='float32')
    hop = sr // FPS
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) if len(x[i:i + hop]) else 0 for i in range(0, len(x), hop)])
    rms = rms / (np.percentile(rms, 95) + 1e-6)
    return ''.join(str(min(9, int(v * 9))) for v in rms), len(x) / sr

def build(src):
    data = json.load(open(src, encoding='utf-8'))
    t, scenes, lines, cues, captions = 0.0, [], [], [], []
    for sc in data['scenes']:
        t0 = t
        items = sc['items']
        if items and items[0]['type'] not in ('beat', 'caption'): t += LEAD
        cast_now, cast_events, actions, shots, sc_lines = [], [], [], [], []
        last_shot, last_speaker, pat = None, None, 0
        def push_shot(kind, args, a, b):
            if shots and shots[-1]['kind'] == kind and shots[-1]['args'] == args and abs(shots[-1]['t1'] - a) < 1e-6:
                shots[-1]['t1'] = b
            else:
                shots.append({'t0': round(a, 3), 't1': round(b, 3), 'kind': kind, 'args': args})
        for it in items:
            ty = it['type']
            if ty == 'cast':
                cast_now = [c['id'] for c in it['cast'] if 'offscreen' not in c['state']]
                cast_events.append({'t': round(t, 3), 'cast': it['cast']})
            elif ty in ('sfx', 'music', 'amb'):
                cues.append({'t': round(t, 3), 'kind': ty, 'value': it['value'], 'scene': sc['id']})
            elif ty == 'caption':
                captions.append({'t0': round(t, 3), 't1': round(t + it['dur'], 3), 'text': it['text']})
                push_shot('caption', [], t, t + it['dur']); t += it['dur']
            elif ty == 'beat':
                a, b = t, t + it['dur']
                for act in it['actions']: actions.append({'t0': round(a, 3), 't1': round(b, 3), 'do': act})
                if it['shot']: last_shot = (it['shot']['kind'], it['shot']['args'])
                elif last_shot is None: last_shot = ('wide', [])
                push_shot(last_shot[0], last_shot[1], a, b)
                if it['shot'] and it['shot']['kind'] in ('insert', 'title'): last_shot = None   # cut back to the scene afterwards
                t = b
            elif ty == 'line':
                raw = os.path.join(RAW, key_for(it) + '.wav')
                if os.path.exists(raw): env, dur = envelope(raw)
                else: env, dur = '', max(1.2, len(it['text']) * .085)        # placeholder until voiced
                a, b = t, t + dur
                who = it['who']
                for act in it['actions']: actions.append({'t0': round(a, 3), 't1': round(b, 3), 'do': act})
                in_cast = who in cast_now
                if it['shot']:
                    kind, args = it['shot']['kind'], it['shot']['args'] or ([who] if in_cast and it['shot']['kind'] in ('cu', 'mcu', 'ots') else it['shot']['args'])
                    shot = (kind, args)
                elif it['vo']:
                    shot = last_shot or ('wide', [])
                elif not in_cast:
                    shot = last_shot if last_shot and last_shot[0] != 'insert' else ('wide', [])
                elif last_shot is None:
                    shot = ('wide', []) if len(cast_now) > 1 else ('mcu', [who])
                elif who == last_speaker and last_shot[0] != 'wide':
                    shot = last_shot
                else:
                    others = [c for c in cast_now if c != who]
                    kind = PATTERN[pat % len(PATTERN)] if others else ('mcu' if pat % 2 else 'cu'); pat += 1
                    if kind == 'two' and others: args = [who, min(others, key=lambda o: 0)]
                    elif kind == 'ots' and others: args = [who, others[0]]
                    else: args = [who]
                    shot = (kind, args)
                push_shot(shot[0], shot[1], a, b + (VO_GAP if it['vo'] else GAP))
                last_shot = shot if shot[0] != 'insert' else last_shot
                if not it['vo'] and in_cast: last_speaker = who
                ln = {'id': it['id'], 'who': who, 'text': it['text'], 'vo': it['vo'], 'emo': it['emo'], 'scene': sc['id'], 'key': key_for(it), 'fx': it.get('fx'),
                      't0': round(a, 3), 't1': round(b, 3), 'env': env}
                lines.append(ln); sc_lines.append(ln['id'])
                t = b + (VO_GAP if it['vo'] else GAP)
        t += TAIL
        if shots: shots[-1]['t1'] = round(t, 3)
        scenes.append({'id': sc['id'], 'opts': sc['opts'], 't0': round(t0, 3), 't1': round(t, 3),
                       'cast': cast_events, 'actions': actions, 'shots': shots, 'lines': sc_lines})
    # subtitles linger a little but never overlap the next line
    for i, l in enumerate(lines):
        nxt = lines[i + 1]['t0'] if i + 1 < len(lines) else t
        l['s1'] = round(min(l['t1'] + .45, nxt - .05), 3)
    return {'fps': FPS, 'total': round(t, 3), 'scenes': scenes, 'lines': lines, 'captions': captions}, cues

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    tl, cues = build(src)
    open(out, 'w', encoding='utf-8').write('window.TL = ' + json.dumps(tl, ensure_ascii=False) + ';\n')
    json.dump(cues, open(out.replace('.timeline.js', '.cues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    voiced = sum(1 for l in tl['lines'] if l['env'])
    print(f"{len(tl['scenes'])} scenes, {len(tl['lines'])} lines ({voiced} voiced), total {tl['total'] / 60:.1f} min")
