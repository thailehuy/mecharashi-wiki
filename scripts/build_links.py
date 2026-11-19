#!/usr/bin/env python3
"""Each pilot's Link and Resonance Interface (CN v4.0) from the CN client
→ data/db/pilot_links.json (the pilot page's Link tab). Run compile.py after.

- Resonance Interface (ConfigDataPilotAdvancedLinkList*): the 15-node board
  most S-rank pilots get. Every pilot's board is the same, so the row only
  records that the pilot has one (`board`); the nodes are in js/lore.js.
  It opens when the pilot's chip boost reaches 120%.
- Storm Particle Tide aptitude (ConfigDataPilotInfo.EnvironmentAdaptType):
  the tide the board's two Aptitude Activation nodes raise.
- Link (ConfigDataLinkPilotInfo): a pilot's keepsake, slotted into an S-rank
  pilot's board. The table doesn't decode in the miner (protobuf wire type 3),
  so the raw row is parsed here. Fields: 2 pilot ID, 4 effect per level,
  5 activation cost, 8 the three conversations in order, 11 name, 12 item,
  13 item story. Unlocked by answering the three conversations in sequence
  (ConfigDataLinkPilotActiveQuestionInfo).

Link names, items, stories and conversations stay in Chinese (`cn`); effect
names and text are translated in EFFECTS below.
"""

import json, os, sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CN_STATS = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')
OUT = os.path.join(ROOT, 'data', 'db', 'pilot_links.json')

TIDES = {'EnvironmentAdaptType_Type1': 'Excitation Tide',
         'EnvironmentAdaptType_Type2': 'Turbulence Tide',
         'EnvironmentAdaptType_Type3': 'Diffusion Tide'}

# LinkPilotEffect passive → (name, text). Armor Synergy and Tactical
# Coordination are the client's own English; the rest are translations.
EFFECTS = {
    700058: ('Melee Synergy', 'Melee +3%'),
    700059: ('Assault Synergy', 'Assault +3%'),
    700060: ('Ranged Synergy', 'Ranged +3%'),
    700061: ('Tactical Coordination', 'Tactical +3%'),
    700062: ('Armor Synergy', 'Defense +3%'),
    700063: ('Mechanic Synergy', 'Mechanic +3%'),
    700064: ('Unstoppable Advance', 'After destroying a target, damage +10% until the end of the action.'),
    700065: ('Unstoppable Advance II', 'After destroying a target, damage +15% until the end of the action.'),
    700066: ('Extreme Range', 'In combat, if the target is at maximum range, damage +10%.'),
    700067: ('Extreme Range II', 'In combat, if the target is at maximum range, damage +15%.'),
    700076: ('Initiative', 'Initial AP +1'),
    700077: ('Initiative II', 'Initial AP +2'),
}

ITEMS = {11300001: 'Bionic Superconductor', 11300003: 'Synthetic Superconductor'}


def varint(b, i):
    r = s = 0
    while True:
        x = b[i]; i += 1
        r |= (x & 0x7f) << s; s += 7
        if x < 0x80:
            return r, i


def fields(b):
    i, out = 0, []
    while i < len(b):
        k, i = varint(b, i)
        f, w = k >> 3, k & 7
        if w == 0:
            v, i = varint(b, i)
        elif w == 2:
            n, i = varint(b, i)
            v = b[i:i + n]; i += n
        else:
            raise ValueError(f'wire type {w}')
        out.append((f, v))
    return out


def packed(b):
    i, out = 0, []
    while i < len(b):
        v, i = varint(b, i)
        out.append(v)
    return out


def main():
    c = sqlite3.connect(CN_STATS)
    pilots = json.load(open(os.path.join(ROOT, 'data', 'db', 'pilots.json'), encoding='utf-8'))
    st = dict(c.execute('SELECT ID, Value FROM ConfigDataST_CN'))
    s = lambda key: st[int(key.decode().split(':')[1])]
    content = {r[0]: r[1] for r in c.execute('SELECT ID, ContentStrKey_EN FROM ConfigDataLinkPilotContentInfo')}
    options = {r[0]: (json.loads(r[1]) if r[1] else [], r[2])
               for r in c.execute('SELECT ID, TipContentIdList, NameStrKey_EN FROM ConfigDataLinkPilotActiveOptionInfo')}
    questions = {r[0]: r[1:] for r in c.execute(
        'SELECT ID, QuestionContentIdList, OptionIdList, CorrectOptionId FROM ConfigDataLinkPilotActiveQuestionInfo')}
    effects = {r[0]: json.loads(r[1])[0] if r[1] else None
               for r in c.execute('SELECT ID, PassiveSkillIds FROM ConfigDataLinkPilotEffectInfo')}

    out = {}
    for pid, tide in c.execute('SELECT ID, EnvironmentAdaptType FROM ConfigDataPilotInfo WHERE EnvironmentAdaptType IS NOT NULL'):
        if str(pid) in pilots:
            out.setdefault(str(pid), {})['tide'] = TIDES[tide]
    for (pid,) in c.execute('SELECT ID FROM ConfigDataPilotAdvancedLinkListTemplateInfo'):
        if str(pid) in pilots:
            out.setdefault(str(pid), {})['board'] = True

    for (_, raw) in c.execute('SELECT * FROM ConfigDataLinkPilotInfo'):
        f = fields(bytes.fromhex(raw))
        get = lambda n: [v for k, v in f if k == n]
        pid = str(get(2)[0])
        if pid not in pilots:
            print('Link for a pilot the wiki lacks:', pid)
            continue
        levels = []
        for lv in get(4):
            d = dict(fields(lv))
            name, text = EFFECTS[effects[d[2]]]
            levels.append({'name': name, 'text': text})
        cost = [ITEMS[dict(fields(x))[3]] for x in get(5)]
        talks = []
        for qid in packed(get(8)[0]):
            lines, opts, correct = questions[qid]
            talks.append({
                'lines': [content[x] for x in json.loads(lines)],
                'options': [dict({'text': options[o][1], 'reply': [content[x] for x in options[o][0]]},
                                 **({'correct': True} if o == correct else {}))
                            for o in json.loads(opts)],
            })
        out.setdefault(pid, {})['link'] = {'name': s(get(11)[0]), 'item': s(get(12)[0]), 'story': s(get(13)[0]),
                            'levels': levels, 'cost': cost, 'talks': talks, 'cn': True}

    out = {k: out[k] for k in sorted(out)}
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'{len(out)} pilots, {sum("board" in v for v in out.values())} boards, '
          f'{sum("link" in v for v in out.values())} links')


if __name__ == '__main__':
    main()
