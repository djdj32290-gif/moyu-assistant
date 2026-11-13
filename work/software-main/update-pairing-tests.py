from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'work/software-main/verify-portable.cjs'
text=p.read_text(encoding='utf-8').replace('0.17.2','0.17.3')
text=text.replace("'--no-first-run','--disable-background-networking'","'--enable-unsafe-extension-debugging','--no-first-run','--disable-background-networking'")
text=text.replace("await until(()=>ui.locator('#portable-status').textContent().then(t=>t.includes('测试模式')));", "await until(()=>fs.existsSync(path.join(home,'test-data/portable-registration.json')));assert(!await ui.locator('#portable-status').isVisible());assert(await ui.locator('#browser-pair').isVisible());assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'false');assert.equal(await ui.locator('#portable-prepare').count(),0);")
text=text.replace("registration(id);await setup.locator('#pair').click();", """await worker.evaluate(()=>nativeDisconnect());registration(id);
 await setup.locator('#pair').click();await until(()=>setup.locator('#setup-status').textContent().then(t=>t.includes('请先打开 EXE')));assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'false');check('Web pairing refuses to bypass the EXE pairing state and keeps both lights red');
 const actionPage=await context.newPage();await actionPage.goto('about:blank');const cdp=await context.browser().newBrowserCDPSession();
 async function toolbar(){const targets=await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});const target=targets.targetInfos.find(t=>t.url===actionPage.url());await cdp.send('Extensions.triggerAction',{id,targetId:target.targetId});}
 await setup.close();await toolbar();setup=await setupPage(id);await toolbar();await sleep(300);assert.equal(context.pages().filter(p=>p.url().endsWith('/setup.html')).length,1);assert(!await worker.evaluate(()=>desktopReady));check('Actual red toolbar clicks open or focus one pairing webpage without connecting or launching another EXE');
 await ui.locator('#browser-pair').click();assert.match(await ui.locator('#pairing-status').textContent(),/已进入配对状态/);assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'false');assert(await worker.evaluate(async()=>(await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'hello'})).pairingWaiting));check('EXE pairing button starts a live ten-minute waiting state while the light remains red');
 await setup.locator('#pair').click();""")
text=text.replace("check('Actual native handshake plus cache acknowledgement unlocks both tabs and commits a green-dot icon through the Chrome API');", """assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'true');assert.equal(await setup.locator('#setup-light').getAttribute('data-connected'),'true');check('Actual native handshake plus cache acknowledgement turns EXE, pairing webpage and toolbar green and unlocks both tabs');
 await toolbar();await sleep(500);assert(await worker.evaluate(()=>desktopReady));assert.equal(fs.readdirSync(path.join(home,'test-data')).filter(n=>/^panel-[a-f0-9]+\\.json$/.test(n)).length,1);check('Actual green toolbar click focuses the existing singleton without opening a pairing page or disconnecting');
 const reject=path.join(home,'test-data/reject-panel-open');fs.writeFileSync(reject,'test-only');const failed=await worker.evaluate(async()=>{try{await openDesktopPanel();return '';}catch(e){return e.message;}});assert.match(failed,/连接已保留/);await sleep(1200);assert(await worker.evaluate(()=>desktopReady&&(!!panelPort)));assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'true');assert.equal((await worker.evaluate(()=>nativeLink())).connected,true);check('Injected pipe access denial returns an explicit focus error while actual native communication, data access and green status survive');fs.unlinkSync(reject);await worker.evaluate(()=>openDesktopPanel());check('Focus retry succeeds on the same connection after the denied request');""")
text=text.replace("await ui.locator('#native-toggle').click();", "await ui.locator('summary').filter({hasText:'连接维护'}).click();await ui.locator('#native-toggle').click();")
text=text.replace("await setup.locator('#help summary').click();await until(()=>setup.locator('#pair').isVisible());await setup.locator('#pair').click();", "await setup.locator('#help summary').click();await until(()=>setup.locator('#pair').isVisible());await ui.locator('#browser-pair').click();await setup.locator('#pair').click();")
text=text.replace("registration(nextId);await setup.locator('#pair').click();", "await worker.evaluate(()=>nativeDisconnect());registration(nextId);await ui.locator('#browser-pair').click();await setup.locator('#pair').click();")
text=text.replace("await ui.locator('#native-uninstall').click();", "await ui.locator('summary').filter({hasText:'连接维护'}).click();await ui.locator('#native-uninstall').click();")
text=text.replace("assert.equal(target.url,'chrome://extensions/');", "assert.equal(target.url,'chrome://extensions/');")
text=text.replace("assert.equal(plan.url,'chrome://extensions/');", "assert.equal(plan.url,'chrome://extensions/');assert.equal(plan.browserArguments,'--new-window \\\"chrome://extensions/\\\"');")
text=text.replace("portable-verification.json","pairing-verification.json")
p.write_text(text,encoding='utf-8')

# The panel regression must first establish a connection: red icon clicks now
# deliberately open preparation instead of initiating native connection.
p=root/'work/panel-desktop/verify.cjs'
text=p.read_text(encoding='utf-8').replace("await page.bringToFront();const targets=", "await worker.evaluate(()=>desktopConnect());await page.bringToFront();const targets=")
p.write_text(text,encoding='utf-8')
