"""Check the preserved portable release and staged public repository files."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'src/manifest.json').read_text(encoding='utf-8'))['version']
PACKAGE = ROOT / f'outputs/摸鱼助手-免安装版-{VERSION}.zip'
SHA = '82a4b43bd4c064226f01db9b9c2f44d98e7bae26a46a6766aa363c6cc726fdab'


def main():
    assert VERSION == '0.18.8'
    assert hashlib.sha256(PACKAGE.read_bytes()).hexdigest() == SHA
    with zipfile.ZipFile(PACKAGE) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert len(names) == len(set(names)) == 65
        assert {n.split('/')[0] for n in names} == {'摸鱼助手', '这个文件夹是什么.md'}
        forbidden = {'data', '资料库', '导出文件', 'test-data', 'test-library', '__pycache__', 'node_modules'}
        for name in names:
            p = Path(name)
            assert not p.is_absolute() and '..' not in p.parts
            assert not forbidden.intersection(p.parts), name
            assert p.suffix.lower() not in {'.msi', '.cmd', '.ps1', '.cs', '.py', '.log', '.db'}, name
        for source in (ROOT / 'src').rglob('*'):
            if not source.is_file():
                continue
            rel = source.relative_to(ROOT / 'src')
            if 'desktop' in rel.parts or '__pycache__' in rel.parts or source.suffix == '.py' or source.name == '待修问题.md':
                continue
            assert archive.read('摸鱼助手/浏览器插件/摸鱼助手/' + rel.as_posix()) == source.read_bytes(), str(rel)
        for name in ['player.html', 'player.css', 'player.js', 'media-agent.js', 'panel.html', 'panel-native.js', 'panel-shape.js', 'panel-app.js']:
            assert archive.read('摸鱼助手/ui/' + name) == (ROOT / 'src/desktop' / name).read_bytes()
        panel = (ROOT / 'src/panel.js').read_text(encoding='utf-8')
        css = re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', panel).group(1).replace(':host', ':root')
        assert archive.read('摸鱼助手/ui/buttons.css').decode('utf-8').replace('\r\n', '\n') == css
    manifest = json.loads((ROOT / 'src/manifest.json').read_text(encoding='utf-8'))
    assert manifest['permissions'] == ['activeTab', 'scripting', 'storage', 'nativeMessaging']
    print('PASS: Original 65-file release SHA-256, source/UI, shared buttons and permissions.')

    staged = subprocess.run(['git', 'diff', '--cached', '--name-only', '-z'], cwd=ROOT, capture_output=True, check=True).stdout.decode('utf-8').split('\0')
    issues = []
    secret_patterns = [
        rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
        rb'gh[pousr]_[A-Za-z0-9]{30,}',
        rb'github_pat_[A-Za-z0-9_]{30,}',
        rb'AKIA[0-9A-Z]{16}',
        rb'xox[baprs]-[0-9A-Za-z-]{20,}',
        rb'AIza[0-9A-Za-z_-]{35}',
        rb'(?i)(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*[\x22\x27][A-Za-z0-9_+/=-]{20,}[\x22\x27]',
    ]
    for name in filter(None, staged):
        p = Path(name)
        if forbidden.intersection(p.parts) or p.suffix.lower() in {'.zip', '.msi', '.exe', '.dll', '.nupkg', '.db', '.log', '.pfx', '.pem', '.key', '.reg'} or p.name in {'host.json', 'Cookies', 'Local State', 'Login Data'}:
            issues.append((name, 'forbidden file'))
        data = subprocess.run(['git', 'show', ':' + name], cwd=ROOT, capture_output=True, check=True).stdout
        if any(re.search(pattern, data) for pattern in secret_patterns):
            issues.append((name, 'secret signature'))
        if len(data) > 10 * 1024 * 1024:
            issues.append((name, 'oversize source file'))
    assert not issues, issues  # Only file paths/categories, never secret values.
    print(f'PASS: {len(list(filter(None, staged)))} staged files; no forbidden state, binary packages or known secret signatures.')


if __name__ == '__main__':
    main()
