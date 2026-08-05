import json, glob, os
from copy import deepcopy

DIR = os.path.dirname(os.path.abspath(__file__))

FIELDS = ['ID', 'PilotName', 'PortraitHeroIcon', 'AvatarHeroIcon', 'RealName', 'Gender',
          'Profession', 'Occupation', 'quality', 'Talent0_2Ability', 'Talent3_5Ability',
          'NeuralDriveTemplate', 'biomimetic_computer_data',
          'AllowedMechaDriveList_DriveAllowedList', 'AlternateSkins']

STAT_FIELDS = ['Combat', 'Assault', 'Shooting', 'Tactics', 'Defense', 'Engineering',
               'InitialPilotAPValue_PilotAPInitBase', 'MaximumPilotAPValue_PilotAPMaxBase',
               'PilotAPRecoveryperTurn_PilotAPRecoverBase']

def apply_translation(entry, t):
    """Overwrite display fields with translation values where non-empty."""
    for field in ('PilotName', 'RealName', 'Gender', 'Profession', 'Occupation'):
        if t.get(field):
            entry[field] = t[field]
    for key in ('Talent0_2Ability', 'Talent3_5Ability'):
        if t.get(key) and entry.get(key):
            entry[key] = dict(entry[key], **{k: v for k, v in t[key].items() if v})
    # Skills
    if t.get('skills'):
        for bcd_entry in (entry.get('biomimetic_computer_data') or []):
            sk = bcd_entry.get('skill') or {}
            tr = t['skills'].get(sk.get('ID',''))
            if tr:
                for k, v in tr.items():
                    if v: sk[k] = v
    # Neural drive passives
    if t.get('neuralPassives'):
        nd = entry.get('NeuralDriveTemplate') or {}
        for part in (nd.get('ListChipPartition') or []):
            for eff in (part.get('ListActivationEffects') or []):
                ps = eff.get('PassiveSkill') or {}
                tr = t['neuralPassives'].get(ps.get('ID',''))
                if tr:
                    for k, v in tr.items():
                        if v: ps[k] = v

pilots = []
for path in sorted(glob.glob(f'{DIR}/[0-9]*.json')):
    pid = os.path.basename(path).replace('.json', '')
    if pid.endswith('-translation'):
        continue
    raw = json.load(open(path, 'r', encoding='utf-8'))['data']['data']
    entry = {k: raw.get(k, '') for k in FIELDS}
    manji = raw.get('manji') or {}
    entry['stats'] = {k: manji.get(k, raw.get(k)) for k in STAT_FIELDS}

    t_path = f'{DIR}/{pid}-translation.json'
    t = json.load(open(t_path, 'r', encoding='utf-8')) if os.path.exists(t_path) else {}
    apply_translation(entry, t)
    entry['version'] = t.get('version', '1.0')
    talent_desc = (entry.get('Talent0_2Ability') or {}).get('SpecificEffects', '')
    entry['enTranslation'] = bool(talent_desc) and all(ord(c) < 128 for c in talent_desc)
    if t.get('hiddenSkills'):
        entry['hiddenSkills'] = t['hiddenSkills']
    if t.get('summonSkills'):
        entry['summonSkills'] = t['summonSkills']
    if t.get('formSkillGroups'):
        entry['formSkillGroups'] = t['formSkillGroups']

    pilots.append(entry)

RANKED_STAT_FIELDS = ['Combat', 'Shooting', 'Assault', 'Tactics', 'Engineering']

def to_num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

for field in RANKED_STAT_FIELDS:
    values = sorted({to_num(p['stats'].get(field)) for p in pilots} - {None}, reverse=True)
    rank_of = {v: i + 1 for i, v in enumerate(values)}
    for p in pilots:
        v = to_num(p['stats'].get(field))
        if v is not None:
            p.setdefault('statRanks', {})[field] = rank_of[v]

order = {'SSR': 0, 'SR': 1, 'R': 2}
pilots.sort(key=lambda p: (order.get(p.get('quality',''), 9), p.get('PilotName','')))

out = {'pilots': pilots}
with open(f'{DIR}/compiled.json', 'w') as f:
    json.dump(out, f, indent=2)
js = 'var PilotsData = ' + json.dumps(out) + ';\n'
with open(f'{DIR}/compiled.js', 'w') as f:
    f.write(js)

print(f'Compiled {len(pilots)} pilots  ({len(js)//1024} KB)')
