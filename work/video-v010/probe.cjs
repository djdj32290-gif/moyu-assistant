const fs=require('fs'), path=require('path'), http=require('http');
process.env.TEMP=process.env.TMP=path.join(__dirname,'temp');
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const context=await chromium.launchPersistentContext(path.join(__dirname,'probe-'+Date.now()),{headless:true,executablePath:'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:[`--disable-extensions-except=${path.join(__dirname,'extension')}`,`--load-extension=${path.join(__dirname,'extension')}`]});
 try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><body><h1>Fixture</h1></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const p=await context.newPage();await p.goto(`http://127.0.0.1:${server.address().port}`);
 console.log('OPEN1',await worker.evaluate(async()=>{try{const [t]=await chrome.tabs.query({active:true});await openForTab(t.id);return 'ok';}catch(e){return e.stack}}));
 await p.reload();
 console.log('OPEN2',await worker.evaluate(async()=>{try{const [t]=await chrome.tabs.query({active:true});await openForTab(t.id);return 'ok';}catch(e){return e.stack}}));
 }finally{await new Promise(r=>server.close(r))}
 const p=await context.newPage();
 for(const code of ['BV1GJ411x7h7','BV1xx411c7mD']){
 try{await p.goto(`https://player.bilibili.com/player.html?bvid=${code}&autoplay=1&high_quality=0&danmaku=0`,{waitUntil:'domcontentloaded',timeout:20000});await p.waitForTimeout(6000);console.log('BILI',code,JSON.stringify(await p.evaluate(()=>({body:document.body.innerText.slice(0,1800),videos:[...document.querySelectorAll('video')].map(v=>({ready:v.readyState,t:v.currentTime,d:v.duration,paused:v.paused,w:v.videoWidth,h:v.videoHeight})),frames:[...document.querySelectorAll('iframe')].map(f=>f.src)}))));await p.screenshot({path:path.join(__dirname,code+'.png')});}catch(e){console.log('BILI-ERROR',code,e.message)}
 }
 }finally{await context.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
