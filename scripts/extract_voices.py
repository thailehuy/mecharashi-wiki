#!/usr/bin/env python3
"""Extract every wiki pilot's voice lines from the game's Wwise sound banks into the voices repo
(mecharashi-wiki-voices, served from https://voices.mecharashi-wiki.cc/) as <lang>/<bank ID>/<event>.mp3,
and list them in data/pilots/voice-audio.json (by bank ID) for build_voice.py.

Each pilot has a bank per language (Pilot_<ID>.bnk, Pilot_<ID>B.bnk etc. for a skin's lines) in the game's
Resave/Wwise/<English|Japanese|Chinese>/ folder, and the game downloads newer ones into its cache
(resavefiles_wwise_windows_<english|chinese>_* bundles, a ResaveFile MonoBehaviour per bank); the newest copy
of each wins. A bank's events (ConfigDataPilotVoiceInfo.WwiseVoiceEventName, hashed with FNV-1) play one
sound each, whose Wwise Vorbis audio is in the bank (DIDX/DATA) or streamed (<source ID>.wem, loose or a
<source ID>_wem object in a cache bundle). Events are named by matching their hash against the event names
of the global and CN tables, and PI_<bank>_Voice_Line_<suffix> for every suffix those use; any left over keep
their hash as the name.

    python3 scripts/extract_voices.py [--force]

Lines already extracted from the same source are skipped unless --force is given.

Needs: pip install UnityPy; vgmstream-cli (decodes Wwise Vorbis) and ffmpeg (encodes the MP3s), on the PATH
or given by the VGMSTREAM / FFMPEG environment variables.
"""
import glob
import json
import os
import re
import shutil
import sqlite3
import struct
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

import UnityPy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate'))
import settings  # noqa: E402

PILOTS = os.path.join(ROOT, 'data', 'db', 'pilots.json')
MANIFEST = os.path.join(ROOT, 'data', 'pilots', 'voice-audio.json')
STATS = [os.path.join(settings.OUT_DIR, 'stats.db'),
         os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')]
VOICES_DIR = os.environ.get('VOICES_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-voices'))
WWISE_DIR = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'Resave', 'Wwise')
CACHE_DIR = os.path.join(settings.LOCAL_LOW, 'Unity', 'tentree_Mecharashi')
VGMSTREAM = os.environ.get('VGMSTREAM') or shutil.which('vgmstream-cli') or 'vgmstream-cli'
FFMPEG = os.environ.get('FFMPEG') or shutil.which('ffmpeg') or 'ffmpeg'

# Wiki language code -> the game's Wwise language folder (and its cache bundles' name, if it downloads any).
LANGS = {'en': 'English', 'ja': 'Japanese', 'zh': 'Chinese'}
BANK_RE = re.compile(r'^Pilot_(\d{8})([A-Z]?)$')


def fnv1(name):
    h = 2166136261
    for b in name.lower().encode():
        h = (h * 16777619) & 0xffffffff
        h ^= b
    return h


def event_names(banks):
    """FNV-1 hash -> event name, for every event name the tables use and the same suffixes for every bank."""
    names = set()
    for path in STATS:
        if os.path.exists(path):
            con = sqlite3.connect('file:%s?mode=ro' % path, uri=True)
            names |= {r[0] for r in con.execute('SELECT WwiseVoiceEventName FROM ConfigDataPilotVoiceInfo') if r[0]}
    suffixes = {m.group(1) for n in names for m in [re.match(r'PI_\w+?_Voice_Line_(\w+)$', n)] if m}
    names |= {'PI_%s_Voice_Line_%s' % (b, s) for b in banks for s in suffixes}
    return {fnv1(n): n for n in names}


def pilot_banks(pilots):
    """The pilots' IDs and every bank their lines (ConfigDataPilotVoiceInfo ID = pilot ID + 2 digits) play: some
    pilots' lines play another ID's bank (Vincenza 10103144's are PI_10103145_…, Bertha 10103145's PI_10103143_…)."""
    banks = set(pilots)
    for path in STATS:
        if os.path.exists(path):
            con = sqlite3.connect('file:%s?mode=ro' % path, uri=True)
            for i, event in con.execute('SELECT ID, WwiseVoiceEventName FROM ConfigDataPilotVoiceInfo'):
                m = re.match(r'PI_(\d{8})', event or '')
                if m and str(i // 100) in pilots:
                    banks.add(m.group(1))
    return banks


# ── Finding the newest copy of each bank and streamed file ────────────────────

def cache_objects(prefix):
    """Object name -> (mtime, MonoBehaviour object) from the newest copy of each cache bundle named prefix*."""
    out = {}
    for d in glob.glob(os.path.join(CACHE_DIR, prefix + '*')):
        copies = glob.glob(os.path.join(d, '*', '__data'))
        if not copies:
            continue
        path = max(copies, key=os.path.getmtime)
        for obj in UnityPy.load(path).objects:
            if obj.type.name == 'MonoBehaviour':
                name = obj.peek_name()
                if name and (name not in out or out[name][0] < os.path.getmtime(path)):
                    out[name] = (os.path.getmtime(path), obj)
    return out


class Source:
    """The bytes of a file that's either loose (a path) or a cached ResaveFile object."""
    def __init__(self, mtime, path=None, obj=None):
        self.mtime, self.path, self.obj = mtime, path, obj

    def read(self):
        if self.path:
            with open(self.path, 'rb') as f:
                return f.read()
        return bytes(self.obj.read_typetree()['m_bytes'])


def newest(sources, name, src):
    if name not in sources or sources[name].mtime < src.mtime:
        sources[name] = src


def find_files(cached):
    """(banks: lang -> bank name -> Source, wems: source ID -> Source)."""
    banks, wems = {lang: {} for lang in LANGS}, {}
    for lang, folder in LANGS.items():
        for p in glob.glob(os.path.join(WWISE_DIR, folder, 'Pilot_*.bnk')):
            newest(banks[lang], os.path.basename(p)[:-4], Source(os.path.getmtime(p), path=p))
    for p in glob.glob(os.path.join(WWISE_DIR, '**', '*.wem'), recursive=True):
        newest(wems, int(os.path.basename(p)[:-4]), Source(os.path.getmtime(p), path=p))
    for name, (mtime, obj) in cached.items():
        if name.endswith('_wem') and name[:-4].isdigit():
            newest(wems, int(name[:-4]), Source(mtime, obj=obj))
    for lang, folder in LANGS.items():
        for name, (mtime, obj) in cache_objects('resavefiles_wwise_windows_%s_' % folder.lower()).items():
            if name.startswith('Pilot_') and name.endswith('_bnk'):
                newest(banks[lang], name[:-4], Source(mtime, obj=obj))
    return banks, wems


# ── Reading a bank ──────────────────────────────────────────────────────────────

def bank_sounds(data):
    """[(event hash, source ID, embedded bytes or None)] for every event in a (v140) bank that plays a sound."""
    secs, i = {}, 0
    while i + 8 <= len(data):
        tag, size = data[i:i + 4].decode('latin1'), struct.unpack_from('<I', data, i + 4)[0]
        secs[tag] = (i + 8, size)
        i += 8 + size
    media = {}
    if 'DIDX' in secs:
        o, n = secs['DIDX']
        base = secs['DATA'][0]
        for j in range(o, o + n, 12):
            wid, off, size = struct.unpack_from('<III', data, j)
            media[wid] = data[base + off:base + off + size]
    sounds, actions, events = {}, {}, []
    if 'HIRC' in secs:
        o, _ = secs['HIRC']
        p = o + 4
        for _ in range(struct.unpack_from('<I', data, o)[0]):
            kind, size, oid = data[p], *struct.unpack_from('<II', data, p + 1)
            body = p + 9
            if kind == 2:    # Sound: plugin ID, stream type, source ID, ... (all 0 in a placeholder)
                sounds[oid] = (data[body + 4], struct.unpack_from('<I', data, body + 5)[0])
            elif kind == 3:  # Action: type, target ID
                if struct.unpack_from('<H', data, body)[0] == 0x0403:  # Play
                    actions[oid] = struct.unpack_from('<I', data, body + 2)[0]
            elif kind == 4:  # Event: action count, action IDs
                n = data[body]
                events.append((oid, struct.unpack_from('<%dI' % n, data, body + 1)))
            p += 5 + size
    out = []
    for eid, acts in events:
        for a in acts:
            if actions.get(a) in sounds:
                stream, sid = sounds[actions[a]]
                if not sid:  # a placeholder: the line isn't voiced in this language (e.g. CN-only pilots' English banks)
                    break
                # Stream type 0: in the bank; 1 (prefetched) and 2: streamed, the full file is the .wem.
                out.append((eid, sid, media.get(sid) if stream == 0 else None))
                break
    return out


# ── Converting ──────────────────────────────────────────────────────────────────

def convert(wem, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        src, wav = os.path.join(tmp, 'in.wem'), os.path.join(tmp, 'out.wav')
        with open(src, 'wb') as f:
            f.write(wem)
        subprocess.run([VGMSTREAM, '-o', wav, src], check=True, capture_output=True)
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '5', out_path],
                       check=True, capture_output=True)


def main():
    force = '--force' in sys.argv[1:]
    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    with open(PILOTS, encoding='utf-8') as f:
        pilots = json.load(f)
    old = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            old = json.load(f)

    banks, wems = find_files(cache_objects('resavefiles_wwise_windows_'))
    names = event_names({m.group(1) + m.group(2) for b in banks.values() for n in b for m in [BANK_RE.match(n)] if m})
    wanted = pilot_banks(pilots)
    manifest, todo, missing, unnamed = {}, [], [], 0
    for lang in LANGS:
        for bank, src in sorted(banks[lang].items()):
            m = BANK_RE.match(bank)
            if not m or m.group(1) not in wanted:
                continue
            pid = m.group(1)  # the bank's ID, not always its pilot's
            for eid, sid, data in bank_sounds(src.read()):
                event = names.get(eid)
                if not event:
                    event, unnamed = str(eid), unnamed + 1
                if data is None and sid not in wems:
                    missing.append('%s %s (%d.wem)' % (lang, event, sid))
                    continue
                manifest.setdefault(pid, {}).setdefault(event, {})[lang] = sid
                out = os.path.join(VOICES_DIR, lang, pid, event + '.mp3')
                if force or old.get(pid, {}).get(event, {}).get(lang) != sid or not os.path.exists(out):
                    # Read here: UnityPy isn't safe to use from the conversion threads.
                    todo.append((data if data is not None else wems[sid].read(), out))

    print('%d pilots, %d lines (%d unnamed), %d to convert' % (
        len(manifest), sum(len(v) for v in manifest.values()), unnamed, len(todo)))
    with ThreadPoolExecutor(os.cpu_count()) as pool:
        list(pool.map(lambda t: convert(*t), todo))
    if missing:
        print('Streamed file not found: ' + ', '.join(missing))

    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        json.dump({k: manifest[k] for k in sorted(manifest)}, f, indent=1, sort_keys=True)
        f.write('\n')
    print('Wrote %s' % os.path.relpath(MANIFEST, ROOT))


if __name__ == '__main__':
    main()
