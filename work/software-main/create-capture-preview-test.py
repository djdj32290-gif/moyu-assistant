from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'work/software-main/verify-sidebar-live.cjs';s=p.read_text(encoding='utf-8')
s=s.replace("if(req.url.startsWith('/sample.webm'))", "if(req.url.startsWith('/picture.svg')){res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"400\"><rect width=\"640\" height=\"400\" fill=\"#b3d4c3\"/><circle cx=\"320\" cy=\"200\" r=\"140\" fill=\"#376859\"/></svg>');}if(req.url.startsWith('/sample.webm'))")
marker=" await panel.evaluate(async base=>{for(const tail of ['', '?two'])"
assert marker in s;s=s.replace(marker,(root/'work/software-main/feature-checks-0185.inc').read_text(encoding='utf-8')+'\n'+marker)
marker=" const livePage=await context.newPage();"
extra="""
 const category=await context.newPage();await category.goto('https://www.huya.com/g/lol',{waitUntil:'domcontentloaded',timeout:40000});await category.bringToFront();await worker.evaluate(()=>openDesktopPanel());await until(async()=>(await panel.evaluate(()=>PointResizeDesktopUI.target?.url))==='https://www.huya.com/g/lol');await ui.locator('#tab-videos').click();const selectedRoom=await until(()=>category.evaluate(()=>{for(const a of document.querySelectorAll('a[href]')){const img=a.querySelector('img');if(!img)continue;const box=img.getBoundingClientRect();let url;try{url=new URL(a.href);}catch{continue;}if(!['www.huya.com','huya.com'].includes(url.hostname)||!/^\/[A-Za-z0-9_-]{1,80}\/?$/.test(url.pathname)||box.width<100||box.height<55||box.left<0||box.top<0||box.right>innerWidth||box.bottom>innerHeight)continue;a.dataset.captureTest='true';return {url:a.href,title:a.title,box:{x:box.x,y:box.y,width:box.width,height:box.height}};}return null;}));const expectedRoom=await worker.evaluate(url=>resolveVideoLink(url),selectedRoom.url);await ui.locator('#vq-pick').click();await category.locator('a[data-capture-test="true"] img').click();await until(()=>ui.locator('#vq-list [data-id="'+expectedRoom.id+'"]').count().then(n=>n===1));assert.equal(await ui.locator('#vq-pick').getAttribute('aria-pressed'),'true');await category.screenshot({path:path.join(root,'outputs/摸鱼助手-虎牙分区点选-0.18.5.png')});await category.keyboard.press('Escape');check('Actual user-provided Huya category page selects a visible room cover, resolves and saves its numeric identity while keeping continuous selection',{selectedRoom,expectedRoom});if(expectedRoom.id!=='huya-live:660000')await panel.evaluate(id=>chrome.runtime.sendMessage({type:'VIDEO_QUEUE_REMOVE',id}),expectedRoom.id);
"""
assert marker in s;s=s.replace(marker,extra+marker)
marker=" await controls.locator('#title-collapsed').click();"
extra=" await controls.locator('#queue-platform-huya').click();assert.equal(await controls.locator('#queue .row').count(),0);await controls.locator('#queue-platform-other').click();assert.equal(await controls.locator('#queue .row').count(),2);await controls.locator('#queue-platform-all').click();check('Native sidebar platform tabs filter the same canonical queue and retain all media');\n"
assert marker in s;s=s.replace(marker,extra+marker)
s=s.replace('sidebar-live-verification.json','capture-preview-verification.json').replace("'sidebar-live-'+Date.now()","'capture-preview-'+Date.now()")
s=s.replace("read('window.json').pid,warm.pid", "(await until(()=>read('window.json'))).pid,warm.pid")
(root/'work/software-main/verify-capture-preview.cjs').write_text(s,encoding='utf-8')
print('Created native capture/preview integration suite')
