const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), src = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report = [], check = (name, detail) => { report.push({ name, detail }); console.log('PASS', name, detail || ''); };
const server = http.createServer((req, res) => {
  const file = path.resolve(src, '.' + new URL(req.url, 'http://127.0.0.1').pathname);
  if (!file.startsWith(src + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const ext = path.join(__dirname, 'extension'); fs.cpSync(src, ext, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json')));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  fs.writeFileSync(path.join(ext, 'manifest.json'), JSON.stringify(manifest));
  let context;
  try {
    context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), { headless: true, viewport: { width: 1440, height: 1000 }, executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).hostname;
    const host = `http://127.0.0.1:${server.address().port}`;
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(host + '/demo.html');
    const ui = page.locator('#point-resize-ui');
    await ui.locator('#tab-videos').click();
    assert.equal(await ui.locator('#videos-page').isVisible(), true);
    assert.equal(await ui.locator('#resize-page').isVisible(), false);
    await ui.locator('#tab-videos').press('Home'); assert.equal(await ui.locator('#tab-resize').getAttribute('aria-selected'), 'true');
    await ui.locator('#tab-resize').press('End'); assert.equal(await ui.locator('#tab-videos').getAttribute('aria-selected'), 'true');
    check('Third tab and keyboard navigation');
    const urls = ['https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.1007', 'https://www.bilibili.com/video/BV1xx411c7mD/?p=2'];
    for (const url of [urls[0], urls[0], urls[1]]) { await ui.locator('#vq-url').fill(url); await ui.locator('#vq-form').evaluate(form => form.requestSubmit()); await page.waitForTimeout(100); }
    assert.equal(await ui.locator('.vq-row').count(), 2); check('Demo deduplication preserves separate parts');
    await ui.locator('#vq-url').fill('https://evil.example/video/BV1xx411c7mD'); await ui.locator('#vq-form').evaluate(form => form.requestSubmit());
    await page.waitForTimeout(50); assert.equal(await ui.locator('.vq-row').count(), 2); assert.match(await ui.locator('#vq-status').textContent(), /完整视频链接/); check('Rejects unsupported URLs');
    await page.evaluate(() => { const a = document.createElement('a'); a.id = 'test-bili-card'; a.href = 'https://www.bilibili.com/video/BV1xx411c7mD'; a.title = '视频卡片测试'; a.textContent = '点选视频卡片测试'; a.style.cssText = 'position:fixed;left:10px;top:150px;z-index:10'; document.body.append(a); });
    await ui.locator('#vq-pick').click(); await page.locator('#test-bili-card').click();
    assert.equal(page.url(), host + '/demo.html'); check('Card picking prevents original navigation');
    await ui.locator('#vq-url').fill('');
    await page.screenshot({ path: path.join(root, 'outputs/视频待看标签预览.png') });
    // The next page is a real extension page using real extension storage, not the demo adapter.
    const room = await context.newPage(); room.on('pageerror', error => errors.push(error.message));
    await room.goto(`chrome-extension://${id}/watchroom.html`);
    for (const url of ['https://www.bilibili.com/video/BV1xx411c7mD', 'https://www.bilibili.com/video/BV1GJ411x7h7']) { await room.locator('#vq-url').fill(url); await room.locator('#vq-form').evaluate(form => form.requestSubmit()); await room.waitForTimeout(100); }
    assert.equal(await room.locator('.vq-row').count(), 2);
    const stored = await worker.evaluate(async () => (await chrome.storage.local.get('point-resize:video-queue:v1'))['point-resize:video-queue:v1']);
    assert.equal(stored.length, 2); check('Real extension service worker serializes persistent queue writes');
    await room.reload(); assert.equal(await room.locator('.vq-row').count(), 2); check('Queue survives reload');
    await room.locator('.vq-row').last().locator('button').first().click();
    await room.waitForTimeout(8000);
    const embedded = room.frames().find(frame => frame.url().includes('player.bilibili.com/player.html'));
    if (embedded) {
      const state = await embedded.locator('video').evaluateAll(videos => videos.map(v => ({ ready: v.readyState, time: v.currentTime, paused: v.paused, width: v.videoWidth, height: v.videoHeight })));
      console.log('EXTENSION-EMBED', JSON.stringify(state));
      assert.ok(state.some(v => v.ready >= 2 && v.width > 0 && v.time > 0));
      check('Logged-out playback inside real extension iframe', state);
    }
    await room.locator('#float').click(); await room.waitForTimeout(300);
    const pipOpen = await room.evaluate(() => !!documentPictureInPicture.window);
    check('Document Picture-in-Picture opened', { pipOpen, text: await room.locator('#launcher-note').textContent() });
    assert.equal(pipOpen, true);
    const browserCDP = await context.browser().newBrowserCDPSession();
    console.log('TARGETS', JSON.stringify((await browserCDP.send('Target.getTargets')).targetInfos.map(t => ({ id:t.targetId, type:t.type, url:t.url }))));
    console.log('PAGES', JSON.stringify(context.pages().map(p => ({ url:p.url(), frames:p.frames().map(f=>f.url()) }))));
    const pip = context.pages().at(-1);
    assert.notEqual(pip, room);
    await pip.setViewportSize({ width: 560, height: 660 });
    // The PiP child may not be surfaced as a Playwright Page; query its actual document through its opener.
    assert.equal(await room.evaluate(() => !!documentPictureInPicture.window.document.querySelector('#vq-list')), true);
    await pip.locator('.vq-row').last().locator('button').first().click();
    await room.waitForTimeout(12000);
    const frame = room.frames().find(frame => frame.url().includes('player.bilibili.com')) || pip?.frames().find(frame => frame.url().includes('player.bilibili.com'));
    let live = { frameFound: !!frame };
    if (frame) {
      live.url = frame.url(); live.title = await frame.title().catch(() => '');
      live.body = (await frame.locator('body').innerText().catch(() => '')).slice(0, 1000);
      live.videos = await frame.locator('video').evaluateAll(videos => videos.map(v => ({ readyState: v.readyState, duration: Number.isFinite(v.duration) ? v.duration : null, currentTime: v.currentTime, paused: v.paused, width: v.videoWidth, height: v.videoHeight }))).catch(() => []);
    }
    console.log('LIVE', JSON.stringify(live)); report.push({ name: 'Logged-out official embed observation', live });
    assert.ok(live.videos?.some(video => video.readyState >= 2 && video.currentTime > 0 && video.width > 0), 'Actual video playback must advance inside PiP');
    await pip.screenshot({ path: path.join(root, 'outputs/视频小窗播放验证.png') });
    assert.equal(await pip.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight), true, 'Only queue should scroll, not the video frame');
    assert.equal((await pip.locator('#player').boundingBox()).y, 0);
    assert.equal(await room.evaluate(() => documentPictureInPicture.window.document.querySelector('iframe').src.includes('player.bilibili.com')), true);
    const previous = await pip.locator('iframe').getAttribute('src');
    await pip.locator('#next').click();
    assert.notEqual(await pip.locator('iframe').getAttribute('src'), previous);
    assert.equal(await room.evaluate(() => !!documentPictureInPicture.window.document.querySelector('iframe')), true); check('Switch video inside same PiP window');
    await room.evaluate(() => documentPictureInPicture.window.document.querySelector('#toggle-list').click());
    assert.equal(await room.evaluate(() => documentPictureInPicture.window.document.querySelector('#queue').hidden), true); check('Collapse queue inside PiP');
    await room.locator('#return').click(); await room.waitForTimeout(100);
    assert.equal(await room.locator('#room').isVisible(), true); assert.equal(await room.locator('iframe').count(), 1); check('Closing PiP restores player and queue');
    await room.locator('#stop').click(); assert.equal(await room.locator('iframe').count(), 0); check('Stop removes player and releases playback');
    await room.locator('#toggle-list').click();
    await room.screenshot({ path: path.join(root, 'outputs/视频待看播放器预览.png') });
    await room.setViewportSize({ width: 375, height: 780 });
    assert.equal(await room.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); check('375px responsive layout');
    assert.deepEqual(errors, []); check('No uncaught errors');
  } finally {
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ timestamp: new Date().toISOString(), report }, null, 2));
    if (context) await context.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
