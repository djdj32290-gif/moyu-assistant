const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const src = process.env.POINT_RESIZE_TEST_SOURCE || path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report = [], errors = [], check = name => { report.push(name); console.log('PASS', name); };
const key = 'point-resize:v1:127.0.0.1';
const scale = (id, selector, value = 50, extra = {}) => ({ id, selector, value, mode: 'scale', defaultValue: 100, level: 1, ...extra });
const fixture = `<!doctype html><meta charset="utf-8"><title>页面隔离验证</title><style>
body{margin:30px;font:16px sans-serif;color:#293c38;background:#f4f7f5}img{display:block;width:200px;height:120px}
#copy,#text,#hidden,#legacy,#invalid{font-size:16px;margin:10px 0}#copy span{font-size:16px}</style>
<h1>相同结构，不同页面</h1><img id="scaled" alt="页面图片" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Cpath fill='%23376859' d='M0 0h200v120H0z'/%3E%3C/svg%3E">
<div id="copy">整段字号<span>内部字号</span></div><div id="text">单独文字<br><span>保留的文字</span></div>
<div id="hidden">隐藏目标</div><img id="legacy" alt="旧记录目标" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
<div id="invalid">不应隐藏</div><div id="shadow-host"></div><script>
document.getElementById('shadow-host').attachShadow({mode:'open'}).innerHTML='<div id="shadow-target" style="width:200px;height:60px;background:lightgray">组件内容</div>';
</script>`;
const handler = (req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(fixture); };
const server = http.createServer(handler), otherServer = http.createServer(handler);
let context;
async function stateOf(page) {
  return page.evaluate(() => ({ width: document.getElementById('scaled').getBoundingClientRect().width,
    font: parseFloat(getComputedStyle(document.getElementById('copy')).fontSize),
    childFont: parseFloat(getComputedStyle(document.querySelector('#copy span')).fontSize),
    hidden: getComputedStyle(document.getElementById('hidden')).display === 'none',
    textHidden: [...document.querySelectorAll('#text > span')].some(node => node.textContent === '单独文字' && getComputedStyle(node).display === 'none'),
    shadow: document.getElementById('shadow-host').shadowRoot.getElementById('shadow-target').getBoundingClientRect().width,
    legacy: document.getElementById('legacy').getBoundingClientRect().width,
    invalid: getComputedStyle(document.getElementById('invalid')).display === 'none' }));
}
async function expectState(page, expected) {
  await page.waitForFunction(expected => {
    const actual = { width: document.getElementById('scaled').getBoundingClientRect().width,
      font: parseFloat(getComputedStyle(document.getElementById('copy')).fontSize),
      childFont: parseFloat(getComputedStyle(document.querySelector('#copy span')).fontSize),
      hidden: getComputedStyle(document.getElementById('hidden')).display === 'none',
      textHidden: [...document.querySelectorAll('#text > span')].some(node => node.textContent === '单独文字' && getComputedStyle(node).display === 'none'),
      shadow: document.getElementById('shadow-host').shadowRoot.getElementById('shadow-target').getBoundingClientRect().width,
      legacy: document.getElementById('legacy').getBoundingClientRect().width,
      invalid: getComputedStyle(document.getElementById('invalid')).display === 'none' };
    return Object.entries(expected).every(([key, value]) => actual[key] === value);
  }, expected, { timeout: 5000 }).catch(async error => { console.error('STATE', page.url(), await stateOf(page)); throw error; });
}
(async () => {
  await Promise.all([new Promise(resolve => server.listen(0, '127.0.0.1', resolve)), new Promise(resolve => otherServer.listen(0, '127.0.0.1', resolve))]);
  const origin = 'http://127.0.0.1:' + server.address().port, otherOrigin = 'http://127.0.0.1:' + otherServer.address().port;
  const urlA = origin + '/article/100', urlB = origin + '/article/101';
  const extension = path.join(__dirname, 'extension-' + Date.now()); fs.cpSync(src, extension, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*']; fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  const nativeFile=path.join(extension,'video-native.js');fs.writeFileSync(nativeFile,fs.readFileSync(nativeFile,'utf8').replace('"com.pointresize.video"','"com.pointresize.isolationtest"'));
  context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), {
    executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
    viewport: { width: 1280, height: 900 }, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension], env: { ...process.env }
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const get = () => worker.evaluate(async key => (await chrome.storage.local.get(key))[key], key);
  const set = rules => worker.evaluate(({ key, rules }) => chrome.storage.local.set({ [key]: { enabled: true, rules } }), { key, rules });
  const open = page => worker.evaluate(async url => { const [tab] = await chrome.tabs.query({ url }); await openForTab(tab.id); }, page.url());
  const pageA = await context.newPage(), pageB = await context.newPage();
  for (const page of [pageA, pageB]) page.on('pageerror', e => errors.push(e.message));
  const a = { ...scale('A', '#scaled'), name: 'A 页面设置', label: 'A 页面设置', pageURL: urlA, enabled: true, thumbnail: '',
    layers: [scale('A-scale', '#scaled'), { id: 'A-font', selector: '#copy', mode: 'font', value: 24, defaultValue: 16, level: 2 },
      scale('A-hide', '#hidden', 100, { hidden: true, level: 3 }),
      { id: 'A-text', selector: '#text', mode: 'font', value: 16, defaultValue: 16, level: 4, hidden: true, textAnchor: { index: 0, quote: '单独文字' } },
      scale('A-shadow', '#shadow-target', 50, { shadowPath: ['#shadow-host'], level: 5 })],
    branchSelection: { 1: 'A-scale', 2: 'A-font', 3: 'A-hide', 4: 'A-text', 5: 'A-shadow' } };
  await set([a]); await pageA.goto(urlA); await open(pageA);
  const original = { width: 200, font: 16, childFont: 16, hidden: false, textHidden: false, shadow: 200, invalid: false };
  const effectA = { width: 100, font: 24, childFont: 24, hidden: true, textHidden: true, shadow: 100, invalid: false };
  await expectState(pageA, effectA);
  await pageB.goto(urlB); await open(pageB); await expectState(pageB, original);
  check('Same-site numeric A/B pages share all selectors but scale/font/hide/text/shadow branches apply only on A');

  const uiA = pageA.locator('#point-resize-ui'), uiB = pageB.locator('#point-resize-ui');
  assert.equal(await uiB.locator('.rule[aria-label="A 页面设置"]').getByRole('button', { name: '到网页调整', exact: true }).count(), 1);
  await uiB.locator('#choose').click(); await pageB.locator('#scaled').click(); await uiB.locator('#presets button[data-value="75"]').click();
  await uiB.locator('#name').fill('B 页面设置'); await uiB.locator('#save').click(); await uiB.locator('#library').waitFor({ state: 'visible' });
  const saved = await get(), b = saved.rules.find(item => item.name === 'B 页面设置');
  assert.equal(saved.rules.length, 2); assert.ok(b && b.id !== a.id); assert.equal(b.pageURL, urlB); assert.deepEqual(saved.rules.find(item => item.id === 'A'), a);
  const effectB = { ...original, width: 150 };
  await expectState(pageA, effectA); await expectState(pageB, effectB);
  check('Saving the same element on B creates a separate record without overwriting A; concurrent tabs keep independent effects');
  assert.equal(await uiB.locator('.rule[aria-label="B 页面设置"]').getByRole('button', { name: '调整', exact: true }).count(), 1);
  const count = context.pages().length;
  await uiB.locator('.rule[aria-label="A 页面设置"]').getByRole('button', { name: '到网页调整', exact: true }).click();
  await uiA.locator('#editor').waitFor({ state: 'visible' }); assert.equal(await uiA.locator('#name').inputValue(), a.name); assert.equal(context.pages().length, count);
  await uiA.locator('#cancel-edit').click(); await pageB.bringToFront();
  check('Edit routing distinguishes numeric IDs inside one list group and activates the correct existing source tab');

  const navigate = async (url, method = 'pushState') => pageB.evaluate(({ url, method }) => history[method]({}, '', url), { url, method });
  await navigate(urlA); await expectState(pageB, effectA);
  await navigate(urlB); await expectState(pageB, effectB);
  assert.equal(await pageB.locator('#text [data-point-resize-text]').count(), 0);
  assert.equal(await pageB.locator('#scaled').evaluate(node => node.style.getPropertyValue('--point-resize-width')), '200px');
  check('SPA pushState clears A CSS, text wrappers and shadow rules while reusing the same DOM; B rules apply immediately');
  await pageB.evaluate(() => history.back()); await expectState(pageB, effectA);
  await pageB.evaluate(() => history.forward()); await expectState(pageB, effectB);
  await navigate('/unrelated', 'replaceState'); await expectState(pageB, original);
  assert.equal(await pageB.locator('#scaled').evaluate(node => node.style.getPropertyValue('--point-resize-width')), '');
  check('Back, forward and replaceState restore the correct page rules and release measurements on unrelated pages');

  const q = { ...scale('query', '#scaled', 60), pageURL: urlA + '?page=2', label: '查询参数页面' };
  const h = { ...scale('hash-route', '#scaled', 25), pageURL: origin + '/shell#/article/100', label: 'Hash 路由' };
  const bang = { ...scale('hashbang-route', '#scaled', 40), pageURL: origin + '/shell#!/article/100', label: 'Hashbang 路由' };
  await set([a, b, q, h, bang]);
  await navigate(q.pageURL); await expectState(pageB, { ...original, width: 120 });
  await navigate(urlA + '?page=3'); await expectState(pageB, original);
  await navigate(urlA + '#comments'); await expectState(pageB, effectA);
  await navigate(urlA + '#top'); await expectState(pageB, effectA);
  check('Query parameters isolate different content pages; ordinary #anchor scrolling preserves the current page rules');
  await navigate(h.pageURL); await expectState(pageB, { ...original, width: 50 });
  await pageB.evaluate(() => { location.hash = '/article/101'; }); await expectState(pageB, original);
  await navigate(bang.pageURL); await expectState(pageB, { ...original, width: 80 });
  await pageB.evaluate(() => { location.hash = '!/article/101'; }); await expectState(pageB, original);
  check('Hash and hashbang routes isolate their numeric content IDs and react to hashchange without document reload');

  const portPage = await context.newPage(); portPage.on('pageerror', e => errors.push(e.message));
  await portPage.goto(otherOrigin + '/article/100'); await open(portPage); await expectState(portPage, original); await portPage.close();
  check('Pages with the same hostname/path but different origin ports do not inherit each other\'s rules');
  await pageB.bringToFront(); await navigate(urlB); await expectState(pageB, effectB);
  await uiB.locator('.rule[aria-label="B 页面设置"]').getByRole('button', { name: '调整', exact: true }).click();
  await uiB.locator('#presets button[data-value="25"]').click(); await expectState(pageB, { ...original, width: 50 });
  const beforeDraft = await get();
  await navigate(urlA); await expectState(pageB, effectA); assert.equal(await uiB.locator('#editor').isVisible(), false);
  assert.match(await uiB.locator('#status').textContent(), /页面已切换/); assert.deepEqual(await get(), beforeDraft);
  await navigate(urlB); await expectState(pageB, effectB);
  check('Leaving an edited SPA page rolls back every unsaved preview, closes the editor and keeps all saved data intact');
  await uiB.locator('.rule[aria-label="B 页面设置"]').getByRole('button', { name: '调整', exact: true }).click();
  await uiB.locator('#presets button[data-value="25"]').click();
  await pageB.evaluate(url => { history.pushState({}, '', url); document.querySelector('#point-resize-ui').shadowRoot.getElementById('save').click(); }, urlA);
  await expectState(pageB, effectA); assert.deepEqual(await get(), beforeDraft);
  check('A route change followed immediately by Save cannot attach the previous page draft to the new URL');
  // Use the distinct B URL so the target tab lookup is unambiguous.
  await navigate(urlB); await expectState(pageB, effectB);
  const targetB = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, urlB);
  const blocked = await worker.evaluate(({ id }) => chrome.tabs.sendMessage(id, { type: 'POINT_RESIZE_EDIT_SAVED', id: 'A' }), { id: targetB });
  assert.equal(blocked.ok, false); assert.match(blocked.error, /其他页面/); assert.equal(await uiB.locator('#editor').isVisible(), false);
  check('Direct edit messages cannot bypass page ownership even when a matching element exists');

  const legacy = { ...scale('legacy', '#legacy', 50), label: '旧版全站兼容记录' }, invalid = { ...scale('invalid', '#invalid', 100), label: '无效网址记录（不应用）', hidden: true, pageURL: 'not-a-valid-url' };
  await set([...beforeDraft.rules, legacy, invalid]); await expectState(pageA, { ...effectA, legacy: 100 }); await expectState(pageB, { ...effectB, legacy: 100 });
  check('Legacy records without a URL remain compatible; invalid nonempty URLs never fall back to a site-wide match');
  const full = await worker.evaluate(async () => PointResizeBackup.create(await chrome.storage.local.get(null), chrome.runtime.getManifest().version));
  await set([]); await expectState(pageA, { ...original, legacy: 200 }); await expectState(pageB, { ...original, legacy: 200 });
  await uiB.locator('#tab-settings').click(); await uiB.locator('#backup-file').setInputFiles({ name: 'page-scope.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(full)) });
  await uiB.locator('#backup-status').filter({ hasText: '已导入合并' }).waitFor();
  await expectState(pageA, { ...effectA, legacy: 100 }); await expectState(pageB, { ...effectB, legacy: 100 });
  assert.deepEqual((await get()).rules.map(item => [item.id, item.pageURL]), full.data[key].rules.map(item => [item.id, item.pageURL]));
  check('Settings JSON round-trip preserves page ownership and restores each tab independently with legacy compatibility');
  const demo = await context.newPage(), fileURL = pathToFileURL(path.join(src, 'demo.html')).href;
  demo.on('pageerror', e => errors.push(e.message));
  await demo.goto(fileURL); await demo.locator('#point-resize-ui').waitFor({ state: 'attached' });
  await demo.evaluate(async url => chrome.storage.local.set({ 'point-resize:v1:local-demo': { rules: [{ id: 'file-demo', selector: '#nested-image', mode: 'scale', value: 50, pageURL: url }] } }), fileURL);
  await demo.waitForFunction(() => document.getElementById('nested-image').getBoundingClientRect().width === 120);
  await demo.goto(fileURL + '?page=other'); await demo.locator('#point-resize-ui').waitFor({ state: 'attached' });
  assert.equal(await demo.evaluate(() => !!localStorage.getItem('point-resize:v1:local-demo')), true);
  await demo.waitForFunction(() => document.getElementById('nested-image').getBoundingClientRect().width === 240);
  await demo.goto(fileURL); await demo.waitForFunction(() => document.getElementById('nested-image').getBoundingClientRect().width === 120); await demo.close();
  check('Standalone file demo retains its shared backup storage but isolates the concrete page address');
  await uiB.locator('#tab-resize').click();
  await pageB.screenshot({ path: path.join(root, 'outputs/页面隔离验证.png') });
  await pageB.reload(); await pageB.locator('#point-resize-ui').waitFor({ state: 'attached' }); await expectState(pageB, { ...effectB, legacy: 100 });
  assert.equal(await pageB.locator('#point-resize-ui #panel').isVisible(), false);
  assert.deepEqual(errors, []);
  check('Reload applies only the current page settings automatically while the panel remains closed; no uncaught errors');
})().then(() => {
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ passed: report.length, checks: report, errors }, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (context) await context.close(); server.close(); otherServer.close();
});
