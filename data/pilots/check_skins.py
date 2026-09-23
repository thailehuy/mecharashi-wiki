"""Scan the local pilot_images_half folder for alternate pilot skin art
(Pilot_{ID}B_half, Pilot_{ID}C_half, ...) and record which letters exist as
an `AlternateSkins` list in each pilot's raw JSON.

Portraits/avatars are all sourced locally now, so this just checks for the
presence of the corresponding local PNG files instead of probing the CDN.
"""
import json, glob, os, string, sys

DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(DIR, '..', 'unlisted', 'pilot_images_half')
MAX_LETTER = 'H'  # probe B..H; leaves headroom past any known skin count


def main():
    local_files = set(os.listdir(IMAGES_DIR))
    updated = 0
    for path in sorted(glob.glob(f'{DIR}/[0-9]*.json')):
        if path.endswith('-translation.json'):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            doc = json.load(f)
        data = doc['data']['data']
        base_icon = data.get('PortraitHeroIcon') or data.get('icon') or ''
        if 'A_half' not in base_icon:
            print(f'skip {os.path.basename(path)}: unexpected icon format {base_icon!r}', file=sys.stderr)
            continue

        alt_letters = []
        for letter in string.ascii_uppercase[1:string.ascii_uppercase.index(MAX_LETTER) + 1]:
            candidate = base_icon.replace('A_half', letter + '_half') + '.png'
            if candidate in local_files:
                alt_letters.append(letter)

        existing = data.get('AlternateSkins')
        if alt_letters:
            data['AlternateSkins'] = alt_letters
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False)
            print(f'{os.path.basename(path)}: {base_icon} -> alt skins {alt_letters}')
            updated += 1
        elif existing:
            del data['AlternateSkins']
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False)
            print(f'{os.path.basename(path)}: no alt skins (removed stale entry)')
            updated += 1

    print(f'\nDone. {updated} file(s) updated.')


if __name__ == '__main__':
    main()
