#!/usr/bin/env python3
"""Generate a static copy of index.html for every route, e.g. pilots/ada/index.html.

Facebook/Discord link previews don't run JavaScript and ignore the "#..."
part of a URL, so every item needs its own real file whose <head> carries
that item's og:/twitter: tags. Each generated file is otherwise identical to
index.html — it boots the same app, and js/app.js routes from the path.

Run by .github/workflows/deploy.yml before upload; the output folders are
gitignored. Usage:

    python3 build_pages.py [SITE_URL]

SITE_URL is the absolute site root used for og:url/og:image (default: the
site's custom domain). Run `python3 build_pages.py --clean` to delete the output.
"""

import html, json, os, re, shutil, sys, unicodedata
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SITE_URL = 'https://mecharashi-wiki.cc/'
SITE_NAME = 'Mecharashi Wiki'
CDN = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/'
DESCRIPTION_LIMIT = 300

RANK_LABEL = {'SSSR': 'Special', 'UR': 'Composite', 'SSR': 'S-rank', 'SR': 'A-rank', 'R': 'B-rank'}
MODULE_CATEGORY_LABEL = {
    'PropertyS':   'Standalone Module',
    'GeneralSuit': 'Innate ST Module',
    'SuitS':       'Producible Module',
}
# Mirrors WEAPON_ICON_FOLDER in js/pages/weapons.js.
WEAPON_ICON_FOLDER = {
    'Blade': 'AB', 'Buckler': 'SS', 'Flamethrower': 'FT', 'Funnel': 'CT',
    'HeavyMachineGun': 'HMG', 'HeavySniper': 'SR', 'LightSniper': 'LR',
    'MachineGun': 'MG', 'Missile': 'ML', 'PileBunker': 'PB', 'RailGun': 'RG',
    'Rocket': 'RL',
}


def slugify(s):
    """Must match slugify() in js/app.js."""
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.category(c).startswith('M')).lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def plain(text):
    """Game rich text (<color>, <buf>, <skill>, ...) → one line of plain text."""
    text = re.sub(r'<[^>]+>', '', text or '')
    return re.sub(r'\s+', ' ', text).strip()


def truncate(text, limit=DESCRIPTION_LIMIT):
    if len(text) <= limit:
        return text
    return text[:limit - 1].rsplit(' ', 1)[0].rstrip(',.;:') + '…'


def load(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return json.load(f)


def local_or_cdn(local_path, cdn_url):
    """Local file (as a site-relative path) if present, else the CDN URL — same
    local-first order the pages use."""
    if os.path.isfile(os.path.join(ROOT, local_path)):
        return quote(local_path)
    return cdn_url


def skill_line(skill):
    if not skill or not skill.get('name'):
        return ''
    effect = plain(skill.get('SpecificEffects', ''))
    return skill['name'] + (': ' + effect if effect else '')


def join(*parts):
    return ' '.join(p for p in parts if p)


# ── Items ─────────────────────────────────────────────────────────────────────
# Each yields (route, param, title, description, image). `param` is what the
# page's render() expects — must match DETAIL_PARAMS in js/app.js.

def pilots():
    for p in load('data/pilots/compiled.json')['pilots']:
        icon = p['PortraitHeroIcon']
        meta = ' · '.join(x for x in [
            RANK_LABEL.get(p.get('quality'), ''), p.get('Profession'), p.get('Occupation'),
            p.get('AllowedMechaDriveList_DriveAllowedList') and p['AllowedMechaDriveList_DriveAllowedList'] + ' ST',
        ] if x)
        yield ('pilots', p['PilotName'], p['PilotName'] + ' — Pilot',
               join(meta + '.', 'Talent — ' + skill_line(p.get('Talent3_5Ability'))),
               local_or_cdn(f'data/unlisted/pilot_images_half/{icon}.png', CDN + f'characterHalf/{quote(icon)}.png'))


def mechs():
    for m in load('data/mechs/compiled.json')['mechs']:
        meta = ' · '.join(x for x in [
            RANK_LABEL.get(m.get('quality'), ''), m.get('type', '') + ' ST', m.get('version') and 'v' + m['version'],
        ] if x)
        modules = ', '.join(mod['name'] for mod in m.get('modules') or [] if mod.get('name'))
        yield ('sts', m['name'], m['name'] + ' — ST',
               join(meta + '.', modules and 'Modules: ' + modules + '.'),
               local_or_cdn(f'data/unlisted/mechs/Icon/{m["type"]}/{m["icon"]}.png', CDN + f'mecha/{quote(m["icon"])}.png'))


def weapons():
    for w in load('data/weapons/compiled.json')['weapons']:
        if w.get('quality') != 'SSSR' or not w.get('version'):
            continue
        meta = 'SSSR signature weapon' + (' of ' + w['pilot'] if w.get('pilot') else '') + ' · v' + w['version'] + '.'
        passive = (w.get('PassiveSkill') or [None])[0]
        # Mirrors weaponIconSrc() (incl. WEAPON_ICON_OVERRIDE) in js/pages/weapons.js.
        icon = {'10215123': 'Icon_weapon_10200501'}.get(w['ID'], w['icon'])
        yield ('weapons', w['name'], w['name'] + ' — Weapon',
               join(meta, skill_line(passive)),
               local_or_cdn(f'data/weapons/icons/{WEAPON_ICON_FOLDER.get(w["type"], "")}/{icon}.png', CDN + f'weapons/{quote(icon)}.png'))


def backpacks():
    for b in load('data/backpacks/compiled.json')['backpacks']:
        meta = ' · '.join(x for x in [
            RANK_LABEL.get(b.get('quality'), '') + ' backpack', b.get('weight') and 'Weight ' + str(b['weight']),
            b.get('version') and 'v' + b['version'],
        ] if x)
        yield ('backpacks', b['name'] + '/' + b['quality'], f'{b["name"]} ({RANK_LABEL.get(b["quality"], b["quality"])}) — Backpack',
               join(meta + '.', skill_line(b.get('skill'))),
               quote(f'data/backpacks/icons/{b["icon"]}.png'))


def modules():
    for mod in load('data/modules/compiled.json')['modules'].values():
        levels = mod.get('levels') or {}
        top = str(mod.get('maxLevel', ''))
        effect = plain(levels.get(top, ''))
        yield ('modules', mod['name'].lower(), mod['name'] + ' — Module',
               join(MODULE_CATEGORY_LABEL.get(mod.get('category'), 'Module') + '.', effect and f'Lv.{top}: {effect}'),
               local_or_cdn(f'data/unlisted/mech_modules/{mod["icon"]}.png', CDN + f'skill/{quote(mod["icon"])}.png'))


# ── Output ────────────────────────────────────────────────────────────────────

def route_titles(index_html):
    """Every top-level route → its nav label, taken from the links in index.html."""
    titles = {}
    for route, label in re.findall(r'data-page="(\w+)">([^<]+)<', index_html):
        label = html.unescape(label).strip()
        titles.setdefault(route, 'Home' if label == SITE_NAME else label)
    # Generated folders sit next to the site's own files — never clobber those.
    clash = [r for r in titles if os.path.exists(os.path.join(ROOT, r)) and not os.path.isfile(os.path.join(ROOT, r, 'index.html'))]
    if clash:
        sys.exit(f'Route folders would overwrite existing paths: {clash}')
    return titles


def page_html(index_html, depth, title, description=None, image=None, url=None):
    out = index_html.replace('})(/*depth*/0);', f'}})(/*depth*/{depth});', 1)
    out = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)} | {SITE_NAME}</title>', out, count=1)
    if description is None:
        # List pages keep index.html's generic preview, just retitled.
        return re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*', r'\g<1>' + html.escape(title), out)

    e = html.escape
    tags = '\n'.join([
        '<meta property="og:type" content="website" />',
        f'<meta property="og:site_name" content="{SITE_NAME}" />',
        f'<meta property="og:url" content="{e(url)}" />',
        f'<meta property="og:title" content="{e(title)}" />',
        f'<meta property="og:description" content="{e(description)}" />',
        f'<meta property="og:image" content="{e(image)}" />',
        '<meta name="twitter:card" content="summary" />',
        f'<meta name="twitter:title" content="{e(title)}" />',
        f'<meta name="twitter:description" content="{e(description)}" />',
        f'<meta name="twitter:image" content="{e(image)}" />',
        f'<meta name="description" content="{e(description)}" />',
    ])
    out = re.sub(r'[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>\n', '', out)
    return out.replace('<title>', tags.replace('\n', '\n  ') + '\n  <title>', 1)


def write(rel_dir, content):
    path = os.path.join(ROOT, rel_dir, 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def absolute(site_url, path):
    return path if re.match(r'https?://', path) else site_url + path


def main():
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        index_html = f.read()
    routes = route_titles(index_html)

    if sys.argv[1:] == ['--clean']:
        for r in routes:
            shutil.rmtree(os.path.join(ROOT, r), ignore_errors=True)
        print('Removed generated pages.')
        return

    site_url = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SITE_URL).rstrip('/') + '/'
    if '/*depth*/0' not in index_html:
        sys.exit('index.html is missing the /*depth*/0 base-path marker')

    for r, label in routes.items():
        shutil.rmtree(os.path.join(ROOT, r), ignore_errors=True)
        write(r, page_html(index_html, 1, label))

    count = 0
    for items in (pilots, mechs, weapons, backpacks, modules):
        seen = {}
        for route, param, title, description, image in items():
            slug = slugify(param)
            if not slug or slug in seen:
                sys.exit(f'{route}: slug "{slug}" for {param!r} is empty or collides with {seen.get(slug)!r}')
            seen[slug] = param
            rel = f'{route}/{slug}'
            write(rel, page_html(index_html, 2, title, truncate(description),
                                 absolute(site_url, image), site_url + rel + '/'))
            count += 1

    print(f'Generated {len(routes)} route pages and {count} item pages.')


if __name__ == '__main__':
    main()
