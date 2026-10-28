"""Parse a screenplay (.omd) into JSON the voice tool and the renderer both read.

Format, one item per line ('#' starts a comment):

  == scene_id | set=road | tod=night | wx=rain | age=teen | grade=dream | music=dream | amb=rain
  cast: kan@700>, film@1250<:sit          who@x  facing > or <   optional ,scale and :state
  ~ 2.0 [wide] walk kan 300>900; crash    silent beat: seconds, optional [shot], optional actions
  kan: ข้อความ                             spoken line
  kan[vo,sad,cu]: ข้อความ {คำอ่าน}         tags (vo = voice-over, emotion, shot), {tts respelling}
  film: ขอบคุณนะ // hug kan film           actions after // start with the line
  * ข้อความบนจอดำ | 3                       caption card (seconds optional)
  @sfx crash      @music sad      @amb rain
"""
import json, re, sys

SHOTS = {'wide', 'two', 'cu', 'mcu', 'ots', 'insert', 'pov', 'low', 'high', 'push', 'over', 'title', 'extreme', 'back', 'track'}
EMOTIONS = {'sad', 'cry', 'happy', 'angry', 'shock', 'shy', 'smile', 'shout', 'whisper', 'tease', 'tired', 'soft', 'laugh', 'calm', 'worried', 'cold', 'weak'}

def parse_cast(spec):
    out = []
    for part in [p.strip() for p in spec.split(',') if p.strip()]:
        m = re.match(r'(\w+)@(-?\d+)(?:\/([\d.]+))?([<>])?((?::\w+)*)$', part)
        if not m: raise ValueError(f'bad cast spec: {part}')
        out.append({'id': m[1], 'x': int(m[2]), 's': float(m[3] or 1), 'face': -1 if m[4] == '<' else 1, 'state': [x for x in (m[5] or '').split(':') if x] or ['stand']})
    return out

def parse_shot(s):
    if not s: return None
    m = re.match(r'(\w+)(?:\(([^)]*)\))?$', s.strip())
    kind, args = m[1], [a.strip() for a in (m[2] or '').split(',') if a.strip()]
    return {'kind': kind, 'args': args}

def parse_actions(s):
    return [a.strip() for a in s.split(';') if a.strip()] if s else []

def parse(path):
    scenes, sc, n = [], None, 0
    for raw in open(path, encoding='utf-8'):
        line = raw.rstrip('\n')
        if not line.strip() or line.lstrip().startswith('#'): continue
        line = line.strip()
        if line.startswith('=='):
            parts = [p.strip() for p in line[2:].split('|')]
            opts = dict(p.split('=', 1) for p in parts[1:])
            sc = {'id': parts[0], 'opts': opts, 'items': []}
            scenes.append(sc); continue
        if line.startswith('cast:'):
            sc['items'].append({'type': 'cast', 'cast': parse_cast(line[5:])}); continue
        if line.startswith('~'):
            m = re.match(r'~\s*([\d.]+)\s*(?:\[([^\]]*)\])?\s*(.*)$', line)
            sc['items'].append({'type': 'beat', 'dur': float(m[1]), 'shot': parse_shot(m[2]), 'actions': parse_actions(m[3])}); continue
        if line.startswith('*'):
            body, _, dur = line[1:].partition('|')
            sc['items'].append({'type': 'caption', 'text': body.strip().replace('\\n', '\n'), 'dur': float(dur or 3.2)}); continue
        if line.startswith('@'):
            kind, _, val = line[1:].partition(' ')
            sc['items'].append({'type': kind, 'value': val.strip()}); continue
        m = re.match(r'(\w+|\?\?\?)(?:\[([^\]]*)\])?\s*:\s*(.*)$', line)
        if not m: raise ValueError(f'{path}: cannot parse: {line}')
        who, tags, rest = m[1], re.findall(r'\w+\([^)]*\)|[^,\s]+', m[2] or ''), m[3]
        rest, _, acts = rest.partition('//')
        tts = None
        tm = re.search(r'\{([^}]*)\}\s*$', rest)
        if tm: tts, rest = tm[1].strip(), rest[:tm.start()]
        n += 1
        shot = next((parse_shot(t) for t in tags if t.split('(')[0] in SHOTS), None)
        sc['items'].append({'type': 'line', 'id': f'{sc["id"]}_{n:03d}', 'who': who, 'text': rest.strip(), 'tts': tts,
                            'vo': 'vo' in tags, 'emo': next((t for t in tags if t in EMOTIONS), None),
                            'shot': shot, 'actions': parse_actions(acts), 'fx': 'phone' if 'phone' in tags else ('pa' if who == 'pa' else None)})
    return {'scenes': scenes}

if __name__ == '__main__':
    data = parse(sys.argv[1])
    json.dump(data, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lines = [i for s in data['scenes'] for i in s['items'] if i['type'] == 'line']
    print(f"{len(data['scenes'])} scenes, {len(lines)} lines, {sum(len(l['text']) for l in lines)} chars")
