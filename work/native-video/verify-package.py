from pathlib import Path
import json
import re
import zipfile
root = Path(__file__).resolve().parents[2]
out = root / 'outputs'
helper = out / '点选缩放视频助手'
version = json.loads((root / 'src/manifest.json').read_text(encoding='utf-8'))['version']
panel = (root / 'src/panel.js').read_text(encoding='utf-8')
buttons = re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', panel).group(1).replace(':host', ':root')
assert (helper / 'ui/buttons.css').read_text(encoding='utf-8') == buttons
assert (helper / 'ui/video-common.js').read_bytes() == (root / 'src/video-common.js').read_bytes()
for name in ('player.html', 'player.css', 'player.js', 'media-agent.js'):
    assert (helper / 'ui' / name).read_bytes() == (root / 'src/desktop' / name).read_bytes()
for name in ('连接浏览器', '解除连接'):
    assert (helper / (name + '.ps1')).read_bytes().startswith(b'\xef\xbb\xbf')
    assert (helper / (name + '.cmd')).read_bytes().isascii()
with zipfile.ZipFile(out / f'点选缩放视频助手-{version}.zip') as z:
    assert z.testzip() is None
    assert len(z.namelist()) == 68
    assert '点选缩放视频助手/这个文件夹是什么.md' in z.namelist()
    for name in z.namelist():
        assert not any(p in ('data', 'test-data', '资料库', 'test-library', '__pycache__', 'desktop') for p in Path(name).parts)
        assert not name.endswith(('.cs', '.nupkg', '.py'))
        assert z.read(name) == (out / name).read_bytes()
    helper_names = set(z.namelist())
with zipfile.ZipFile(out / f'点选缩放-桌面小窗-{version}.zip') as z:
    assert z.testzip() is None
    ext = {str(p.relative_to(out)).replace('\\', '/') for p in (out / '点选缩放').rglob('*') if p.is_file()}
    assert set(z.namelist()) == helper_names | ext | {'开始使用.md'}
    for name in z.namelist():
        if name != '开始使用.md': assert z.read(name) == (out / name).read_bytes()
print(f'Portable helper package verified: 68 files including the installed plugin; unified bundle {len(helper_names | ext) + 1} files; shared button CSS exact; no runtime profiles, registrations, test logs or source included.')

record=json.loads((root/'work/native-video/portable-build-manifest.json').read_text(encoding='utf-8'))
assert record['version']==version
with zipfile.ZipFile(out/f'摸鱼助手-免安装版-{version}.zip') as z:
    assert z.testzip() is None
    expected={'摸鱼助手/'+name for name in record['files']} | set(record['rootFiles'])
    assert set(z.namelist())==expected
    assert {n.split('/')[0] for n in z.namelist()}=={'摸鱼助手','这个文件夹是什么.md'}
    assert '摸鱼助手/摸鱼助手.exe' in expected and '摸鱼助手/这个文件夹是什么.md' not in expected
    assert not any(n.endswith(('.msi','.ps1','.cmd')) for n in expected)
    assert not any(any(p in ('data','资料库','导出文件','test-data','test-library') for p in Path(n).parts) for n in expected)
    for name in record['files']:
        data=z.read('摸鱼助手/'+name)
        assert __import__('hashlib').sha256(data).hexdigest()==record['files'][name]
        assert data==(out/'摸鱼助手免安装版/摸鱼助手'/name).read_bytes()
    for name,digest in record['rootFiles'].items():assert __import__('hashlib').sha256(z.read(name)).hexdigest()==digest
    assert z.read('摸鱼助手/摸鱼助手.exe')==(helper/'PointResizeVideo.exe').read_bytes()
print(f'摸鱼助手 primary package verified: {len(expected)} whitelist files, root README and one software folder; no installer, scripts or runtime data.')
