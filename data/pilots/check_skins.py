"""Probe for alternate pilot skin art (Pilot_{ID}B_half, Pilot_{ID}C_half, ...) and
record which letters exist as an `AlternateSkins` list in each pilot's raw JSON.

The CDN returns HTTP 200 for real assets and a 302 (to a 404 fallback host) for
missing ones, so a HEAD request without following redirects tells them apart.
Shells out to curl (via subprocess) rather than urllib because the local Python
install's SSL trust store fails to verify this CDN's certificate.
"""
import json, glob, os, string, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AVATAR_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/characterHalf/'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'
REFERER = 'https://www.mecharashi.com/'
MAX_LETTER = 'H'  # probe B..H; leaves headroom past any known skin count


def exists(icon_name):
    url = AVATAR_BASE + icon_name + '.png'
    result = subprocess.run(
        ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-I',
         '-A', UA, '-e', REFERER, url],
        capture_output=True, text=True, timeout=15,
    )
    return result.stdout.strip() == '200'


def main():
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
            candidate = base_icon.replace('A_half', letter + '_half')
            if exists(candidate):
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
