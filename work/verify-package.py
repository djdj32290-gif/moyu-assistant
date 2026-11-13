from pathlib import Path
import json
import zipfile
import hashlib

root = Path(__file__).resolve().parent.parent
source = root / 'src'
delivery = root / 'outputs/点选缩放'
manifest = json.loads((delivery / 'manifest.json').read_text(encoding='utf-8'))
assert manifest['version'] == json.loads((source / 'manifest.json').read_text(encoding='utf-8'))['version']
assert manifest['permissions'] == ['activeTab', 'scripting', 'storage', 'nativeMessaging']
assert manifest['optional_host_permissions'] == ['http://*/*', 'https://*/*', '<all_urls>']
assert 'host_permissions' not in manifest
assert 'options_ui' not in manifest
assert 'default_popup' not in manifest['action']
files = [f for f in source.rglob('*') if f.is_file() and f.suffix != '.py' and '__pycache__' not in f.parts and 'desktop' not in f.relative_to(source).parts and f.name != '待修问题.md']
expected = {f.relative_to(source).as_posix() for f in files}
info = json.loads((root / 'work/installer/build-manifest.json').read_text(encoding='utf-8'))
assert info['version'] == manifest['version'], 'Build the matching MSI before the final package verification.'
expected.add('installer/PointResizeVideo.msi')
assert hashlib.sha256((delivery / 'installer/PointResizeVideo.msi').read_bytes()).hexdigest() == info['msiSHA256']
actual = {f.relative_to(delivery).as_posix() for f in delivery.rglob('*') if f.is_file()}
assert expected == actual, (expected ^ actual)
with zipfile.ZipFile(root / ('outputs/点选缩放-' + manifest['version'] + '.zip')) as archive:
    assert archive.testzip() is None
    assert {name.split('/', 1)[1] for name in archive.namelist()} == expected
    for file in files:
        relative = file.relative_to(source)
        assert file.read_bytes() == (delivery / relative).read_bytes() == archive.read('点选缩放/' + relative.as_posix())
    assert archive.read('点选缩放/installer/PointResizeVideo.msi') == Path(info['msi']).read_bytes()
plugin = root / 'outputs/点选缩放视频助手/浏览器插件/摸鱼助手'
assert {p.relative_to(plugin).as_posix() for p in plugin.rglob('*') if p.is_file()} == expected - {'installer/PointResizeVideo.msi'}
for file in files:
    assert (plugin / file.relative_to(source)).read_bytes() == file.read_bytes()
portable=json.loads((root/'work/native-video/portable-build-manifest.json').read_text(encoding='utf-8'))
assert portable['version']==manifest['version']
with zipfile.ZipFile(root / ('outputs/摸鱼助手-免安装版-' + manifest['version'] + '.zip')) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {'摸鱼助手/'+name for name in portable['files']} | set(portable['rootFiles'])
    assert '摸鱼助手/摸鱼助手.exe' in archive.namelist()
    assert not any(name.endswith(('.msi','.cmd','.ps1')) for name in archive.namelist())
    assert archive.read('摸鱼助手/摸鱼助手.exe')==(root/'outputs/点选缩放视频助手/PointResizeVideo.exe').read_bytes()
print(f'Portable primary ZIP and legacy extension verified: {len(files)} matching plugin assets; permissions unchanged; version {manifest["version"]}.')
