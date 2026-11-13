const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), src = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks = [], check = name => { checks.push(name); console.log('PASS', name); };
const fixture = `<!doctype html><meta charset="utf-8"><title>过滤临时视频流</title><style>body{margin:24px;font:16px sans-serif}main{width:600px}.card{position:relative;padding:16px;margin:16px 0;background:#edf4f1}video{width:320px;height:100px}.cover{position:absolute;inset:16px 16px 45px}a{display:block}</style><main>
<section class="card" id="mixed"><video id="blob" muted></video><div class="cover" id="mixed-cover"></div><a href="https://www.bilibili.com/video/av123">同一视频的 B 站链接</a></section>
<section class="card" id="only"><video id="only-blob" muted></video><div class="cover" id="only-cover"></div><span>仅有临时流</span></section>
<section class="card"><video id="object" src="/clip.webm" muted></video><div class="cover" id="object-cover"></div><span>srcObject 比旧 src 优先</span></section>
<section class="card"><video id="empty" muted></video><div class="cover" id="empty-cover"></div><span>无持久来源</span></section>
<section class="card"><video id="direct" muted><source src="/clip.webm" type="video/webm"></video><div class="cover" id="direct-cover"></div><span>有效直链来源</span></section><div id="shadow"></div></main>`;
(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/clip.webm') { res.setHeader('Content-Type', 'video/webm'); return res.end(fs.readFileSync(path.join(root, 'work/video-web/sample.webm'))); }
    if (url.pathname === '/fixture' || url.pathname === '/demo') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fixture + (url.pathname === '/demo' ? ['demo-boot.js', 'picker.js', 'video-common.js', 'backup.js', 'video-page.js', 'video-player.js', 'panel.js', 'content.js', 'demo-start.js'].map(name => `<script src="/${name}"></script>`).join('').replace('<script src="/demo-start.js"></script>', '') : ''));
    }
    const file = path.join(src, url.pathname); if (!file.startsWith(src + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port, key = 'point-resize:video-queue:v1';
  let context, demoContext;
  const setup = page => page.evaluate(() => {
    const blob = URL.createObjectURL(new Blob(['temporary fixture'], { type: 'video/webm' }));
    for (const id of ['blob', 'only-blob']) document.getElementById(id).src = blob;
    const canvas = document.createElement('canvas'); document.getElementById('object').srcObject = canvas.captureStream();
    const shadow = document.getElementById('shadow').attachShadow({ mode: 'open' });
    shadow.innerHTML = '<section style="padding:20px;background:#edf4f1"><span id="shadow-target">组件里的视频区域</span><video id="shadow-blob" muted></video><a href="https://www.bilibili.com/video/av456">组件链接</a></section>';
    shadow.querySelector('video').src = blob;
  });
  try {
    const extension = path.join(__dirname, 'extension-' + Date.now()); fs.cpSync(src, extension, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*']; fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    const options = { executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, viewport: { width: 1280, height: 1000 }, env: { ...process.env } };
    context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), { ...options, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension] });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'), page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/fixture'); await setup(page);
    const tabID = await worker.evaluate(async url => { const [tab] = await chrome.tabs.query({ url }); await openForTab(tab.id); return tab.id; }, page.url());
    const ui = page.locator('#point-resize-ui'), pick = ui.locator('#vq-pick'); await ui.locator('#tab-videos').click();
    const queue = () => worker.evaluate(async key => (await chrome.storage.local.get(key))[key] || [], key);
    const choose = async (selector, tag) => {
      if (await pick.getAttribute('aria-pressed') !== 'true') await pick.click();
      await page.locator(selector).hover(); await ui.locator('#vq-outline').waitFor({ state: 'visible' });
      assert.match(await ui.locator('#vq-outline .tag').textContent(), tag); await page.locator(selector).click();
      await page.waitForFunction(() => !document.querySelector('#point-resize-ui').shadowRoot.getElementById('vq-pick').disabled);
    };
    await choose('#mixed-cover', /识别到 1 个/); assert.deepEqual((await queue()).map(item => item.id), ['av123:1']);
    assert.match(await ui.locator('#vq-status').textContent(), /已加入 1 个视频，跳过 1 个临时视频流/);
    await page.screenshot({ path: path.join(root, 'outputs/临时视频流过滤验证.png') });
    check('One mixed-region click adds only the persistent Bilibili link, not its blob video; hover count is one');
    for (const selector of ['#only-cover', '#object-cover', '#empty-cover']) {
      await choose(selector, /临时视频流/); assert.equal((await queue()).length, 1); assert.equal(await pick.getAttribute('aria-pressed'), 'true'); assert.match(await ui.locator('#vq-status').textContent(), /只有临时视频流/);
    }
    await page.keyboard.press('Escape');
    check('Blob-only, active srcObject with stale HTTP src, and source-less videos are skipped without collecting neighbouring cards');
    await choose('#shadow-target', /识别到 1 个/); assert.deepEqual(new Set((await queue()).map(item => item.id)), new Set(['av123:1', 'av456:1']));
    check('Open Shadow DOM mixed region also excludes its temporary video');
    await choose('#direct-cover', /识别到 1 个/); assert.equal((await queue()).length, 3); assert.equal((await queue())[0].dependent, false);
    await ui.locator('#vq-current').click(); assert.equal((await queue()).length, 3); assert.match(await ui.locator('#vq-status').textContent(), /跳过 5 个临时视频流/);
    check('Source-based HTTP video still adds and collect-current-page skips all temporary candidates');
    const before = await queue();
    const denied = await worker.evaluate(async ({ tabID, origin }) => {
      const results = await chrome.scripting.executeScript({ target: { tabId: tabID }, func: async origin => chrome.runtime.sendMessage({ type: 'VIDEO_QUEUE_ADD', item: { kind: 'media', mediaUrl: 'blob:' + origin + '/fake', sourceUrl: origin + '/fixture', locator: { selector: '#blob' }, dependent: false } }), args: [origin] });
      return results[0].result;
    }, { tabID, origin });
    assert.equal(denied.ok, false); assert.match(denied.error, /临时视频流不会加入/); assert.deepEqual(await queue(), before);
    check('Background writer independently rejects temporary streams, even with a forged dependent:false flag');
    const preserved = await worker.evaluate(async ({ key, origin }) => {
      const data = await chrome.storage.local.get(key), legacy = PointResizeVideoData.item({ kind: 'media', mediaUrl: 'blob:' + origin + '/old', sourceUrl: origin + '/fixture', locator: { selector: '#blob' }, title: '旧临时收藏' });
      await chrome.storage.local.set({ [key]: [...data[key], legacy] }); return legacy.id;
    }, { key, origin });
    await ui.locator('#vq-current').click(); assert.ok((await queue()).some(item => item.id === preserved));
    check('Existing saved temporary entries are preserved; filtering does not silently delete user data');
    demoContext = await chromium.launchPersistentContext(path.join(__dirname, 'demo-profile-' + Date.now()), options);
    const demo = await demoContext.newPage(); await demo.goto(origin + '/demo'); await setup(demo); await demo.evaluate(() => PointResizeApp.open());
    const demoUI = demo.locator('#point-resize-ui'); await demoUI.locator('#tab-videos').click(); await demoUI.locator('#vq-pick').click(); await demo.locator('#mixed-cover').click();
    await demo.waitForFunction(() => /已加入 1 个视频，跳过 1 个临时视频流/.test(document.querySelector('#point-resize-ui').shadowRoot.getElementById('vq-status').textContent));
    assert.equal(await demo.evaluate(key => JSON.parse(localStorage.getItem(key)).length, key), 1);
    check('Standalone demo applies the same filtering before adding to local storage');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  } finally { if (demoContext) await demoContext.close(); if (context) await context.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
