const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
process.env.TEMP=process.env.TMP=path.join(__dirname,'temp');fs.mkdirSync(process.env.TEMP,{recursive:true});
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),src=path.join(root,'src'),report=[];
function check(name,details){report.push({name,details});console.log('PASS',name,JSON.stringify(details||''))}
(async()=>{
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 res.setHeader('Content-Type','text/html; charset=utf-8');
 if(url.pathname==='/strict')res.setHeader('Content-Security-Policy',"default-src 'self'; frame-src 'self'; style-src 'self'; script-src 'self'");
 res.end('<!doctype html><html><head><meta charset="utf-8"><title>原网页</title></head><body><h1>工作网页</h1><p>点击面板里的播放后，此网页及地址都应保留。</p></body></html>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const ext=path.join(__dirname,'extension');fs.cpSync(src,ext,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json')));manifest.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(ext,'manifest.json'),JSON.stringify(manifest));
let context;
try{
context=await chromium.launchPersistentContext(path.join(__dirname,'profile-'+Date.now()),{headless:true,viewport:{width:1440,height:1000},executablePath:'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
const original=page.url();
await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url});await openForTab(tabs[0].id)},original);
const ui=page.locator('#point-resize-ui');await ui.locator('#tab-videos').click();
assert.equal(await ui.locator('#vq-room').count(),0);assert.equal(await ui.getByRole('button',{name:'开启跨应用小窗',exact:true}).count(),0);
for(const code of ['BV1GJ411x7h7','BV1xx411c7mD']){
 await ui.locator('#vq-url').fill('https://www.bilibili.com/video/'+code);await ui.locator('#vq-form').evaluate(f=>f.requestSubmit());await page.waitForTimeout(100);
}
const sourceWindow=await worker.evaluate(url=>chrome.tabs.query({url}).then(tabs=>tabs[0].windowId),original);
const tabsBefore=await worker.evaluate(windowId=>chrome.tabs.query({windowId}).then(tabs=>tabs.map(t=>t.id)),sourceWindow);
const pagesBefore=context.pages().length;
await ui.locator('.vq-row').last().getByRole('button',{name:'播放',exact:true}).click();
await page.waitForTimeout(500);
const pip=context.pages().at(-1);
if(pip===page||context.pages().length===pagesBefore){throw Error('No PiP window: '+await ui.locator('#vq-status').textContent())}
pip.on('pageerror',e=>errors.push(e.message));await pip.setViewportSize({width:480,height:370});
assert.equal(page.url(),original);
console.log('WINDOWS',await worker.evaluate(()=>chrome.windows.getAll({populate:true}).then(windows=>windows.map(w=>({id:w.id,type:w.type,alwaysOnTop:w.alwaysOnTop,tabs:w.tabs.map(t=>({id:t.id,url:t.url}))})))));
assert.deepEqual(await worker.evaluate(windowId=>chrome.tabs.query({windowId}).then(tabs=>tabs.map(t=>t.id)),sourceWindow),tabsBefore);
assert.equal(context.pages().some(p=>p.url().includes('watchroom.html')),false);
check('One Play click opens PiP; original URL and ordinary tab count unchanged');
await pip.locator('iframe').waitFor();await pip.waitForTimeout(8000);
const frame=pip.frames().find(f=>f.url().includes('player.bilibili.com/player.html'));
assert.ok(frame,'official player frame exists');
const playback=await frame.locator('video').evaluateAll(videos=>videos.map(v=>({time:v.currentTime,paused:v.paused,readyState:v.readyState,width:v.videoWidth,height:v.videoHeight})));
assert.ok(playback.some(v=>v.time>0&&v.width>0&&v.readyState>=2));check('Logged-out real video plays inside directly opened PiP',playback);
await pip.screenshot({path:path.join(root,'outputs/直接播放小窗验证.png')});
const other=await context.newPage();await other.goto(`http://127.0.0.1:${server.address().port}/another`);await other.bringToFront();
assert.equal(await pip.locator('iframe').isVisible(),true);check('PiP remains open after switching to another page');
await page.bringToFront();await ui.locator('.vq-row').first().getByRole('button',{name:'播放',exact:true}).click();
assert.equal(pip.isClosed(),false);assert.ok((await pip.locator('iframe').getAttribute('src')).includes('BV1xx411c7mD'));check('Choosing another item reuses same PiP window');
await pip.locator('#vp-list').click();await pip.setViewportSize({width:480,height:620});
assert.equal(await pip.locator('#vp-queue').isVisible(),true);assert.equal(await pip.locator('.vq-row').count(),2);
const previous=await pip.locator('iframe').getAttribute('src');await pip.locator('#vp-next').click();assert.notEqual(await pip.locator('iframe').getAttribute('src'),previous);
await pip.waitForTimeout(5000);
check('Expand queue and switch video entirely in the small window');
await pip.screenshot({path:path.join(root,'outputs/直接播放小窗列表验证.png')});
await pip.locator('#vp-close').click();await page.waitForTimeout(100);assert.equal(pip.isClosed(),true);
assert.deepEqual(await worker.evaluate(()=>chrome.tabs.query({}).then(tabs=>tabs.map(t=>t.id))),[...tabsBefore,...(await worker.evaluate(url=>chrome.tabs.query({url}).then(t=>t.map(v=>v.id)),other.url()))]);
check('Close releases small window without navigating or opening a page');
await ui.locator('.vq-row').first().getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(100);
const reopened=context.pages().at(-1);assert.notEqual(reopened,page);assert.equal(reopened.isClosed(),false);await reopened.close();check('A later Play click reopens directly');
assert.deepEqual(errors,[]);check('No uncaught errors in source or small window');
// Exercise inherited site restrictions separately; never substitute an ordinary new tab.
await page.goto(`http://127.0.0.1:${server.address().port}/strict`);await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url});await openForTab(tabs[0].id)},page.url());
await ui.locator('#tab-videos').click();await ui.locator('.vq-row').first().getByRole('button',{name:'播放',exact:true}).click();await page.waitForTimeout(400);
const strictPip=context.pages().at(-1);
if(strictPip!==page&&strictPip!==other){await strictPip.waitForTimeout(5000);const f=strictPip.frames().find(f=>f.url().includes('player.bilibili.com'));assert.ok(f);assert.equal(await f.locator('video').count(),1);check('Direct player also loads on source page with restrictive CSP');await strictPip.close()}
}finally{fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({timestamp:new Date().toISOString(),report},null,2));if(context)await context.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
