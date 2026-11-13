const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),run=path.join(__dirname,'tencent-probe-'+Date.now());fs.mkdirSync(path.join(run,'temp'),{recursive:true});
(async()=>{let context;const results=[];try{
context=await chromium.launchPersistentContext(path.join(run,'browser'),{executablePath:'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:false,viewport:{width:1100,height:800},env:{...process.env,TEMP:path.join(run,'temp'),TMP:path.join(run,'temp')},args:['--no-first-run','--disable-background-networking']});
for(const url of ['https://v.qq.com/x/cover/mzc00200vyot3cs/z41002y9k0w.html','https://v.qq.com/txp/iframe/player.html?vid=z41002y9k0w']){
 const page=await context.newPage(),record={url,errors:[]};page.on('pageerror',e=>record.errors.push(e.message));
 try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});record.status=response?.status();await page.waitForTimeout(8000);record.title=await page.title();record.body=(await page.locator('body').innerText()).slice(0,1800);record.media=await page.evaluate(()=>[...document.querySelectorAll('video')].map(v=>({ready:v.readyState,width:v.videoWidth,time:v.currentTime,paused:v.paused,sourceKind:v.src.startsWith('blob:')?'blob':v.src?'http-or-other':'empty'})));record.frames=page.frames().map(f=>f.url());await page.screenshot({path:path.join(run,results.length+'-page.png')});}catch(e){record.failure=e.message;}
 results.push(record);console.log(JSON.stringify(record));await page.close();
}
}finally{await context?.close();fs.writeFileSync(path.join(__dirname,'tencent-probe-0187.json'),JSON.stringify({run,results,scope:'Fresh isolated Chromium profile; no login or cookies read; no native playback support claimed'},null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
