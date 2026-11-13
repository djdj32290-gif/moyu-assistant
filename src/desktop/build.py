"""Build x64 portable helper using the installed .NET Framework compiler."""
from pathlib import Path
import hashlib
import json
import sys
import re
import shutil
import subprocess
import urllib.request
import zipfile
from installer_identity import product_code
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build import copy_extension, build_icons

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'src/desktop'
OUT = ROOT / 'outputs/点选缩放视频助手'
WORK = ROOT / 'work/native-video'
SDK_VERSION = '1.0.4314.35'
SDK_SHA256 = '90778deb1b77e36292828b4b5833c9255c27533f40e0ddd55891ae718944edc4'

def main():
    WORK.mkdir(parents=True, exist_ok=True)
    archive = WORK / f'webview2-{SDK_VERSION}.nupkg'
    if not archive.exists():
        urllib.request.urlretrieve(f'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/{SDK_VERSION}/microsoft.web.webview2.{SDK_VERSION}.nupkg', archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != SDK_SHA256:
        raise ValueError('WebView2 SDK package checksum mismatch')
    sdk = WORK / 'sdk'
    if not (sdk / 'lib/net462/Microsoft.Web.WebView2.Core.dll').exists():
        with zipfile.ZipFile(archive) as z:
            z.extractall(sdk)
    build_icons()
    OUT.mkdir(parents=True, exist_ok=True)
    plugin = OUT / '浏览器插件/摸鱼助手'
    copy_extension(plugin)
    ui = OUT / 'ui'; ui.mkdir(exist_ok=True)
    for name in ('player.html', 'player.css', 'player.js', 'media-agent.js', 'panel.html', 'panel-native.js', 'panel-shape.js', 'panel-app.js'):
        shutil.copy2(SOURCE / name, ui / name)
    shutil.copy2(ROOT / 'src/icons/128.png', ui / 'app-icon.png')
    for name in ('video-common.js', 'video-page.js', 'panel.js', 'backup.js', 'library-api.js', 'native-settings.js'):
        shutil.copy2(ROOT / 'src' / name, ui / name)
    panel = (ROOT / 'src/panel.js').read_text(encoding='utf-8')
    button_css = re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', panel).group(1).replace(':host', ':root')
    (ui / 'buttons.css').write_text(button_css, encoding='utf-8')
    for name in ('Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll'):
        shutil.copy2(sdk / 'lib/net462' / name, OUT / name)
    shutil.copy2(sdk / 'runtimes/win-x64/native/WebView2Loader.dll', OUT / 'WebView2Loader.dll')
    for name in ('LICENSE.txt', 'LICENSE', 'NOTICE.txt', 'ThirdPartyNotices.txt'):
        if (sdk / name).exists(): shutil.copy2(sdk / name, OUT / ('WebView2-' + name))
    compiler = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
    version = json.loads((ROOT / 'src/manifest.json').read_text(encoding='utf-8'))['version']
    identity = WORK / 'InstallerIdentity.cs'
    identity.write_text('static class InstallerIdentity { public const string ProductCode = "' + product_code(version) + '"; }', encoding='utf-8')
    if '--package-only' not in sys.argv:
        subprocess.run([str(compiler), '/nologo', '/target:winexe', '/platform:x64', '/optimize+',
            '/out:' + str(OUT / 'PointResizeVideo.exe'), '/win32icon:' + str(ROOT / 'src/icons/fish.ico'), '/reference:System.Windows.Forms.dll',
            '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll',
            '/reference:' + str(OUT / 'Microsoft.Web.WebView2.Core.dll'),
            '/reference:' + str(OUT / 'Microsoft.Web.WebView2.WinForms.dll'), str(SOURCE / 'PointResizeVideo.cs'), str(SOURCE / 'PanelWindow.cs'), str(SOURCE / 'LibraryStore.cs'), str(SOURCE / 'DesktopBridge.cs'), str(SOURCE / 'BrowserSetup.cs'), str(identity)], check=True)
    elif not (OUT / 'PointResizeVideo.exe').exists():
        raise FileNotFoundError('Compile the helper before packaging.')
    # Windows PowerShell 5.1 needs a BOM to read Chinese source correctly.
    for source in SOURCE.glob('*.ps1'):
        (OUT / source.name).write_text(source.read_text(encoding='utf-8'), encoding='utf-8-sig')
    # cmd.exe follows the current legacy codepage; entry files contain only ASCII.
    for source in SOURCE.glob('*.cmd'):
        # Use an ASCII launcher and find its paired script through its own name.
        (OUT / source.name).write_bytes(b'@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dpn0.ps1"\r\npause\r\n')
    shutil.copy2(SOURCE / '使用说明.md', OUT / '使用说明.md')
    shutil.copy2(SOURCE / '这个文件夹是什么.md', OUT / '这个文件夹是什么.md')
    version = json.loads((ROOT / 'src/manifest.json').read_text(encoding='utf-8'))['version']
    # Only known application files ship. Profiles, registrations and test logs
    # are deliberately excluded even if someone previously ran this directory.
    names = ['PointResizeVideo.exe', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll',
             'WebView2-LICENSE.txt', 'WebView2-NOTICE.txt', '连接浏览器.cmd', '连接浏览器.ps1', '解除连接.cmd', '解除连接.ps1', '使用说明.md', '这个文件夹是什么.md']
    delivery_files = [OUT / name for name in names] + [ui / name for name in ['app-icon.png', 'player.html', 'player.css', 'player.js', 'media-agent.js', 'video-common.js', 'buttons.css', 'panel.html', 'panel-native.js', 'panel-shape.js', 'panel-app.js', 'video-page.js', 'panel.js', 'backup.js', 'library-api.js', 'native-settings.js']] + [p for p in sorted(plugin.rglob('*')) if p.is_file()]
    with zipfile.ZipFile(OUT.parent / f'点选缩放视频助手-{version}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in delivery_files: archive.write(source, source.relative_to(OUT.parent))
    extension = OUT.parent / '点选缩放'
    if (extension / 'manifest.json').exists() and json.loads((extension / 'manifest.json').read_text(encoding='utf-8'))['version'] == version:
        with zipfile.ZipFile(OUT.parent / f'点选缩放-桌面小窗-{version}.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('开始使用.md', (SOURCE / '使用说明.md').read_text(encoding='utf-8'))
            for source in delivery_files: archive.write(source, source.relative_to(OUT.parent))
            for source in extension.rglob('*'):
                if source.is_file(): archive.write(source, source.relative_to(OUT.parent))
    # Whitelist only; never copy user data from a previously launched app.
    portable=OUT.parent/'摸鱼助手免安装版'/'摸鱼助手';portable.mkdir(parents=True,exist_ok=True)
    portable_files=[]
    for source in delivery_files:
        relative=source.relative_to(OUT)
        if source.suffix in ('.cmd','.ps1') or source.name=='这个文件夹是什么.md':continue
        if relative.as_posix()=='PointResizeVideo.exe':relative=Path('摸鱼助手.exe')
        target=portable/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);portable_files.append(target)
    marker=portable/'portable.json';marker.write_text(json.dumps({'format':'point-resize-portable','version':1})+'\n',encoding='utf-8');portable_files.append(marker)
    readme=portable.parent/'这个文件夹是什么.md';shutil.copy2(SOURCE/'这个文件夹是什么.md',readme)
    hashes={p.relative_to(portable).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in portable_files}
    with zipfile.ZipFile(OUT.parent/f'摸鱼助手-免安装版-{version}.zip','w',zipfile.ZIP_DEFLATED) as archive:
        archive.write(readme,readme.name)
        for source in portable_files:archive.write(source,'摸鱼助手/'+source.relative_to(portable).as_posix())
    (WORK/'portable-build-manifest.json').write_text(json.dumps({'version':version,'folder':'摸鱼助手','files':hashes,'rootFiles':{readme.name:hashlib.sha256(readme.read_bytes()).hexdigest()}},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Portable application:',portable)
    print('Built:', OUT)

if __name__ == '__main__': main()
