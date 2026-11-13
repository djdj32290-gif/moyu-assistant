from pathlib import Path
root=Path(__file__).resolve().parents[2]
names=['work/software-main/verify-moyu.cjs','work/software-main/verify-portable.cjs','work/software-main/verify-onboarding.cjs','work/software-main/verify-startup.cjs','work/software-main/verify-registration.cjs']
for name in names:
 p=root/name;s=p.read_text(encoding='utf-8').replace('0.18.2','0.18.3')
 if 'verify-startup' in name:s=s.replace('#browser-install','#browser-chrome')
 if any(x in name for x in ['verify-moyu','verify-portable','verify-onboarding']):
  s=s.replace("await ui.locator('summary').filter({hasText:'连接维护'}).click();",'')
  s=s.replace("await ui.locator('#browser-install').click();",'')
  s=s.replace("ui.locator('#browser-install')","ui.locator('#browser-chrome')")
  s=s.replace("await ui.locator('#browser-pair').click();","await ui.locator('#browser-chrome').click();")
  s=s.replace("ui.locator('#browser-pair').isEnabled()","ui.locator('#browser-chrome').isEnabled()")
  s=s.replace("assert(await ui.locator('#browser-pair').isDisabled());","assert(await ui.locator('#browser-pair').isEnabled());")
  s=s.replace("await until(()=>ui.locator('#browser-pair').isDisabled());","await until(()=>ui.locator('#browser-pair').textContent().then(t=>t.includes('点击取消')));")
 if 'verify-moyu' in name:
  lines=s.splitlines();idx=next(i for i,l in enumerate(lines) if "ui.locator('.setup-step').count()" in l)
  lines[idx]=""" for(const id of ['tab-resize','tab-videos','tab-settings'])assert.equal(await ui.locator('#'+id).evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');check('All three desktop tabs use the shared white-background exception');assert.equal(await ui.locator('#brand-mark').getAttribute('data-icon'),'settings');assert.equal(await ui.locator('#brand-mark img').count(),0);assert.equal(await ui.locator('.setup-step').count(),2);assert.equal(await ui.locator('#setup-step-1').getAttribute('aria-current'),'step');check('Functional header icons are restored and only the first of two cards starts highlighted');assert.equal(await ui.locator('#browser-choices').evaluate(n=>n.closest('section').id),'setup-step-1');assert(!fs.existsSync(path.join(home,'test-data/browser-setup.json')));await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-选择浏览器-0.18.3.png')});await ui.locator('#browser-edge').click();await until(()=>ui.locator('#browser-pair').textContent().then(t=>t.includes('点击取消')));assert.equal(await ui.locator('#setup-step-2').getAttribute('aria-current'),'step');assert.equal(await ui.locator('#browser-open').count(),0);assert.equal(await ui.locator('#browser-setup-status').textContent(),'');const plan=JSON.parse(fs.readFileSync(path.join(home,'test-data/browser-setup.json')));assert.equal(plan.clipboardURL,'edge://extensions/');assert(plan.clipboardSimulated);await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-两步配对-0.18.3.png')});check('Choosing a browser records one open/copy request and activates cancellable step 2');await ui.locator('#browser-pair').click();await until(()=>ui.locator('#browser-chrome').isEnabled());"""
  s='\n'.join(lines)+'\n';s=s.replace("assert(await ui.locator('#panel-move').isVisible());","assert.equal(await ui.locator('#panel-move').count(),0);").replace("ui.locator('#panel-move').focus()","ui.locator('#drag-handle').focus()")
  s=s.replace("chrome.permissions.request=async()=>true;chrome.permissions.contains=async()=>true;","chrome.permissions.request=async()=>true;chrome.permissions.contains=async()=>true;chrome.tabs.remove=async()=>document.getElementById('pair-success').close();")
 if 'verify-portable' in name:
  s=s.replace("assert.equal(await panel.evaluate(()=>setupRequests),0)","assert.equal(await panel.evaluate(()=>setupRequests),0)")
  # The old extra expansion click no longer exists; do not issue a second Chrome request.
  s=s.replace("assert.equal(await panel.evaluate(()=>setupRequests),1);assert.equal(await panel.evaluate(()=>setupRequests),1);", "assert.equal(await panel.evaluate(()=>setupRequests),1);")
 if 'verify-onboarding' in name:
  s=s.replace("assert(!await ui.locator('#browser-choices').isVisible());","assert(await ui.locator('#browser-choices').isVisible());")
  s=s.replace("await ui.locator('#browser-edge').click();","await ui.locator('#browser-pair').click();await until(()=>ui.locator('#browser-edge').isEnabled());await ui.locator('#browser-edge').click();",1)
  s=s.replace("await setup.locator('#success-close').click();", "await setup.evaluate(()=>{chrome.tabs.remove=async()=>document.getElementById('pair-success').close();});await setup.locator('#success-close').click();",1)
 p.write_text(s,encoding='utf-8')
p=root/'work/native-video/verify.cjs';s=p.read_text(encoding='utf-8').replace("['move', 'video-next', 'quiet', 'video-close']","['quiet', 'move', 'video-next', 'video-close']").replace("await controls.locator('#close').click();","await page.locator('#video-close').click();")
p.write_text(s,encoding='utf-8')
p=root/'work/panel-desktop/verify.cjs';s=p.read_text(encoding='utf-8').replace("check('Native panel starts the existing video player directly with real decoding');", "check('Native panel starts the existing video player directly with real decoding');await worker.evaluate(()=>openDesktopPanel());await until(()=>JSON.parse(fs.readFileSync(path.join(home,'test-data/panel-lifecycle.json'))).nativeVisible);")
p.write_text(s,encoding='utf-8')
p=root/'work/software-main/run-final-0182.py';s=p.read_text(encoding='utf-8').replace('0182','0183').replace('0.18.2','0.18.3');s=s.replace("commands=[","commands=[\n ['node','work/software-main/verify-cycle.cjs'],",1);(p.parent/'run-final-0183.py').write_text(s,encoding='utf-8')
