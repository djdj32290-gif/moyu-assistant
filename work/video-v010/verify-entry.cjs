const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
process.env.TEMP=process.env.TMP=path.join(__dirname,'temp');
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const root=path.resolve(__dirname,'../..'), ext=path.join(__dirname,'entry-extension');fs.cpSync(path.join(root,'src'),ext,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json')));manifest.host_permissions=['https://www.bilibili.com/*','http://127.0.0.1/*'];fs.writeFileSync(path.join(ext,'manifest.json'),JSON.stringify(manifest));
const server=http.createServer((req,res)=>res.end('<html><body><h1>Another website</h1></body></html>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
let context;
try{
context=await chromium.launchPersistentContext(path.join(__dirname,'entry-profile-'+Date.now()),{headless:true,executablePath:'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
const page=await context.newPage();await page.route('https://www.bilibili.com/video/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<html><head><meta property="og:title" content="未登录视频收藏测试_哔哩哔哩_bilibili"><meta property="og:image" content="https://i0.hdslb.com/test.jpg"></head><body><h1>测试标题</h1></body></html>'}));
await page.goto('https://www.bilibili.com/video/BV1GJ411x7h7');
async function open(url){return worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url});await openForTab(tabs[0].id);},url)}
await open(page.url());const ui=page.locator('#point-resize-ui');await ui.locator('#tab-videos').click();await ui.locator('#vq-current').click();await page.waitForTimeout(80);
assert.equal(await ui.locator('.vq-title').textContent(),'未登录视频收藏测试');console.log('PASS Real content-script current-video collection includes title');
await page.reload();await open(page.url());await ui.locator('#tab-videos').click();assert.equal(await ui.locator('.vq-row').count(),1);console.log('PASS Reopen after page reload with current dynamic script registrations');
const other=await context.newPage();await other.goto(`http://127.0.0.1:${server.address().port}`);await open(other.url());const otherUI=other.locator('#point-resize-ui');await otherUI.locator('#tab-videos').click();assert.equal(await otherUI.locator('.vq-title').textContent(),'未登录视频收藏测试');console.log('PASS One global video queue is available on another website');
const before=context.pages().length;await otherUI.locator('#vq-room').click();await other.waitForTimeout(200);
const room=context.pages().find(p=>p.url().includes('watchroom.html'));assert.ok(room);assert.equal(context.pages().length,before+1);await room.locator('.vq-row').waitFor();
const result=await room.evaluate(()=>chrome.runtime.sendMessage({type:'VIDEO_QUEUE_ROOM',id:'BV1GJ411x7h7:1'}));assert.equal(result.ok,true);await room.waitForTimeout(200);assert.equal(context.pages().length,before+1);assert.equal(new URL(room.url()).hash,'#BV1GJ411x7h7%3A1');console.log('PASS Player entry opens once, reuses existing tab and selects saved item');
const concurrent=await room.evaluate(()=>Promise.all(Array.from({length:5},(_,i)=>chrome.runtime.sendMessage({type:'VIDEO_QUEUE_ADD',item:{url:'https://www.bilibili.com/video/av'+(100+i)}}))));assert.ok(concurrent.every(r=>r.ok));await room.waitForTimeout(100);assert.equal(await room.locator('.vq-row').count(),6);console.log('PASS Concurrent service-worker writes retain all items');
}finally{if(context)await context.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
