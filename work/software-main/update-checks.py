from pathlib import Path
root=Path(__file__).resolve().parents[2]
def replace(name, old, new):
    p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old);p.write_text(s.replace(old,new),encoding='utf-8')
replace('work/panel-desktop/verify.cjs',"check('Save writes the original extension rule store'","check('Save commits the native library and updates the extension rule cache'")
replace('work/panel-desktop/verify.cjs',"assert.equal(await worker.evaluate(async()=>((await chrome.storage.local.get('point-resize:v1:backup-test.invalid'))['point-resize:v1:backup-test.invalid']).rules[79].label),'中文😀'.repeat(1500));", "await until(async()=>await worker.evaluate(async()=>((await chrome.storage.local.get('point-resize:v1:backup-test.invalid'))['point-resize:v1:backup-test.invalid'])?.rules?.[79]?.label)==='中文😀'.repeat(1500));")
replace('work/panel-desktop/verify.cjs',"await until(async()=>!await worker.evaluate(()=>!!panelPort));check('Escape", "await until(async()=>!await worker.evaluate(()=>panelVisible));check('Escape")
replace('work/panel-desktop/verify.cjs',"await worker.evaluate(()=>nativeDisconnect());await until", "await worker.evaluate(()=>nativeDisconnect());if(videoBrowser){const player=videoBrowser.contexts().flatMap(c=>c.pages()).find(p=>p.url().endsWith('/player.html'));if(player)await player.evaluate(()=>chrome.webview.postMessage({type:'close'}));}await until")
replace('work/native-video/verify-package.py','len(z.namelist()) == 25','len(z.namelist()) == 27')
replace('work/native-video/verify-package.py','verified: 25 files','verified: 27 files')
replace('work/native-video/verify-package.py',"('data', 'test-data', '__pycache__', 'desktop')", "('data', 'test-data', '资料库', 'test-library', '__pycache__', 'desktop')")
replace('work/installer/verify.ps1',"Check ($shortcut.Count -eq 5 -and $shortcut[0] -eq 'INSTALLFOLDER' -and $shortcut[1].Contains('卸载点选缩放视频助手') -and $shortcut[2] -eq '[#HelperExe]' -and $shortcut[3] -eq '--uninstall' -and $shortcut[4] -eq 'INSTALLFOLDER') 'Installed folder contains an ownership-checked uninstall shortcut'", """$rows=@();for($i=0;$i -lt $shortcut.Count;$i+=5){$rows+=,@($shortcut[$i..($i+4)])}
    $uninstall=@($rows|Where-Object {$_[0] -eq 'INSTALLFOLDER'})
    Check ($rows.Count -eq 3 -and $uninstall.Count -eq 1 -and $uninstall[0][1].Contains('卸载点选缩放视频助手') -and $uninstall[0][2] -eq '[#HelperExe]' -and $uninstall[0][3] -eq '--uninstall' -and $uninstall[0][4] -eq 'INSTALLFOLDER') 'Installed folder contains an ownership-checked uninstall shortcut'
    foreach($directory in @('DesktopFolder','ProgramMenuFolder')){
        $entry=@($rows|Where-Object {$_[0] -eq $directory})
        Check ($entry.Count -eq 1 -and $entry[0][1].Contains('点选缩放') -and $entry[0][2] -eq '[#HelperExe]' -and -not $entry[0][3] -and $entry[0][4] -eq 'INSTALLFOLDER') ($directory+' shortcut opens the standalone software without registration or browser arguments')
    }""")
replace('work/installer/verify.ps1',"$names.Count -eq 22", "$names.Count -eq 24")
replace('work/installer/verify.ps1',"exactly 22 runtime", "exactly 24 runtime")
replace('work/installer/verify.ps1',"$zip.Entries.Count -eq 30", "$zip.Entries.Count -eq 36")
replace('work/installer/verify.ps1',"contains 29 extension files", "contains 35 extension files")
replace('src/使用说明.md','列表跟随扩展存储更新，助手不另建收藏库。','列表统一读写软件资料库，扩展只保留确认后的缓存。')
