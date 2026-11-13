"""Build the per-user MSI without installing a compiler or WiX on this machine."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import uuid
import xml.etree.ElementTree as ET
import zipfile
from installer_identity import NAMESPACE, product_code

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src/desktop/installer'
WORK = ROOT / 'work/installer'
OUT = ROOT / 'outputs'
APP = OUT / '点选缩放视频助手'
WIX_SHA256 = '6ac824e1642d6f7277d0ed7ea09411a508f6116ba6fae0aa5f2c7daa2ff43d31'
NS = 'http://schemas.microsoft.com/wix/2006/wi'
ET.register_namespace('', NS)


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    temp = WORK / 'temp'; temp.mkdir(exist_ok=True)
    env = dict(os.environ, TEMP=str(temp), TMP=str(temp))
    archive = WORK / 'wix314-binaries.zip'
    if not archive.exists():
        subprocess.run([shutil.which('pwsh') or 'powershell.exe', '-NoProfile', '-File', str(SOURCE / 'fetch-wix.ps1'),
                        '-Destination', str(archive)], env=env, check=True)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != WIX_SHA256:
        raise ValueError('Unexpected WiX archive checksum')
    tools = WORK / 'wix-3.14.1'
    if not (tools / 'candle.exe').exists():
        with zipfile.ZipFile(archive) as z: z.extractall(tools)
    version = json.loads((ROOT / 'src/manifest.json').read_text(encoding='utf-8'))['version']
    # Strict allowlist: no loose setup scripts, registrations, profiles or test data.
    files = ['PointResizeVideo.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll',
             'WebView2Loader.dll', 'WebView2-LICENSE.txt', 'WebView2-NOTICE.txt', 'WiX-LICENSE.txt', '使用说明.md', '这个文件夹是什么.md',
             *['ui/' + name for name in ('app-icon.png', 'player.html', 'player.css', 'player.js', 'media-agent.js', 'video-common.js', 'buttons.css', 'panel.html', 'panel-native.js', 'panel-shape.js', 'panel-app.js', 'video-page.js', 'panel.js', 'backup.js', 'library-api.js', 'native-settings.js')]]
    plugin=APP/'浏览器插件/摸鱼助手'
    if json.loads((plugin/'manifest.json').read_text(encoding='utf-8'))['version'] != version:
        raise ValueError('Build the matching desktop software and shipped plugin first.')
    plugin_files=[p for p in sorted(plugin.rglob('*')) if p.is_file()]
    if any(p.suffix in ('.msi','.cs','.py') or any(n in p.parts for n in ('data','test-data','__pycache__')) for p in plugin_files):
        raise ValueError('Unexpected files in the installed plugin payload.')
    files += [p.relative_to(APP).as_posix() for p in plugin_files]
    document = ET.Element(f'{{{NS}}}Wix')
    fragment = ET.SubElement(document, f'{{{NS}}}Fragment')
    group = ET.SubElement(fragment, f'{{{NS}}}ComponentGroup', Id='ApplicationFiles')
    directories={'':'INSTALLFOLDER','ui':'UIFOLDER'}
    nodes={'':ET.SubElement(fragment,f'{{{NS}}}DirectoryRef',Id='INSTALLFOLDER')}
    def directory_for(parent):
        key=parent.as_posix() if parent!=Path('.') else ''
        if key in directories:return directories[key]
        above=parent.parent;directory_for(above)
        above_key=above.as_posix() if above!=Path('.') else ''
        identifier='D'+hashlib.sha256(key.encode()).hexdigest()[:16]
        nodes[key]=ET.SubElement(nodes[above_key],f'{{{NS}}}Directory',Id=identifier,Name=parent.name)
        directories[key]=identifier
        return identifier
    hashes = {}
    for name in files:
        source = tools / 'LICENSE.TXT' if name == 'WiX-LICENSE.txt' else APP / name
        key = 'HelperExe' if name == 'PointResizeVideo.exe' else 'F' + hashlib.sha256(name.encode()).hexdigest()[:16]
        component = ET.SubElement(group, f'{{{NS}}}Component', Id='C' + key,
                                  Directory=directory_for(Path(name).parent),
                                  Guid=str(uuid.uuid5(NAMESPACE, name)).upper(), Win64='yes')
        ET.SubElement(component, f'{{{NS}}}File', Id=key, Source=str(source), Name=Path(name).name, KeyPath='yes')
        hashes[name] = hashlib.sha256(source.read_bytes()).hexdigest()
    generated = WORK / 'Files.wxs'
    ET.ElementTree(document).write(generated, encoding='utf-8', xml_declaration=True)
    code = product_code(version)
    candle = [str(tools / 'candle.exe'), '-nologo', '-arch', 'x64', '-ext', 'WixUIExtension', '-ext', 'WixUtilExtension', '-ext', 'WixNetFxExtension',
              '-dVersion=' + version, '-dProductCode=' + code, '-out', str(WORK) + os.sep,
              str(SOURCE / 'Product.wxs'), str(generated)]
    subprocess.run(candle, env=env, check=True)
    target = OUT / f'点选缩放视频助手-安装版-{version}.msi'
    # ICE validation can require machine-wide temporary MSI registration. Keep
    # the build read-only to the OS; verify database, payload and policy separately.
    subprocess.run([str(tools / 'light.exe'), '-nologo', '-sval', '-cultures:zh-cn',
                    '-ext', 'WixUIExtension', '-ext', 'WixUtilExtension', '-ext', 'WixNetFxExtension', '-loc', str(SOURCE / 'Strings.wxl'),
                    '-cc', str(WORK / 'cab-cache'), '-out', str(target),
                    str(WORK / 'Product.wixobj'), str(WORK / 'Files.wixobj')], env=env, check=True)
    # WiX debug symbols are intermediate, never a final delivery artifact.
    symbols = target.with_suffix('.wixpdb')
    if symbols.exists(): symbols.replace(WORK / symbols.name)
    (WORK / 'build-manifest.json').write_text(json.dumps({
        'version': version, 'productCode': code, 'upgradeCode': str(NAMESPACE).upper(),
        'msi': str(target), 'msiSHA256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'wixVersion': '3.14.1', 'wixArchiveSHA256': WIX_SHA256, 'files': hashes,
        'verificationLimit': 'Built only; no product installation or ICE registration performed.'
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    guide = (APP / '使用说明.md').read_text(encoding='utf-8')
    (OUT / '安装助手与连接说明.md').write_text(guide, encoding='utf-8')
    extension = OUT / '点选缩放'
    manifest = extension / 'manifest.json'
    if manifest.exists() and json.loads(manifest.read_text(encoding='utf-8'))['version'] == version:
        packaged = extension / 'installer/PointResizeVideo.msi'
        packaged.parent.mkdir(exist_ok=True)
        shutil.copy2(target, packaged)
        # Keep the legacy extension update ZIP for existing extension IDs.
        for name in (f'点选缩放-{version}.zip',):
            with zipfile.ZipFile(OUT / name, 'w', zipfile.ZIP_DEFLATED) as bundle:
                for source in sorted(extension.rglob('*')):
                    if source.is_file(): bundle.write(source, source.relative_to(OUT))
    delivery=OUT/'点选缩放安装包';delivery.mkdir(exist_ok=True)
    shutil.copy2(target,delivery/'安装点选缩放.msi')
    shutil.copy2(ROOT/'src/desktop/安装包说明.md',delivery/'使用说明.md')
    # Optional MSI compatibility delivery must never replace the portable ZIP.
    with zipfile.ZipFile(OUT/f'点选缩放-安装包-{version}.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for name in ('安装点选缩放.msi','使用说明.md'):
            bundle.write(delivery/name,'点选缩放/'+name)
    print('Built per-user MSI:', target)


if __name__ == '__main__':
    main()
