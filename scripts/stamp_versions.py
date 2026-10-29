#!/usr/bin/env python3
"""Add ?v=<hash of the file> to index.html's local stylesheet and script URLs.

Browsers keep css/style.css, js/*.js and the data bundles cached between
visits, so after a deploy a visitor could get new HTML with an old script or
stylesheet (or a new script with old CSS). The hash changes only when the file
does, so unchanged files (most of the big data bundles) stay cached.

Run by .github/workflows/deploy.yml after scripts/compile.py and before
scripts/build_pages.py (which copies index.html, stamps included). It edits
index.html in place, so don't commit its output. Usage:

    python3 scripts/stamp_versions.py
"""

import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
# Local <link rel="stylesheet" href="..."> and <script src="..."> (no scheme, no query yet)
TAG = re.compile(r'(<(?:link rel="stylesheet" href|script src)=")([^":?#]+\.(?:css|js))(")')


def file_hash(rel):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


def main():
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
