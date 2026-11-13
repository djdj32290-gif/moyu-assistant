from pathlib import Path
root=Path(__file__).resolve().parents[2]
for name in ['src/desktop/使用说明.md','src/desktop/安装包说明.md','src/使用说明.md','src/安装说明.html','src/desktop/这个文件夹是什么.md']:
    p=root/name
    text=p.read_text(encoding='utf-8').replace('0.17.3','0.17.4')
    text=text.replace('点击“安装浏览器插件”，请求打开 Chrome 并在文件夹中选中随软件附带的插件；需要时可改用 Edge 入口。','点击“① 安装浏览器插件”只展开下方“谷歌浏览器 / Edge”；选定浏览器后才打开浏览器并选中插件文件夹，不再重复打开目录。')
    text=text.replace('在 EXE 点“配对浏览器插件”，显示进入配对状态（有效 10 分钟）；','在 EXE 点“② 配对浏览器插件”，按钮变为“② 配对中…”（有效 10 分钟）；')
    text=text.replace('通信和资料同步完成后，软件、配对网页及插件图标都亮绿灯；','通信、资料同步和主面板确认均完成后，软件、配对网页及插件图标才亮绿灯；登记失败会在 EXE 第②步下方显示原因，')
    text=text.replace('软件点“安装浏览器插件”，打开 Chrome 和插件目录；','软件点“① 安装浏览器插件”，下方选谷歌浏览器或 Edge 后打开浏览器与插件目录；')
    text=text.replace('点击“安装浏览器插件”打开浏览器及插件目录。','点击“① 安装浏览器插件”展开浏览器选项，选择后才打开浏览器及插件目录。')
    p.write_text(text,encoding='utf-8')

for name in ['work/software-main/verify-portable.cjs','work/software-main/verify-onboarding.cjs']:
    p=root/name
    text=p.read_text(encoding='utf-8').replace('0.17.3','0.17.4')
    p.write_text(text,encoding='utf-8')

p=root/'work/software-main/verify-portable.cjs'
text=p.read_text(encoding='utf-8')
text=text.replace('function registration(id){','function registration(id,targetExe=exe){').replace("path:exe,type:'stdio',allowed_origins:['chrome-extension://'+id+'/']","path:targetExe,type:'stdio',allowed_origins:['chrome-extension://'+id+'/']")
text=text.replace("await ui.locator('#browser-install').click();await until(()=>fs.existsSync(path.join(home,'test-data/browser-setup.json')));", """assert.equal(await ui.locator('#browser-install').textContent(),'① 安装浏览器插件');assert.equal(await ui.locator('#browser-pair').textContent(),'② 配对浏览器插件');assert(!(await ui.locator('#browser-setup').innerText()).includes('安装插件后，先在这里进入配对状态'));
 await panel.evaluate(()=>{const rpc=PointResizeDesktop.rpc;globalThis.setupRequests=0;PointResizeDesktop.rpc=(method,args)=>{if(method==='browser-setup')setupRequests++;return rpc(method,args);};});
 await ui.locator('#browser-install').click();assert(await ui.locator('#browser-chrome').isVisible());assert.equal(await panel.evaluate(()=>setupRequests),0);assert(!fs.existsSync(path.join(home,'test-data/browser-setup.json')));check('Step ① only reveals Google Chrome and Edge directly below it, removes the rejected paragraph and does not open a folder');
 await ui.locator('#browser-chrome').click();await until(()=>fs.existsSync(path.join(home,'test-data/browser-setup.json')));assert.equal(await panel.evaluate(()=>setupRequests),1);await ui.locator('#browser-install').click();assert.equal(await panel.evaluate(()=>setupRequests),1);""")
text=text.replace("check('One Install plugin click requests Chrome extension management and selects the shipped folder with no browser-choice step');","check('Selecting Google Chrome makes exactly one native browser/folder request; expanding step ① again never duplicates it');")
text=text.replace("check('Web pairing refuses to bypass the EXE pairing state and keeps both lights red');", """check('Web pairing refuses to bypass the EXE pairing state and keeps both lights red');
 const oldExe=path.join(root,'work/software-main/onboarding-1794464415541/helper/PointResizeVideo.exe');assert(fs.existsSync(oldExe));registration(id,oldExe);const stale=await worker.evaluate(()=>nativePair());assert.equal(stale.connected,false);assert.equal(stale.connectUrl,'pointresize-video://connect?extension='+id);assert.equal((await worker.evaluate(()=>nativeLink())).enabled,false);registration(id);check('A real old 0.17.2 native host triggers protocol repair instead of incorrectly rejecting the new EXE waiting state');""")
text=text.replace("check('EXE pairing button starts a live ten-minute waiting state while the light remains red');", """assert.equal(await ui.locator('#browser-pair').textContent(),'② 配对中…');assert(await ui.locator('#browser-pair').isDisabled());assert.equal(await ui.locator('#browser-pair').getAttribute('aria-busy'),'true');check('Step ② remains Pairing with an accessible busy state and a live heartbeat while waiting');
 const bad=cp.spawnSync(exe,['--connect','pointresize-video-test://connect?extension=invalid'],{env,cwd:home,windowsHide:true});assert.equal(bad.status,1);await until(()=>ui.locator('#pairing-status').textContent().then(t=>t.includes('扩展 ID 无效')));await until(()=>ui.locator('#browser-pair').isEnabled());assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'false');check('An actual --connect callback failure reports its concrete error back in the EXE and releases the waiting button');
 await ui.locator('#browser-pair').click();await until(()=>ui.locator('#pairing-status').textContent().then(t=>t.includes('已进入配对状态')));const callback=cp.spawnSync(exe,['--connect','pointresize-video-test://connect?extension='+id],{env,cwd:home,windowsHide:true});assert.equal(callback.status,0);const callbackPlan=JSON.parse(fs.readFileSync(path.join(home,'test-data/connect-callback.json')));assert.equal(callbackPlan.extensionId,id);assert(callbackPlan.simulated);await until(()=>ui.locator('#pairing-status').textContent().then(t=>t.includes('已收到插件身份')));assert.equal(await ui.locator('#connection-light').getAttribute('data-connected'),'false');assert.equal((await worker.evaluate(()=>nativeRequest({type:'VIDEO_NATIVE_LINK_STATUS'},{id:chrome.runtime.id}))).connected,false);check('A fresh EXE callback validates the live invitation across processes and records registration without claiming connected before the handshake');""")
text=text.replace("await setup.locator('#help summary').click();await until(()=>setup.locator('#pair').isVisible());await ui.locator('#browser-pair').click();await setup.locator('#pair').click();", """await setup.locator('#help summary').click();await until(()=>setup.locator('#pair').isVisible());await ui.locator('#browser-pair').click();await until(()=>ui.locator('#browser-pair').textContent().then(t=>t.includes('配对中')));const rejectCheck=path.join(home,'test-data/reject-pair-check');fs.writeFileSync(rejectCheck,'test-only');const beforeGreen=await worker.evaluate(()=>iconCalls.filter(row=>row.pixel[0]===35).length);await setup.locator('#pair').click();await until(()=>setup.locator('#setup-status').textContent().then(t=>t.includes('EXE 主面板未确认')));await until(()=>ui.locator('#pairing-status').textContent().then(t=>t.includes('EXE 主面板未确认')));assert.equal(await setup.locator('#setup-light').getAttribute('data-connected'),'false');assert.equal((await worker.evaluate(()=>nativeRequest({type:'VIDEO_NATIVE_LINK_STATUS'},{id:chrome.runtime.id}))).connected,false);assert.equal(await worker.evaluate(()=>iconCalls.filter(row=>row.pixel[0]===35).length),beforeGreen);await until(()=>ui.locator('#browser-pair').isEnabled());check('Missing main-panel confirmation stays red in both UIs and toolbar, preserves the actual error and never mistakes transport readiness for pairing');fs.unlinkSync(rejectCheck);await ui.locator('#browser-pair').click();await until(()=>ui.locator('#browser-pair').textContent().then(t=>t.includes('配对中')));await setup.locator('#pair').click();""")
text=text.replace("A plugin loaded from the new path pairs using its new real ID", "A plugin loaded from the new path pairs using its new real ID")
p.write_text(text,encoding='utf-8')

p=root/'work/native-video/verify.cjs'
text=p.read_text(encoding='utf-8').replace("if (prepare.status !== 0 || connect.status !== 0) {","if (prepare.status !== 0 || connect.status !== 0 || fs.existsSync(path.join(home,'test-data/connect-callback.json'))) {")
text=text.replace("Helper under project inherits a Low mandatory integrity label, so self-registration remains blocked. Dedicated test registration is used only for Native Messaging and media checks. This does not verify the new MSI installation, first real connection, rollback or uninstall.","Test-mode protocol callback records registration only; production preparation remains subject to the inherited integrity context. Actual Native Messaging uses a dedicated fixture. No real first registration, install, rollback or uninstall is verified.")
p.write_text(text,encoding='utf-8')

runner=root/'work/software-main/run-final-0173.py'
target=runner.with_name('run-final-0174.py')
target.write_text(runner.read_text(encoding='utf-8').replace('0173','0174').replace('0.17.3','0.17.4'),encoding='utf-8')

with (root/'AGENTS.md').open('a',encoding='utf-8') as f:
    f.write('\n- 按用户最新要求，0.17.4 设置去掉“安装插件后，先在这里进入配对状态，再到浏览器完成配对”段落；“① 安装浏览器插件”只展开按钮下方谷歌浏览器/Edge，选择后才发出一次浏览器与目录打开请求，避免主按钮和浏览器按钮各打开一次。“② 配对浏览器插件”等待时保持“② 配对中…”及 aria-busy，成功、失败或超时再退出等待。配对等待用本目录的原子状态文件及主面板心跳确认，不依赖外部启动进程读取主面板的进程启动时间；10 分钟期限、关闭取消保留。实际协议回调的登记成功/失败按尝试 ID 回传 EXE，不能只写日志而让界面无反应。旧宿主版本指向其他目录时允许用户通过现有协议重登记；必须同时完成资料同步与主面板确认才标记新配对成功，LINK_STATUS 不得只依据通信端口就绪冒充成功。测试模式的 --connect 只登记计划与本目录专用文件，不写日常注册表；生产上下文检查和管道安全边界不改变。\n')
