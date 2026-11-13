const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), source = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp');
fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks = [], stamp = Date.now();
const check = name => { checks.push({ name }); console.log('PASS', name); };
const fixture = `<!doctype html><meta charset="utf-8"><title>视频区域选取验证</title>
<style>body{margin:24px;font:16px sans-serif;color:#293c38;background:#f4f7f5}main{width:760px}.card{position:relative;width:310px;padding:18px;margin:16px 0;background:white;border:1px solid #cbdad1;border-radius:10px}.cover{height:110px;background:#d7e9df;display:grid;place-items:center}.overlay{position:absolute;inset:18px 18px 55px;background:transparent}.blank{height:25px}a{display:block;color:#376859}#group{padding:20px;background:#e1eee7}#group>a{margin:10px}#invalid{margin:20px 0}#shadow{display:block;margin-top:20px}#spacer{height:800px}</style>
<main><h1>点选视频区域</h1>
<article class="card" id="card"><a id="cover" href="https://www.bilibili.com/video/BV1GJ411x7h7?spm_id_from=test"><div class="cover">封面区域</div></a><a id="title" title="卡片里的独立标题" href="https://www.bilibili.com/video/BV1GJ411x7h7">卡片里的独立标题</a><div class="overlay" id="overlay"></div><div class="blank" id="blank"></div></article>
<section id="group"><span id="group-target">包含多个视频的区域</span><a href="https://www.bilibili.com/video/av100">第一条</a><a href="https://www.bilibili.com/video/av100?from=test">同一条的重复入口</a><a href="https://www.bilibili.com/video/av100?p=2">第一条 P2</a><a href="https://www.bilibili.com/video/BV1xx411c7mD">另一条</a><a href="https://example.com/video/av999">非 B 站链接</a></section>
<section id="invalid"><a id="unsupported" href="https://example.com/">无视频链接区域</a></section>
<div id="shadow"></div><div id="spacer"></div></main>
<script>window.effects=0;for(const type of ['pointerdown','mousedown','mouseup','click'])document.querySelector('main').addEventListener(type,()=>window.effects++);document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<section style="padding:24px;background:#fff"><span id="shadow-target">组件里的卡片空白</span><a href="https://www.bilibili.com/video/av333" title="组件内的视频">组件内的视频</a></section>';</script>`;
(async () => {
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fixture); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let context;
  try {
    const extension = path.join(__dirname, 'extension-' + stamp); fs.cpSync(source, extension, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*'];
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + stamp), {
      executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
      viewport: { width: 1440, height: 1050 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    const original = page.url();
    const open = url => worker.evaluate(async url => { const [tab] = await chrome.tabs.query({ url }); await openForTab(tab.id); }, url);
    await open(original);
    const ui = page.locator('#point-resize-ui'), pick = ui.locator('#vq-pick'), rows = ui.locator('.vq-row');
    await ui.locator('#tab-videos').click();
    const queue = () => worker.evaluate(async () => (await chrome.storage.local.get('point-resize:video-queue:v1'))['point-resize:video-queue:v1'] || []);
    const count = async size => { await rows.first().waitFor(); await page.waitForFunction(size => document.querySelector('#point-resize-ui').shadowRoot.querySelectorAll('.vq-row').length === size, size); };
    const hover = async locator => { await locator.hover(); await ui.locator('#vq-outline').waitFor({ state: 'visible' }); };
    await pick.click(); await hover(page.locator('#overlay'));
    assert.equal(await ui.locator('#vq-outline .tag').textContent(), '识别到 1 个视频 · 点击加入');
    const expected = await page.locator('#card').boundingBox(), actual = await ui.locator('#vq-outline').boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(expected[key] - actual[key]) < 1);
    await page.screenshot({ path: path.join(root, 'outputs/视频区域点选预览.png') });
    await page.locator('#overlay').click(); await count(1);
    assert.equal((await queue())[0].title, '卡片里的独立标题');
    assert.equal(page.url(), original); assert.equal(await page.evaluate(() => window.effects), 0);
    check('Transparent cover overlay resolves nearest card, keeps its title, shows exact red region and suppresses page actions');
    await pick.click(); await page.locator('#blank').click(); await page.waitForFunction(() => document.querySelector('#point-resize-ui').shadowRoot.querySelector('#vq-status').textContent.includes('跳过 1'));
    assert.equal((await queue()).length, 1);
    check('Card whitespace finds nested links and repeated cover/title links are deduplicated');
    await pick.click(); await hover(page.locator('#group-target'));
    assert.equal(await ui.locator('#vq-outline .tag').textContent(), '识别到 3 个视频 · 点击加入');
    await page.locator('#group-target').click(); await count(4);
    assert.deepEqual(new Set((await queue()).map(item => item.id)), new Set(['BV1GJ411x7h7:1', 'av100:1', 'av100:2', 'BV1xx411c7mD:1']));
    check('Region collects multiple supported videos, ignores other domains, deduplicates tracking URLs and retains episode identity');
    await pick.click(); await page.locator('#unsupported').click();
    assert.equal(await pick.getAttribute('aria-pressed'), 'true'); assert.equal(page.url(), original);
    assert.match(await ui.locator('#vq-status').textContent(), /没有识别/); assert.equal((await queue()).length, 4);
    await page.keyboard.press('Escape'); assert.equal(await pick.getAttribute('aria-pressed'), 'false');
    assert.equal(await ui.locator('#videos-page').isVisible(), true); assert.equal(await ui.locator('#vq-outline').isVisible(), false);
    check('Invalid regions stay in picking with a useful error, suppress navigation and Escape cancels within video tab');
    await pick.click(); await hover(page.locator('#shadow-target')); await page.locator('#shadow-target').click(); await count(5);
    assert.equal((await queue())[0].title, '组件内的视频');
    check('Open Shadow DOM card region resolves its internal video link');
    await page.evaluate(() => document.querySelector('#title').href = 'https://www.bilibili.com/video/av444');
    await pick.click(); await hover(page.locator('#title')); await page.locator('#title').focus(); await page.keyboard.press('Enter'); await count(6);
    assert.equal((await queue())[0].id, 'av444:1');
    check('Hover then Enter adds the explicit title link, without unrelated neighbouring videos');
    await pick.click(); await hover(page.locator('#overlay')); await ui.locator('#tab-settings').click();
    assert.equal(await pick.getAttribute('aria-pressed'), 'false'); assert.equal(await ui.locator('#vq-outline').isVisible(), false);
    assert.equal(await ui.locator('#settings-page #backup-export').isVisible(), true);
    assert.equal(await ui.locator('#settings-page #backup-import').isVisible(), true);
    await ui.locator('#tab-videos').click(); await pick.click(); await hover(page.locator('#overlay')); await pick.click();
    assert.equal(await ui.locator('#vq-outline').isVisible(), false);
    check('Tab changes and cancel button clear the selection; Settings shows global backup controls');
    const tab = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, original);
    await worker.evaluate(id => chrome.tabs.setZoom(id, 1.5), tab); await pick.click(); await hover(page.locator('#overlay'));
    const zoomedCard = await page.locator('#card').boundingBox(), zoomedOutline = await ui.locator('#vq-outline').boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(zoomedCard[key] - zoomedOutline[key]) < 1);
    await page.screenshot({ path: path.join(root, 'outputs/视频区域点选150缩放验证.png') });
    await page.keyboard.press('Escape'); await worker.evaluate(id => chrome.tabs.setZoom(id, 1), tab);
    await page.setViewportSize({ width: 375, height: 820 });
    await pick.click(); await page.mouse.move(35, 180); await page.waitForTimeout(50);
    assert.equal(await pick.getAttribute('aria-pressed'), 'true');
    const buttonStyle = await pick.evaluate(node => { const s = getComputedStyle(node); return { radius: s.borderRadius, font: s.fontSize, weight: s.fontWeight, bg: s.backgroundColor }; });
    assert.deepEqual(buttonStyle, { radius: '8px', font: '12px', weight: '500', bg: 'rgb(237, 244, 241)' });
    await page.screenshot({ path: path.join(root, 'outputs/视频区域点选窄窗验证.png') });
    await page.keyboard.press('Escape');
    check('150% browser zoom keeps region frame aligned; narrow viewport keeps shared button appearance and cancellation usable');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.reload(); await open(original); await ui.locator('#tab-videos').click(); await count(6);
    const other = await context.newPage(); await other.goto(original.replace('/fixture', '/other')); await open(other.url());
    await other.locator('#point-resize-ui').locator('#tab-videos').click();
    assert.equal(await other.locator('#point-resize-ui').locator('.vq-row').count(), 6);
    assert.deepEqual(errors, []);
    check('Collected regions persist across reload and share the global queue; no uncaught errors');
  } finally {
    fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ timestamp: new Date().toISOString(), checks }, null, 2));
    if (context) await context.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
