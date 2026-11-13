const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), src = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks = [], check = (name, details) => { checks.push({ name, details }); console.log('PASS', name, JSON.stringify(details || '')); };
(async () => {
  let sample = null;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/clip.webm' || url.pathname === '/stream') {
      res.setHeader('Content-Type', 'video/webm'); res.setHeader('Accept-Ranges', 'bytes');
      const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
      if (range && sample) {
        const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), sample.length - 1) : sample.length - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${sample.length}`, 'Content-Length': end - start + 1 }); res.end(sample.subarray(start, end + 1));
      } else res.end(sample); return;
    }
    if (url.pathname === '/fixture') res.setHeader('Content-Security-Policy', "default-src 'self'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-src https://player.bilibili.com");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><meta charset="utf-8"><title>普通网页里的视频</title><style>body{margin:30px;background:#f4f7f5;color:#293c38;font:16px sans-serif}.card{position:relative;margin:20px 0;width:480px;border:1px solid #cbdad1;background:#fff;padding:12px}video{width:450px;height:220px;background:#14231e}.cover{position:absolute;inset:12px 12px 44px}iframe{width:450px;height:160px}</style>
      <main><h1>网页内视频选取测试</h1><section class="card" id="direct-card"><video id="direct" class="original-video" style="border-radius:5px" title="有 source 子元素的视频" muted loop playsinline><source src="/stream" type="video/webm"></video><div class="cover" id="direct-cover"></div><p>视频本身没有 a 链接，来源地址也没有文件后缀</p></section>
      <section class="card" id="blob-card"><video id="blob" title="网页临时视频流" muted loop></video><div class="cover" id="blob-cover"></div><p>blob 临时来源</p></section>
      <section class="card" id="embed-card"><iframe src="https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&page=2"></iframe><div class="cover" id="embed-cover"></div></section>
      <a id="direct-link" href="/clip.webm">公开 WebM 视频直链</a></main>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let context;
  try {
    const extension = path.join(__dirname, 'extension-' + Date.now()); fs.cpSync(src, extension, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*']; fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    // Explicitly exercise the retained browser compatibility path. Production
    // persistent video uses the separately verified native desktop player.
    const playerFile = path.join(extension, 'video-player.js');
    fs.writeFileSync(playerFile, fs.readFileSync(playerFile, 'utf8').replace('if (globalThis.chrome?.runtime?.id && !item.dependent)', 'if (false)'));
    context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), {
      executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, viewport: { width: 1440, height: 1100 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage(), errors = [], network = [];
    context.on('request', request => { if (request.resourceType() === 'media') network.push(['request', request.url()]); });
    context.on('response', response => { if (response.request().resourceType() === 'media') network.push(['response', response.url(), response.status()]); });
    context.on('requestfailed', request => { if (request.resourceType() === 'media') network.push(['failure', request.url(), request.failure()]); });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>播放器测试占位</title>' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/record`);
    sample = Buffer.from(await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
      const stream = canvas.captureStream(12), recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' }), chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const finished = new Promise(resolve => { recorder.onstop = async () => resolve([...new Uint8Array(await new Blob(chunks).arrayBuffer())]); });
      const ctx = canvas.getContext('2d'); let frame = 0;
      const draw = () => { ctx.fillStyle = '#376859'; ctx.fillRect(0, 0, 160, 90); ctx.fillStyle = '#edf4f1'; ctx.fillRect((frame++ * 5) % 130, 25, 30, 40); };
      draw(); recorder.start(); const interval = setInterval(draw, 80);
      await new Promise(resolve => setTimeout(resolve, 1600)); clearInterval(interval); recorder.stop(); stream.getTracks().forEach(track => track.stop()); return finished;
    }));
    fs.writeFileSync(path.join(__dirname, 'sample.webm'), sample);
    const fixtureURL = `http://127.0.0.1:${server.address().port}/fixture`;
    await page.goto(fixtureURL);
    const prepareBlob = () => page.evaluate(async () => { const blob = await (await fetch('/clip.webm')).blob(); document.querySelector('#blob').src = URL.createObjectURL(blob); });
    await prepareBlob();
    const open = url => worker.evaluate(async url => { const [tab] = await chrome.tabs.query({ url }); await openForTab(tab.id); }, url);
    await open(fixtureURL);
    const ui = page.locator('#point-resize-ui'); await ui.locator('#tab-videos').click();
    const queue = () => worker.evaluate(async () => (await chrome.storage.local.get('point-resize:video-queue:v1'))['point-resize:video-queue:v1'] || []);
    const choose = async selector => {
      await ui.locator('#vq-pick').click(); await page.locator(selector).hover(); await ui.locator('#vq-outline').waitFor({ state: 'visible' });
      await page.locator(selector).click(); await page.waitForFunction(() => document.querySelector('#point-resize-ui').shadowRoot.querySelector('#vq-pick').disabled === false);
      if (await ui.locator('#vq-pick').getAttribute('aria-pressed') === 'true') await ui.locator('#vq-pick').click();
    };
    await choose('#direct-cover');
    assert.equal((await queue())[0].kind, 'media'); assert.match((await queue())[0].mediaUrl, /\/stream$/);
    assert.equal((await queue())[0].title, '有 source 子元素的视频');
    await choose('#blob-cover'); assert.equal((await queue()).length, 1);
    // Keep playback regression coverage for previously saved temporary entries.
    const blobURL = await page.locator('#blob').evaluate(video => video.src);
    await worker.evaluate(async ({ blobURL, fixtureURL }) => {
      const key = PointResizeVideoData.key, data = await chrome.storage.local.get(key);
      const legacy = PointResizeVideoData.item({ kind: 'media', mediaUrl: blobURL, sourceUrl: fixtureURL, locator: { selector: '#blob' }, title: '网页临时视频流' });
      await chrome.storage.local.set({ [key]: [legacy, ...data[key]] });
    }, { blobURL, fixtureURL });
    const blobID = (await queue())[0].id;
    assert.equal((await queue())[0].dependent, true); assert.match(blobID, /^media-page:/);
    await choose('#embed-cover'); assert.equal((await queue())[0].id, 'BV1GJ411x7h7:2');
    await choose('#direct-link'); assert.equal((await queue()).length, 4);
    check('Native source, Bilibili embed and direct links collect; new blob is skipped, legacy blob playback fixture is retained');
    const sourceWindow = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].windowId, fixtureURL);
    const tabsBefore = await worker.evaluate(async windowId => (await chrome.tabs.query({ windowId })).map(tab => tab.id), sourceWindow);
    const rowFor = title => ui.locator('.vq-row').filter({ hasText: title });
    // This scenario borrows an already loaded website player. Ensure its
    // relative <source> has resolved before adopting it into about:blank PiP.
    await page.waitForFunction(() => document.querySelector('#direct').readyState >= 2);
    const sourceTab = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, fixtureURL);
    await worker.evaluate(async tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
      const api = documentPictureInPicture, request = api.requestWindow.bind(api);
      api.requestWindow = options => { globalThis.__pointResizePiPOptions = options; return request(options); };
    } }), sourceTab);
    await rowFor('有 source 子元素的视频').getByRole('button', { name: '播放', exact: true }).click();
    let pip = context.pages().at(-1); assert.notEqual(pip, page); await pip.setViewportSize({ width: 480, height: 370 }); await pip.locator('video').waitFor(); pip.on('pageerror', error => errors.push(error.message));
    const openingOptions = await worker.evaluate(async tabId => (await chrome.scripting.executeScript({ target: { tabId }, func: () => globalThis.__pointResizePiPOptions }))[0].result, sourceTab);
    assert.deepEqual(openingOptions, { width: 480, height: 370, disallowReturnToOpener: true });
    check('Direct user-click PiP request hides the browser return-to-tab button and keeps the 480×370 initial size');
    try { await pip.waitForFunction(() => { const video = document.querySelector('video'); return video.videoWidth > 0 && !video.paused && video.currentTime > .1; }, null, { timeout: 10000 }); }
    catch (error) { console.log('SOURCE STATE', await pip.evaluate(() => ({ hint: document.querySelector('#vp-hint').textContent, video: [...document.querySelectorAll('video')].map(v => ({ src:v.src, currentSrc:v.currentSrc, ready:v.readyState, network:v.networkState, muted:v.muted, error:v.error?.message, paused:v.paused, width:v.videoWidth, time:v.currentTime })) })), network); throw error; }
    assert.equal(await page.locator('#direct').count(), 0);
    assert.equal(await pip.locator('#direct').count(), 1);
    const first = await pip.locator('video').evaluate(video => ({ time: video.currentTime, width: video.videoWidth, height: video.videoHeight, paused: video.paused }));
    assert.equal(page.url(), fixtureURL); assert.deepEqual(await worker.evaluate(async windowId => (await chrome.tabs.query({ windowId })).map(tab => tab.id), sourceWindow), tabsBefore);
    await pip.screenshot({ path: path.join(root, 'outputs/网页内视频直接小窗验证.png') });
    check('One Play click moves the real source video into PiP and decoding advances, with source URL and ordinary tabs unchanged', first);
    await pip.waitForFunction(() => document.querySelector('video').currentTime > .8);
    for (let tries = 0; tries < 30 && !(await queue()).find(item => item.title === '有 source 子元素的视频')?.watched; tries++) await page.waitForTimeout(100);
    assert.equal((await queue()).find(item => item.title === '有 source 子元素的视频').watched, true);
    check('Browser compatibility playback also marks watched only after actual decoded progress');
    await pip.locator('#vp-list').click(); await pip.setViewportSize({ width: 480, height: 620 });
    await pip.locator('.vq-row').filter({ hasText: '网页临时视频流' }).getByRole('button', { name: '播放', exact: true }).click();
    await pip.waitForFunction(() => { const video = document.querySelector('video'); return video.id === 'blob' && video.videoWidth > 0 && !video.paused; });
    assert.equal(await page.locator('#direct').getAttribute('class'), 'original-video'); assert.equal(await page.locator('#direct').getAttribute('style'), 'border-radius:5px');
    assert.equal(await page.locator('#direct').getAttribute('controls'), null); assert.equal(await page.locator('#direct').evaluate(video => video.paused), true);
    assert.equal(await page.locator('#blob').count(), 0);
    await pip.screenshot({ path: path.join(root, 'outputs/网页临时视频小窗列表验证.png') });
    check('Small-window queue switches to the actual blob video and restores the previous video, styles, controls and paused state');
    await pip.locator('#vp-close').click(); await page.locator('#blob').waitFor(); assert.equal(await page.locator('#blob').evaluate(video => video.paused), true);
    assert.equal(await page.locator('#blob').getAttribute('controls'), null);
    check('Closing PiP restores borrowed video at its original position and releases playback');
    await rowFor('网页临时视频流').getByRole('button', { name: '播放', exact: true }).click(); pip = context.pages().at(-1);
    await pip.locator('#blob').waitFor(); await pip.locator('#vp-close').click(); await page.locator('#blob').waitFor();
    await page.reload(); await prepareBlob(); await open(fixtureURL); await ui.locator('#tab-videos').click();
    await choose('#blob-cover'); assert.equal((await queue()).length, 4); assert.equal((await queue()).find(item => item.dependent).id, blobID);
    await rowFor('网页临时视频流').getByRole('button', { name: '播放', exact: true }).click(); pip = context.pages().at(-1);
    await pip.waitForFunction(() => { const v = document.querySelector('video'); return v?.id === 'blob' && v.videoWidth > 0 && !v.paused; });
    await pip.locator('#vp-close').click();
    check('Blob entry reopens directly and rebinds to the refreshed original video instead of depending on an expired blob URL');
    const other = await context.newPage(); await other.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>播放器占位</title>' }));
    await other.goto(fixtureURL.replace('/fixture', '/other')); await open(other.url());
    const otherUI = other.locator('#point-resize-ui'); await otherUI.locator('#tab-videos').click();
    const pageCount = context.pages().length;
    await otherUI.locator('.vq-row').filter({ hasText: '网页临时视频流' }).getByRole('button', { name: '播放', exact: true }).click();
    assert.match(await otherUI.locator('#vq-status').textContent(), /临时视频流/); assert.equal(context.pages().length, pageCount);
    await otherUI.locator('.vq-row').filter({ hasText: '公开 WebM 视频直链' }).getByRole('button', { name: '播放', exact: true }).click(); pip = context.pages().at(-1);
    try { await pip.waitForFunction(() => { const video = document.querySelector('video'); return video?.videoWidth > 0 && !video.paused; }, null, { timeout: 5000 }); }
    catch (error) { console.log('DIRECT STATE', await pip.evaluate(() => ({ hint: document.querySelector('#vp-hint').textContent, visibility: document.visibilityState, video: [...document.querySelectorAll('video')].map(v => ({ src:v.src, currentSrc:v.currentSrc, ready:v.readyState, network:v.networkState, muted:v.muted, error:v.error?.message, paused:v.paused, width:v.videoWidth })) })), network); throw error; }
    await pip.locator('#vp-close').click();
    check('Global direct media entry plays from another page; source-dependent video explains its limit without opening a carrier tab or empty PiP');
    await page.bringToFront(); await ui.locator('#vq-current').click(); assert.equal((await queue()).length, 4);
    assert.deepEqual(errors, []);
    const dataChecks = await worker.evaluate(() => {
      const d = PointResizeVideoData, legacy = d.clean([{ url: 'https://www.bilibili.com/video/BV1GJ411x7h7', title: '旧收藏' }]);
      const invalid = ['javascript:alert(1)', 'https://user:password@example.com/clip.mp4', 'https://example.com/post/123'];
      return { legacy: legacy[0].id, rejected: invalid.map(url => { try { d.parse(url); return false; } catch { return true; } }), media: d.clean([{ kind: 'media', mediaUrl: 'javascript:alert(1)' }]).length };
    });
    assert.equal(dataChecks.legacy, 'BV1GJ411x7h7:1'); assert.deepEqual(dataChecks.rejected, [true, true, true]); assert.equal(dataChecks.media, 0);
    check('Collect-current-page deduplicates, legacy Bilibili data survives and non-media page/script/credential URLs are rejected');
  } finally {
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ timestamp: new Date().toISOString(), checks, realPage: 'Independent browser hit site verification; actual post not verified.' }, null, 2));
    if (context) await context.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
