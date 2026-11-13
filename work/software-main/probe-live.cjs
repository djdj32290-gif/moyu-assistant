const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),run=path.join(__dirname,'live-probe-'+Date.now());fs.mkdirSync(path.join(run,'temp'),{recursive:true});
const env={...process.env,TEMP:path.join(run,'temp'),TMP:path.join(run,'temp')},sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;const report=[];
const safe=u=>{try{const x=new URL(u);return x.protocol==='blob:'?'blob:':x.origin+x.pathname;}catch{return String(u).slice(0,100);}};
(async()=>{try{
 browser=await chromium.launchPersistentContext(path.join(run,'browser'),{executablePath:'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',env,headless:false,viewport:{width:1280,height:850},args:['--no-first-run','--disable-background-networking']});
 for(const url of ['https://www.huya.com/lpl','https://liveshare.huya.com/iframe/lpl','https://open.douyu.com/tvmir?rid=9999']){
  const page=await browser.newPage(),requests=[],failures=[];page.on('response',r=>{if(/m3u8|\.flv|\.m4s|\.ts(?:\?|$)/i.test(r.url()))requests.push({url:safe(r.url()),status:r.status()});});page.on('requestfailed',r=>failures.push({url:safe(r.url()),error:r.failure()?.errorText}));
  const row={url};try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});row.status=response?.status();await sleep(10000);row.finalURL=page.url();row.title=await page.title();row.body=(await page.locator('body').innerText()).slice(0,800);row.frames=page.frames().map(f=>safe(f.url()));
   row.media=[];for(const frame of page.frames()){try{for(const v of await frame.locator('video').all()){const state=await v.evaluate(v=>({source:v.currentSrc||v.src,paused:v.paused,ready:v.readyState,width:v.videoWidth,height:v.videoHeight,time:v.currentTime,duration:String(v.duration)}));state.source=safe(state.source);row.media.push(state);}}catch{}}
   row.embedHints=(await page.content()).match(/.{0,70}(?:liveshare\.huya\.com|tvmir|iframe.{0,12}src=).{0,130}/g)?.slice(0,8)||[];await page.screenshot({path:path.join(run,'page-'+report.length+'.png')});
  }catch(e){row.error=e.message;}row.mediaRequests=requests.slice(-10);row.failures=failures.slice(-8);report.push(row);console.log(JSON.stringify(row));await page.close();
 }
}finally{if(browser)await browser.close();fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(report,null,2));console.log('Saved',run);}})().catch(e=>{console.error(e);process.exitCode=1;});
