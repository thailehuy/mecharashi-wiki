#!/usr/bin/env python3
"""Add ?v=<hash of the file> to index.html's local stylesheet and script URLs.

Browsers keep css/style.css, js/*.js and the data bundles cached between
visits, so after a deploy a visitor could get new HTML with an old script or
stylesheet (or a new script with old CSS). The hash changes only when the file
does, so unchanged files (most of the big data bundles) stay cached.

Run by .github/workflows/deploy.yml after scripts/compile.py and before
scripts/build_pages.py (which copies index.html, stamps included). It edits
index.html and js/ in place, so don't commit its output. Usage:

    python3 scripts/stamp_versions.py
"""

import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
# Local <link rel="stylesheet" href="..."> and <script src="..."> (no scheme, no query yet)
# Data bundles the page scripts fetch later: url: 'data/<dir>/<name>.js' literals
DATA_URL = re.compile(r"(url: ')(data/[^'?:#]+\.js)(')")
TAG = re.compile(r'(<(?:link rel="stylesheet" href|script src)=")([^":?#]+\.(?:css|js))(")')


def file_hash(rel):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


def stamp_data_urls():
    """Stamp lazily fetched data bundle URLs in js/**/*.js. Runs first, so the
    scripts' own hashes (stamped into index.html) change when a bundle does."""
    n = 0
    for d, _, files in os.walk(os.path.join(ROOT, 'js')):
        for name in files:
            if not name.endswith('.js'):
                continue
            path = os.path.join(d, name)
            with open(path, encoding='utf-8') as f:
                src = f.read()

            def stamp(m):
                rel = m.group(2)
                if not os.path.isfile(os.path.join(ROOT, rel)):
                    return m.group(0)
                return m.group(1) + rel + '?v=' + file_hash(rel) + m.group(3)

            out, k = DATA_URL.subn(stamp, src)
            if k:
                with open(path, 'w', encoding='utf-8', newline='') as f:
                    f.write(out)
                n += k
    print(f'stamped {n} data bundle URLs in js/')


def main():
    stamp_data_urls()
    with open(INDEX, encoding='utf-8') as f:
        html = f.read()
    missing = []

    def stamp(m):
        rel = m.group(2)
        if not os.path.isfile(os.path.join(ROOT, rel)):
            missing.append(rel)
            return m.group(0)
        return m.group(1) + rel + '?v=' + file_hash(rel) + m.group(3)

    out, n = TAG.subn(stamp, html)
    if missing:
        sys.exit('stamp_versions.py: index.html references missing files: ' + ', '.join(missing))
    with open(INDEX, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'stamped {n} stylesheet/script URLs in index.html')


if __name__ == '__main__':
    main()
