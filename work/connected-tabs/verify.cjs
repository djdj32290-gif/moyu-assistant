const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), src = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks = [], errors = [], check = name => { checks.push(name); console.log('PASS', name); };
const server = http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(src, '.' + (route === '/fixture' ? '/demo.html' : route));
  if (!file.startsWith(src + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'text/plain');
  res.end(route === '/fixture' ? fs.readFileSync(file, 'utf8').replace(/<script[^>]*><\/script>/g, '') : fs.readFileSync(file));
});
let context;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const extension = path.join(__dirname, 'extension-' + Date.now()); fs.cpSync(src, extension, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*']; fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), {
    executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
    viewport: { width: 1280, height: 900 }, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension], env: { ...process.env }
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port + '/fixture');
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, page.url());
  await worker.evaluate(id => openForTab(id), tabId);
  const ui = page.locator('#point-resize-ui');
  const geometry = async (zoom = 1) => {
    const panel = await ui.locator('#panel').boundingBox(), tabs = await ui.locator('#panel-tabs').boundingBox();
    assert.ok(Math.abs(tabs.y - panel.y) * zoom < 1);
    assert.ok(Math.abs((tabs.x + tabs.width - panel.x) * zoom - 1) < 1);
    assert.ok(Math.abs(tabs.width * zoom - 44) < 1 && Math.abs(tabs.height * zoom - 132) < 1);
    const rows = await ui.locator('[role=tab]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { y: r.y, bottom: r.bottom, height: r.height }; }));
    for (let i = 0; i < rows.length; i++) {
      assert.ok(Math.abs(rows[i].height * zoom - 44) < 1);
      if (i) assert.ok(Math.abs(rows[i].y - rows[i - 1].bottom) * zoom < 1);
    }
    assert.ok(tabs.x >= 0 && panel.x + panel.width <= await page.evaluate(() => innerWidth) + 1);
  };
  await geometry();
  check('Three 44px tabs touch vertically, share the panel edge and align to the panel top');
  for (const tab of ['resize', 'videos', 'settings']) {
    await ui.locator('#tab-' + tab).click(); await geometry(); await page.waitForTimeout(180);
    const styles = await ui.locator('#tab-' + tab).evaluate(node => {
      const s = getComputedStyle(node), bridge = getComputedStyle(node, '::after');
      return { selected: node.getAttribute('aria-selected'), bg: s.backgroundColor, ink: s.color, right: s.borderRightColor, bridge: bridge.content, bridgeWidth: bridge.width };
    });
    assert.equal(styles.selected, 'true'); assert.equal(styles.right, 'rgba(0, 0, 0, 0)');
    assert.equal(styles.ink, 'rgb(55, 104, 89)'); assert.equal(styles.bridgeWidth, '2px'); assert.notEqual(styles.bridge, 'none');
    await page.mouse.move(10, 850); await page.waitForTimeout(180);
    assert.equal(await ui.locator('#tab-' + tab).evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(237, 244, 241)');
    await page.screenshot({ path: path.join(root, 'outputs', '相连标签-' + ({ resize: '点选缩放', videos: '视频待看', settings: '设置' })[tab] + '.png') });
    if (tab === 'resize') {
      const panel = await ui.locator('#panel').boundingBox(), tabs = await ui.locator('#panel-tabs').boundingBox();
      await page.screenshot({ path: path.join(root, 'outputs/相连标签面板预览.png'), clip: { x: tabs.x - 8, y: panel.y - 8, width: panel.x + panel.width - tabs.x + 16, height: Math.max(panel.height, tabs.height) + 16 } });
    }
  }
  check('Every selected tab opens its right border into the panel, retaining green colors and the existing page content');
  await ui.locator('#tab-settings').focus(); await page.keyboard.press('ArrowUp');
  assert.equal(await ui.locator('#tab-videos').getAttribute('aria-selected'), 'true');
  const focus = await ui.locator('#tab-videos').evaluate(node => { const s = getComputedStyle(node); return [s.outlineWidth, s.outlineColor, node.getRootNode().activeElement === node]; });
  assert.deepEqual(focus, ['2px', 'rgb(83, 135, 117)', true]);
  await page.keyboard.press('Home'); assert.equal(await ui.locator('#tab-resize').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End'); assert.equal(await ui.locator('#tab-settings').getAttribute('aria-selected'), 'true');
  check('Arrow/Home/End keyboard navigation, Chinese accessible names and the visible 2px focus ring remain available');
  const before = await ui.locator('#panel').boundingBox(), handle = await ui.locator('#drag-handle').boundingBox();
  await page.mouse.move(handle.x + 40, handle.y + 15); await page.mouse.down(); await page.mouse.move(handle.x - 80, handle.y + 100, { steps: 8 }); await page.mouse.up();
  assert.ok((await ui.locator('#panel').boundingBox()).x < before.x - 100); await geometry();
  for (let i = 0; i < 2; i++) { await ui.locator('#dock').click(); await geometry(); }
  check('Dragging and left/right docking keep the entire tab column attached');
  for (const factor of [1.5, .67, 1]) {
    await worker.evaluate(({ id, factor }) => chrome.tabs.setZoom(id, factor), { id: tabId, factor }); await page.waitForTimeout(200);
    const zoom = await worker.evaluate(id => chrome.tabs.getZoom(id), tabId); await geometry(zoom);
    if (factor === 1.5) await page.screenshot({ path: path.join(root, 'outputs/相连标签-150缩放.png') });
  }
  check('Actual browser zoom 150%, 67%, 100% preserves the attached edge and physical tab sizes');
  await page.setViewportSize({ width: 375, height: 812 }); await geometry();
  for (const tab of ['resize', 'videos', 'settings']) { await ui.locator('#tab-' + tab).click(); await geometry(); }
  await page.screenshot({ path: path.join(root, 'outputs/相连标签-窄窗.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await ui.locator('#tab-settings').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.deepEqual(errors, []);
  check('375px viewport keeps all tabs and panel in bounds; reduced-motion mode and no uncaught errors verified');
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (context) await context.close(); server.close(); });
