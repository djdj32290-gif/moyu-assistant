"""Project-local maintenance: inventory, checked cleanup, and publication audit.

Never follows reparse points or examines browser-profile file contents.
"""
from pathlib import Path
import hashlib
import json
import os
import re
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'work/repository-maintenance'


def linked(path):
    return bool(path.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def files(path):
    if linked(path):
        return
    if path.is_file():
        yield path
        return
    for base, dirs, names in os.walk(path, followlinks=False):
        dirs[:] = [n for n in dirs if not linked(Path(base) / n)]
        for name in names:
            p = Path(base) / name
            if not linked(p):
                yield p


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def plan():
    REPORT.mkdir(exist_ok=True)
    source = {p.relative_to(ROOT).as_posix(): digest(p) for p in files(ROOT / 'src') if '__pycache__' not in p.parts}
    candidates = []
    reasons = {}
    def add(p, reason):
        candidates.append(p)
        reasons[p.relative_to(ROOT).as_posix()] = reason
    # These names are created by the launchers; source and fixed fixtures stay.
    for p in (ROOT / 'work').iterdir():
        if p.is_dir() and (re.match(r'^(?:extension-browser-profile|ui-demo-browser-profile|permission-profile)(?:-|$)', p.name)
                           or p.name in {'demo-browser-profile', 'browser-temp', 'extension-under-test'}
                           or re.match(r'^extension-ui-under-test-\d+$', p.name)):
            add(p, 'Generated isolated browser profile, temporary copy or cache')
    for parent in (ROOT / 'work').iterdir():
        if not parent.is_dir() or linked(parent) or 'baseline' in parent.name:
            continue
        for p in parent.iterdir():
            if p.is_dir() and (re.search(r'-\d{13}$', p.name)
                               or p.name in {'extension-under-test', 'helper-under-test', 'controls-probe-helper', 'low-integrity-helper', 'prototype-data', 'temp', 'downloads'}):
                add(p, 'Generated timestamped test run/profile or disposable helper copy')
    for parent in [ROOT / 'src', ROOT / 'src/desktop', ROOT / 'work']:
        if (parent / '__pycache__').exists():
            add(parent / '__pycache__', 'Regenerable Python bytecode')
    keep = {'摸鱼助手-免安装版-0.18.8.zip', '摸鱼助手-0.18.8-交付与验证.md',
            '摸鱼助手-番剧收藏-0.18.8.png', '摸鱼助手-B站影视外链限制-0.18.8.png'}
    for p in (ROOT / 'outputs').iterdir():
        if p.is_file() and p.name not in keep:
            add(p, 'Superseded or duplicate delivery artifact; rebuildable from source')
    for p in (ROOT / 'work/installer').glob('*.wixpdb'):
        add(p, 'Generated installer debug symbols')
    result = []
    for p in candidates:
        rel = p.relative_to(ROOT).as_posix()
        entries = list(files(p))
        result.append({'path': rel, 'reason': reasons[rel], 'files': len(entries), 'bytes': sum(f.stat().st_size for f in entries)})
    data = {'root': str(ROOT), 'sourceSHA256': source, 'candidates': result,
            'releaseSHA256': digest(ROOT / 'outputs/摸鱼助手-免安装版-0.18.8.zip')}
    (REPORT / 'plan.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'candidates': len(result), 'files': sum(x['files'] for x in result), 'GiB': round(sum(x['bytes'] for x in result) / 1024**3, 3), 'releaseSHA256': data['releaseSHA256']}))


def remove_checked(path):
    # Verify every component and every child; never traverse directory junctions.
    absolute = Path(os.path.abspath(path))
    absolute.relative_to(ROOT)
    assert absolute != ROOT and absolute.parts[:len(ROOT.parts)] == ROOT.parts
    for parent in [absolute, *absolute.parents]:
        if parent == ROOT.parent:
            break
        if linked(parent):
            raise RuntimeError('Reparse point retained: ' + str(parent))
    if absolute.is_dir():
        for child in absolute.iterdir():
            remove_checked(child)
        absolute.rmdir()
    else:
        try:
            absolute.unlink()
        except PermissionError:
            absolute.chmod(stat.S_IWRITE | stat.S_IREAD)
            absolute.unlink()


def clean():
    data = json.loads((REPORT / 'plan.json').read_text(encoding='utf-8'))
    assert data['root'] == str(ROOT)
    for rel, sha in data['sourceSHA256'].items():
        assert digest(ROOT / rel) == sha, 'Source changed since inventory: ' + rel
    deleted, retained = [], []
    for item in data['candidates']:
        p = ROOT / item['path']
        try:
            remove_checked(p)
            deleted.append(item)
        except OSError as e:
            retained.append({'path': item['path'], 'error': type(e).__name__})
        except RuntimeError as e:
            retained.append({'path': item['path'], 'error': str(e)})
    assert digest(ROOT / 'outputs/摸鱼助手-免安装版-0.18.8.zip') == data['releaseSHA256']
    (REPORT / 'cleanup.json').write_text(json.dumps({'deleted': deleted, 'retained': retained}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'deleted': len(deleted), 'GiB': round(sum(x['bytes'] for x in deleted) / 1024**3, 3), 'retained': retained}, ensure_ascii=False))


if __name__ == '__main__':
    {'plan': plan, 'clean': clean}[sys.argv[1]]()
