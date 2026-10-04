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

import html, json, os, re, shutil, subprocess, sys, unicodedata
from urllib.parse import quote

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SITE_URL = 'https://mecharashi-wiki.cc/'
SITE_NAME = 'Mecharashi Wiki'
CDN = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/'
# Images live in the mecharashi-wiki-assets repo; must match ASSET_BASE in index.html.
ASSET_URL = 'https://assets.mecharashi-wiki.cc/'
# A checkout of that repo, used only to see which images exist. CI makes a
# blobless one (file listing only); locally it's expected next to this repo.
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(ROOT, '..', 'mecharashi-wiki-assets'))
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


_terrain_names = None


def terrain_name(tid):
    """Mirrors the <terrian> lookup in js/glossary.js (incl. its TERRAIN_NAMES)."""
    global _terrain_names
    if _terrain_names is None:
        _terrain_names = {'4003081': 'Burning Terrain', '3014501': 'Sentry Zone', '4011081': 'Funnel Field'}
        _terrain_names.update({k: v['name'] for k, v in load('data/glossary.json').get('terrain', {}).items() if v.get('name')})
    return _terrain_names.get(tid, 'Terrain')


def plain(text):
    """Game rich text (<color>, <buf>, <skill>, ...) → one line of plain text."""
    # Terrain tags are self-closing — the name comes from the glossary.
    text = re.sub(r'<terr(?:ian|ain) ID=(\d+)\s*/>', lambda m: f'[{terrain_name(m.group(1))}]', text or '')
    text = re.sub(r'<[^>]+>', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def truncate(text, limit=DESCRIPTION_LIMIT):
    if len(text) <= limit:
        return text
    return text[:limit - 1].rsplit(' ', 1)[0].rstrip(',.;:') + '…'


def load(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return json.load(f)


_asset_files = None


def asset_files():
    """Paths of every file in the assets repo. Read from git (not the working
    tree) so a blobless, no-checkout clone is enough."""
    global _asset_files
    if _asset_files is None:
        if not os.path.isdir(os.path.join(ASSETS_DIR, '.git')):
            sys.exit(f'Assets repo not found at {ASSETS_DIR} — clone mecharashi-wiki-assets there or set ASSETS_DIR')
        out = subprocess.run(['git', '-C', ASSETS_DIR, 'ls-tree', '-r', '--name-only', 'HEAD'],
                             check=True, capture_output=True, text=True).stdout
        _asset_files = set(out.splitlines())
    return _asset_files


def local_or_cdn(local_path, cdn_url):
    """Our own copy (on the assets site) if present, else the game CDN URL —
    same order the pages use."""
    if local_path in asset_files():
        return ASSET_URL + quote(local_path)
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
        # e.g. "v3.6 S-rank Tactician (Medium License) ", then the basic talent
        # on its own line. The trailing space keeps it readable where the line
        # break gets collapsed (Facebook).
        license = p.get('AllowedMechaDriveList_DriveAllowedList')
        meta = join(
            p.get('version') and 'v' + p['version'],
            RANK_LABEL.get(p.get('quality'), ''), p.get('Occupation'),
            license and f'({license} License)',
        )
        yield ('pilots', p['PilotName'], p['PilotName'] + ' — Pilot',
               meta + ' \n' + skill_line(p.get('Talent0_2Ability')),
               local_or_cdn(f'data/unlisted/pilot_images_half/{icon}.png', CDN + f'characterHalf/{quote(icon)}.png'))


def mechs():
    for m in load('data/mechs/compiled.json')['mechs']:
        # Same layout as pilots: "v1.2 S-rank ST (Medium License) ", then
        # "FP: 1098 / Hit: 1794 / Weight: 1810" — the numbers the ST page shows
        # (Firepower, R-Arm Hit, Remaining weight).
        meta = join(
            m.get('version') and 'v' + m['version'],
            RANK_LABEL.get(m.get('quality'), ''), 'ST',
            m.get('type') and f'({m["type"]} License)',
        )
        parts = m.get('parts') or []
        r_arm = next((p for p in parts if p.get('position') in ('右臂', 'R-Arm')), {})
        remaining = int(m.get('output') or 0) - sum(int(p.get('aircraftWeight') or 0) for p in parts)
        stats = ' / '.join(x for x in [
            f'FP: {m.get("manjiFirepower") or m.get("fire")}',
            r_arm.get('Hit') and f'Hit: {r_arm["Hit"]}',
            f'Weight: {remaining}',
        ] if x)
        yield ('sts', m['name'], m['name'] + ' — ST',
               meta + ' \n' + stats,
               local_or_cdn(f'data/unlisted/mechs/Icon/{m["type"]}/{m["icon"]}.png', CDN + f'mecha/{quote(m["icon"])}.png'))


def weapons():
    for w in load('data/weapons/compiled.json')['weapons']:
        if w.get('quality') != 'SSSR' or not w.get('version'):
            continue
        # "v1.6 Erisa's signature ", then the first passive on its own line
        # (trailing space: see pilots()).
        meta = join('v' + w['version'], w.get('pilot') and w['pilot'] + "'s signature")
        passive = (w.get('PassiveSkill') or [None])[0]
        # Mirrors weaponIconSrc() (incl. WEAPON_ICON_OVERRIDE) in js/pages/weapons.js.
        icon = {'10215123': 'Icon_weapon_10200501'}.get(w['ID'], w['icon'])
        yield ('weapons', w['name'], w['name'] + ' — Weapon',
               meta + ' \n' + skill_line(passive),
               local_or_cdn(f'data/weapons/icons/{WEAPON_ICON_FOLDER.get(w["type"], "")}/{icon}.png', CDN + f'weapons/{quote(icon)}.png'))


def backpacks():
    for b in load('data/backpacks/compiled.json')['backpacks']:
        # Weapon layout: "v3.6 Strider (Light ST, Weight 150) ", then the skill
        # on its own line. Only Special backpacks have a version. No rarity here;
        # it's in the title, since names repeat across tiers.
        fit = ', '.join(x for x in [
            b.get('AssemblableAirmenType') and b['AssemblableAirmenType'] + ' ST',
            b.get('weight') and f'Weight {b["weight"]}',
        ] if x)
        meta = join(b.get('version') and 'v' + b['version'], b['name'], fit and f'({fit})')
        yield ('backpacks', b['name'] + '/' + b['quality'], f'{b["name"]} ({RANK_LABEL.get(b["quality"], b["quality"])}) — Backpack',
               meta + ' \n' + skill_line(b.get('skill')),
               ASSET_URL + quote(f'data/backpacks/icons/{b["icon"]}.png'))


def modules():
    for mod in load('data/modules/compiled.json')['modules'].values():
        levels = mod.get('levels') or {}
        top = str(mod.get('maxLevel', ''))
        effect = plain(levels.get(top, ''))
        # Weapon layout: "Cutter Mod (Standalone Module) ", then the max-level
        # effect on its own line. Modules have no version.
        meta = f'{mod["name"]} ({MODULE_CATEGORY_LABEL.get(mod.get("category"), "Module")})'
        yield ('modules', mod['name'].lower(), mod['name'] + ' — Module',
               meta + ' \n' + (effect and f'Lv.{top}: {effect}'),
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


# Preview text for the pages under the "Misc." nav dropdown. They reuse the
# home page's og:image, shown small (twitter:card=summary).
MISC_DESCRIPTIONS = {
    'dispatch':   'Patch-by-patch schedule of which STs were released in each dispatch group.',
    'exskills':   'Reference of the universal EX skills for each weapon type.',
    'shops':      'What the Arena and Border Conflict shops sell, and what each item does.',
    'ststats':    'Sortable comparison table of firepower, HP and weight for every S-rank ST.',
    'pilotstats': 'Sortable comparison table of combat stats for every pilot.',
    'builder':    'Theorycraft an ST loadout (pilot, skills, weapons, backpack and modules) and share it as a link.',
}


def misc_routes(index_html):
    """Routes linked from the "Misc." nav dropdown in index.html."""
    return re.findall(r'class="nav-dropdown-item" href="#\w+" data-page="(\w+)"', index_html)


def page_html(index_html, depth, title, description=None, image=None, url=None):
    out = index_html.replace('<base href="./" />', f'<base href="{"../" * depth}" />', 1)
    out = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)} | {SITE_NAME}</title>', out, count=1)
    if description is None:
        # List pages keep index.html's generic preview, just retitled.
        return re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*', r'\g<1>' + html.escape(title), out)

    # &#10; keeps line breaks (pilot descriptions) out of the tag indentation below.
    e = lambda s: html.escape(s).replace('\n', '&#10;')
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
    if '<base href="./" />' not in index_html:
        sys.exit('index.html is missing the <base href="./" /> base-path marker')

    misc = misc_routes(index_html)
    home_image = re.search(r'<meta property="og:image" content="([^"]+)"', index_html).group(1)
    home_description = re.search(r'<meta property="og:description" content="([^"]+)"', index_html).group(1)
    for r, label in routes.items():
        shutil.rmtree(os.path.join(ROOT, r), ignore_errors=True)
        if r in misc:
            write(r, page_html(index_html, 1, label, MISC_DESCRIPTIONS.get(r, html.unescape(home_description)),
                               absolute(site_url, home_image), site_url + r + '/'))
        else:
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
