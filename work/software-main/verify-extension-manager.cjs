const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const {chromium}=require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const run=path.join(__dirname,'manager-'+Date.now()),profile=path.join(run,'browser'),temp=path.join(run,'temp');fs.mkdirSync(temp,{recursive:true});
const exe='C:/Program Files/Google/Chrome/Application/chrome.exe',args=['--user-data-dir='+profile,'--remote-debugging-port=9468','--no-first-run','--no-default-browser-check','--disable-background-networking','--new-window','chrome://extensions/'];
let browser,child;const checks=[],errors=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 child=cp.spawn(exe,args,{env:{...process.env,TEMP:temp,TMP:temp},windowsHide:true});
 const end=Date.now()+20000;while(!browser&&Date.now()<end){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9468');}catch{await sleep(100);}}
 assert(browser,'isolated Chrome did not start');await sleep(2500);
 assert(!browser.contexts().flatMap(c=>c.pages()).some(p=>p.url()==='chrome://extensions/'));
 checks.push('Real Chrome filters the internal URL supplied at external startup; starting Chrome cannot count as opening the extension manager');
 const page=await browser.contexts()[0].newPage();await page.goto('chrome://extensions/');await page.locator('extensions-manager').waitFor();
 checks.push('Explicit address navigation in the isolated test browser reaches the extension manager; this is not the software startup result');
 await page.screenshot({path:path.resolve(__dirname,'../../outputs/Chrome扩展管理页-0.17.4.png')});
 const session=await browser.newBrowserCDPSession();await session.send('Browser.close');browser=null;
 checks.push('Only the dedicated browser is closed; no existing browser profile is read or changed');
}catch(e){errors.push(e.stack);process.exitCode=1;}finally{if(browser)try{await (await browser.newBrowserCDPSession()).send('Browser.close');}catch{}fs.writeFileSync(path.join(__dirname,'extension-manager-verification.json'),JSON.stringify({version:'0.17.4',run,exe,args,checks,errors,scope:'Real installed Chrome, separate new D-drive profile and temporary directory. Explorer folder selection and extension folder drag are not tested; no existing browser profile is accessed.'},null,2));for(const check of checks)console.log('PASS',check);for(const error of errors)console.error(error);}})();
