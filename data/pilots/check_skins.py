"""Scan the pilot_images_half folder (in the assets repo) for alternate pilot skin art
(Pilot_{ID}B_half, Pilot_{ID}C_half, ...) and record which letters exist as
each pilot's `skins` list in data/db/pilots.json.

Portraits/avatars are all sourced locally now, so this just checks for the
presence of the corresponding local PNG files instead of probing the CDN.
Run `python3 compile.py` afterwards.
"""
import json, os, string, sys

DIR = os.path.dirname(os.path.abspath(__file__))
PILOTS_DB = os.path.join(DIR, '..', 'db', 'pilots.json')
# The images live in the mecharashi-wiki-assets repo, checked out next to this one.
IMAGES_DIR = os.path.join(DIR, '..', '..', '..', 'mecharashi-wiki-assets', 'data', 'unlisted', 'pilot_images_half')
MAX_LETTER = 'H'  # probe B..H; leaves headroom past any known skin count


def main():
    local_files = set(os.listdir(IMAGES_DIR))
    with open(PILOTS_DB, encoding='utf-8') as f:
        pilots = json.load(f)

    updated = 0
    for pid, p in pilots.items():
        base_icon = p.get('portrait_icon', '')
        if 'A_half' not in base_icon:
            print(f'skip {pid}: unexpected icon format {base_icon!r}', file=sys.stderr)
            continue

        alt_letters = []
        for letter in string.ascii_uppercase[1:string.ascii_uppercase.index(MAX_LETTER) + 1]:
            candidate = base_icon.replace('A_half', letter + '_half') + '.png'
            if candidate in local_files:
                alt_letters.append(letter)

        existing = p.get('skins')
        if alt_letters and alt_letters != existing:
            p['skins'] = alt_letters
            print(f'{pid} ({p.get("name")}): {base_icon} -> alt skins {alt_letters}')
            updated += 1
        elif not alt_letters and existing:
            del p['skins']
            print(f'{pid} ({p.get("name")}): no alt skins (removed stale entry)')
            updated += 1

    if updated:
        with open(PILOTS_DB, 'w', encoding='utf-8') as f:
            json.dump(pilots, f, indent=2, ensure_ascii=False)
            f.write('\n')
    print(f'\nDone. {updated} pilot(s) updated.')


if __name__ == '__main__':
    main()
