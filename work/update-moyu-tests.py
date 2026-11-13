from pathlib import Path
root=Path(__file__).resolve().parents[1]
def replace(name,old,new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old[:70]);p.write_text(s.replace(old,new),encoding='utf-8')
replace('src/desktop/PanelWindow.cs','Location = new Point(Convert.ToInt32(pos["x"]), Convert.ToInt32(pos["y"]));','Location = new Point(Convert.ToInt32(pos["x"]), Convert.ToInt32(pos["y"]));tabsRight=Program.Str(pos,"tabSide")=="right";')
replace('src/desktop/PanelWindow.cs','height=(int)Math.Round(Height*100.0/Pixels(100)) }','height=(int)Math.Round(Height*100.0/Pixels(100)),tabSide=tabsRight?"right":"left" }')
replace('src/desktop/build-installer.py',"plugin=APP/'浏览器插件/点选缩放'", "plugin=APP/'浏览器插件/摸鱼助手'")

for name in ('work/software-main/verify-portable.cjs','work/software-main/verify-onboarding.cjs','work/software-main/verify.cjs','work/panel-desktop/verify.cjs'):
 p=root/name;s=p.read_text(encoding='utf-8').replace('0.17.4','0.18.0').replace('浏览器插件/点选缩放','浏览器插件/摸鱼助手').replace('点选缩放.exe','摸鱼助手.exe').replace('outputs/点选缩放-免安装版','outputs/摸鱼助手-免安装版')
 s=s.replace("/已连接/.test(await ui.locator('#connection-status').textContent())", "(await ui.locator('#connection-light').getAttribute('data-connected'))==='true'")
 s=s.replace("assert.match(await ui.locator('#connection-status').textContent(),/已连接/)", "assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'true')")
 p.write_text(s,encoding='utf-8')

replace('work/software-main/verify-portable.cjs',"home=path.join(run,'点选缩放')", "home=path.join(run,'摸鱼助手')")
replace('work/software-main/verify-portable.cjs',"await ui.locator('#native-toggle').click();", "await ui.locator('#native-uninstall').click();await until(()=>fs.existsSync(path.join(home,'test-data/registration-cleared.json')));")
replace('work/software-main/verify-portable.cjs',"Explicit disconnect commits", "Clearing this folder's registration commits")
replace('work/software-main/verify-onboarding.cjs',"assert(!await setup.locator('#disconnect').isVisible());", "assert.equal(await setup.locator('#disconnect').count(),0);assert.equal(await setup.locator('#uninstall').count(),0);")
replace('work/software-main/verify-onboarding.cjs',"assert(await ui.locator('#browser-pair').isDisabled());assert.equal(await ui.locator('#connection-light')", "await until(()=>ui.locator('#browser-pair').isEnabled());assert.equal(await ui.locator('#connection-light')")
replace('work/software-main/verify-onboarding.cjs',"await setup.locator('#disconnect').click();", "await panel.evaluate(()=>PointResizeDesktop.rpc('registration-clear'));")
replace('work/software-main/verify-onboarding.cjs',"/已断开/", "/已断开|连接已断开/")
replace('work/software-main/verify-onboarding.cjs',"Disconnect is explicit and pairing remains available for recovery", "Desktop registry cleanup disconnects the extension; its webpage has no redundant maintenance buttons")

p=root/'work/software-main/verify.cjs';s=p.read_text(encoding='utf-8');start=s.index(" await ui.locator('#tab-settings').click();await ui.locator('#backup-export').click();");end=s.index(" fs.cpSync(path.join(root,'outputs/点选缩放')",start)
s=s[:start]+" assert(!await ui.locator('#settings-backup').isVisible());check('Backup section stays hidden until browser communication and data synchronization are confirmed');\n"+s[end:]
s=s.replace("await ui.locator('#dock').click();await until(async()=>await ui.locator('#dock').getAttribute('aria-pressed')==='true');", "assert.equal(await ui.locator('#dock').getAttribute('aria-pressed'),'true');")
p.write_text(s,encoding='utf-8')
replace('work/panel-desktop/verify.cjs',"await ui.locator('#dock').click();await until(async()=>(await ui.locator('#dock').getAttribute('aria-pressed'))==='true');await ui.locator('#dock').click();await until(async()=>(await ui.locator('#dock').getAttribute('aria-pressed'))==='false');", "assert.equal(await ui.locator('#dock').getAttribute('aria-pressed'),'true');await ui.locator('#dock').click();await until(async()=>(await ui.locator('#dock').getAttribute('aria-pressed'))==='false');await ui.locator('#dock').click();await until(async()=>(await ui.locator('#dock').getAttribute('aria-pressed'))==='true');")

# Keep the package validators whitelist-based, using the build record for the
# deliberately changed public folder layout rather than an old file count.
p=root/'work/verify-package.py';s=p.read_text(encoding='utf-8').replace('浏览器插件/点选缩放','浏览器插件/摸鱼助手');start=s.index('with zipfile.ZipFile(root / (\'outputs/点选缩放-一体包-');s=s[:start]+'''with zipfile.ZipFile(root / ('outputs/摸鱼助手-免安装版-' + manifest['version'] + '.zip')) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {'摸鱼助手/'+name for name in portable['files']} | set(portable['rootFiles'])
    assert '摸鱼助手/摸鱼助手.exe' in archive.namelist()
    assert not any(name.endswith(('.msi','.cmd','.ps1')) for name in archive.namelist())
    assert archive.read('摸鱼助手/摸鱼助手.exe')==(root/'outputs/点选缩放视频助手/PointResizeVideo.exe').read_bytes()
print(f'Portable primary ZIP and legacy extension verified: {len(files)} matching plugin assets; permissions unchanged; version {manifest["version"]}.')
''';p.write_text(s,encoding='utf-8')
p=root/'work/native-video/verify-package.py';s=p.read_text(encoding='utf-8').replace("assert len(z.namelist()) == 63","assert len(z.namelist()) == 68").replace('63 files including','68 files including');start=s.index('with zipfile.ZipFile(out/f\'点选缩放-免安装版-');s=s[:start]+'''with zipfile.ZipFile(out/f'摸鱼助手-免安装版-{version}.zip') as z:
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
''';p.write_text(s,encoding='utf-8')
print('Updated existing regression expectations for the requested UI')
