"""Generate per-ID translation files for R/SR/SSR backpacks from the official
EN detail responses in detail-en.json. Unlike the SSSR translations (which were
hand-mapped from a rough excel sheet), this is a direct extraction of official
Global API text -- safe to re-run whenever detail-en.json is refreshed.
"""
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    with open(os.path.join(DIR, 'detail-en.json'), 'r', encoding='utf-8') as f:
        entries = json.load(f)

    written = 0
    for entry in entries:
        detail = entry.get('detail')
        if not detail:
            print(f"skip {entry['ID']}: no detail (error={entry.get('error')})")
            continue
        data = detail['data']['data']

        skills = {}
        for sk in data.get('WithPassiveSkills', []):
            skills[sk['ID']] = {
                'name': sk['name'],
                'SpecificEffects': sk.get('SpecificEffects', ''),
            }

        out = {'name': data['name']}
        if skills:
            out['skills'] = skills
        if data.get('RelatedDescription') and data['RelatedDescription'] != '-':
            out['RelatedDescription'] = data['RelatedDescription']

        path = os.path.join(DIR, f"{entry['ID']}-translation.json")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write('\n')
        written += 1

    print(f'Wrote {written} translation files.')


if __name__ == '__main__':
    main()
