from pathlib import Path
p=Path(__file__).with_name('verify.cjs');s=p.read_text(encoding='utf-8')
s=s.replace("const launchBrowser=async(profile='browser')=>{const context=", "const launchBrowser=async(profile='browser')=>{const fresh=!fs.existsSync(path.join(run,profile,'Local State'));const context=")
s=s.replace("await sleep(600);for(const preparation of context.pages())", "if(fresh)await until(()=>context.pages().some(p=>p.url().endsWith('/setup.html')));for(const preparation of context.pages())")
s=s.replace("await page2.goto(base+'/b');await worker2.evaluate(async()=>{await desktopConnect();const [tab]=await chrome.tabs.query({active:true,currentWindow:true});await openDesktopPanel(tab);});", "await page2.goto(base+'/b');await page2.bringToFront();await worker2.evaluate(async url=>{await desktopConnect();const [tab]=await chrome.tabs.query({url});await chrome.tabs.update(tab.id,{active:true});await openDesktopPanel(tab);},base+'/b');")
p.write_text(s,encoding='utf-8')
