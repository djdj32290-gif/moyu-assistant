const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), src = path.join(root, 'src');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const report = [], check = name => { report.push(name); console.log('PASS', name); };
const prefix = 'point-resize:v1:', queue = 'point-resize:video-queue:v1', pos = 'point-resize:panel-position';
const rule = (id, value = 50) => ({ id, selector: '#nested-image', mode: 'scale', value, defaultValue: 100, label: '测试保存项', enabled: true, hidden: false });
const backup = data => JSON.stringify({ format: 'point-resize-backup', schemaVersion: 1, data });
(async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = path.join(src, name === '/fixture' || name === '/' ? 'demo.html' : name);
    if (!file.startsWith(src + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    let data = fs.readFileSync(file);
    if (name === '/fixture') data = Buffer.from(data.toString().replace(/<script[^>]*><\/script>/g, ''));
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' })[path.extname(file)] || 'text/plain'); res.end(data);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let context, demoContext;
  try {
    const extension = path.join(__dirname, 'extension-' + Date.now()); fs.cpSync(src, extension, { recursive: true });
    const nativeFixture=path.join(extension,'video-native.js');fs.writeFileSync(nativeFixture,fs.readFileSync(nativeFixture,'utf8').replace('"com.pointresize.video"','"com.pointresize.backuptest"'));
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'))); manifest.host_permissions = ['http://127.0.0.1/*']; fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), {
      executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
      args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension], viewport: { width: 1280, height: 900 },
      acceptDownloads: true, downloadsPath: path.join(__dirname, 'downloads'), env: { ...process.env }
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const get = () => worker.evaluate(() => chrome.storage.local.get(null));
    const set = data => worker.evaluate(data => chrome.storage.local.set(data), data);
    const clear = () => worker.evaluate(() => chrome.storage.local.clear());
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/fixture');
    const open = () => worker.evaluate(async url => { const [tab] = await chrome.tabs.query({ url }); await openForTab(tab.id); }, page.url());
    const first = rule('saved-one'); first.pageURL = origin + '/fixture'; first.thumbnail = 'data:image/png;base64,' + fs.readFileSync(path.join(src, 'icons/48.png')).toString('base64');
    first.layers = [{ ...rule('layer-one'), level: 1, sibling: 2, childSelection: {} }, { id: 'layer-two', selector: '.article-note', mode: 'font', value: 20, defaultValue: 16, level: 2, hidden: true }];
    first.branchSelection = { 1: 'layer-one', 2: 'layer-two' };
    const initial = { [prefix + '127.0.0.1']: { enabled: false, rules: [first] }, [prefix + 'example.com']: { enabled: true, rules: [rule('remote')] },
      [queue]: [{ url: 'https://www.bilibili.com/video/av123?p=2', title: '旧版 B 站视频', addedAt: 123, watched: true }, { kind: 'media', mediaUrl: 'https://example.com/clip.mp4', title: '普通视频' }, { kind: 'media', mediaUrl: 'blob:' + origin + '/test', sourceUrl: origin + '/fixture', locator: { selector: 'video' }, title: '临时流' }], [pos]: { x: 800, y: 40 }, unrelated: { keep: true } };
    await set(initial); await open();
    const ui = page.locator('#point-resize-ui');
    assert.deepEqual(await ui.locator('#panel-tabs [role=tab]').evaluateAll(nodes => nodes.map(node => node.id)), ['tab-resize', 'tab-videos', 'tab-settings']);
    await ui.locator('#tab-settings').click(); await page.keyboard.press('ArrowUp'); assert.equal(await ui.locator('#tab-videos').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End'); assert.equal(await ui.locator('#tab-settings').getAttribute('aria-selected'), 'true');
    assert.equal(await ui.locator('#settings-page #backup-export').isVisible(), true);
    assert.equal(await ui.locator('#settings-page #backup-import').isVisible(), true);
    assert.match(await ui.locator('#settings-page').textContent(), /点选缩放和视频待看的全部已保存设置/);
    assert.equal(await ui.locator('#brand-title').textContent(), '设置'); assert.equal(await ui.locator('#site').isVisible(), false);
    await page.keyboard.press('Home'); assert.equal(await ui.locator('#tab-resize').getAttribute('aria-selected'), 'true');
    check('Tab order, arrow/Home/End navigation, Settings backup controls and default Resize context');
    await ui.locator('#manage').click();
    assert.equal(await ui.locator('#all-view #backup-export, #all-view #backup-import').count(), 0);
    assert.equal(await ui.locator('#backup-export').isVisible(), false);
    await ui.locator('#all-back').click(); await ui.locator('#tab-settings').click();
    const downloadBackup = async () => { const event = page.waitForEvent('download'); await ui.locator('#backup-export').click(); const download = await event; const file = path.join(__dirname, download.suggestedFilename()); await download.saveAs(file); return JSON.parse(fs.readFileSync(file, 'utf8')); };
    const exported = await downloadBackup();
    assert.equal(exported.extensionVersion, manifest.version); assert.equal(exported.format, 'point-resize-backup'); assert.equal(exported.data.unrelated, undefined);
    assert.deepEqual(exported.data[prefix + '127.0.0.1'], initial[prefix + '127.0.0.1']); assert.equal(exported.data[queue][0].id, 'av123:2'); assert.equal(exported.data[queue][2].dependent, true);
    assert.equal(exported.data[queue][0].watched, true); assert.equal(exported.data[queue][1].watched, false);
    check('Real MV3 JSON download includes all profiles, branches, hidden/font/scale, screenshots, position and three video kinds; excludes unrelated storage');
    const importText = async text => { const chooserEvent = page.waitForEvent('filechooser'); await ui.locator('#backup-import').click(); const chooser = await chooserEvent; await chooser.setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) }); await page.waitForFunction(() => { const root = document.querySelector('#point-resize-ui').shadowRoot; return !root.getElementById('backup-import').disabled && /已导入|操作失败/.test(root.getElementById('backup-status').textContent); }); assert.equal(await ui.locator('#backup-status').isVisible(), true); return ui.locator('#backup-status').textContent(); };
    await clear(); await set({ unrelated: { keep: true } });
    assert.match(await importText(JSON.stringify(exported)), /已导入合并/);
    let data = await get(); assert.deepEqual(data[prefix + '127.0.0.1'].rules[0], { ...first, enabled: false }); assert.deepEqual(data[prefix + 'example.com'], initial[prefix + 'example.com']); assert.deepEqual(data[queue], exported.data[queue]); assert.deepEqual(data.unrelated, { keep: true }); assert.deepEqual(data[pos], initial[pos]);
    check('Restore from empty storage preserves disabled legacy profiles, branch selections, video locators and unrelated data');
    await ui.locator('#tab-videos').click();
    assert.equal(await ui.locator('.vq-row').count(), 3);
    assert.equal(await ui.locator('#backup-export').isVisible(), false);
    await ui.locator('#tab-settings').click();
    assert.match(await ui.locator('#backup-status').textContent(), /已导入合并/);
    check('Restored full video queue appears on the Video tab and backup status persists on returning to Settings');
    const local = data[prefix + '127.0.0.1']; local.rules[0].value = 90; local.rules.push(rule('local-only', 80));
    await set({ [prefix + '127.0.0.1']: local, [prefix + 'keep.example']: { rules: [rule('keep')] }, [queue]: [...data[queue], { url: 'https://www.bilibili.com/video/av999', title: '新增本地条目' }] });
    assert.match(await importText(JSON.stringify(exported)), /已导入合并/); data = await get();
    assert.equal(data[prefix + '127.0.0.1'].rules.find(item => item.id === 'saved-one').value, 50); assert.equal(data[prefix + '127.0.0.1'].rules.length, 2); assert.ok(data[prefix + 'keep.example']); assert.equal(data[queue].length, 4);
    await importText(JSON.stringify(exported)); assert.equal((await get())[queue].length, 4);
    check('Merge updates matching IDs, retains other rules/sites/videos, deduplicates repeated imports and preserves disabled state');
    const before = await get();
    assert.match(await importText(backup({ [queue]: [{ url: 'https://www.bilibili.com/video/av123', watched: 'yes' }] })), /操作失败/); assert.deepEqual(await get(), before);
    for (const text of ['{broken', JSON.stringify({ format: 'other', schemaVersion: 1, data: {} }), JSON.stringify({ format: exported.format, schemaVersion: 99, data: {} }), backup({ [prefix + 'new.example']: { rules: [rule('good')] }, [queue]: [{ kind: 'media', mediaUrl: 'javascript:alert(1)' }] }), backup({ [prefix + 'new.example']: { rules: [rule('good'), { ...rule('bad'), selector: '???' }] } }), backup({ unrelated: {} }), backup({ [prefix + 'new.example']: { rules: Array.from({ length: 101 }, (_, i) => rule('bad-' + i)) } })]) {
      assert.match(await importText(text), /操作失败/); assert.deepEqual(await get(), before);
    }
    check('Malformed JSON, wrong format/schema, unsafe media, invalid selectors, unknown keys and excess records reject the entire import without writes');
    const hundred = Array.from({ length: 100 }, (_, i) => rule('full-' + i));
    await set({ [prefix + 'full.example']: { rules: hundred } }); const capacityBefore = await get();
    assert.match(await importText(backup({ [prefix + 'new.example']: { rules: [rule('good')] }, [prefix + 'full.example']: { rules: [rule('overflow')] } })), /超过 100/); assert.deepEqual(await get(), capacityBefore);
    check('Merged capacity overflow rejects all sites atomically');
    const large = ' '.repeat(16 * 1024 * 1024 + 1); assert.match(await importText(large), /16 MB/); assert.deepEqual(await get(), capacityBefore);
    check('Oversized file is rejected before reading/importing');
    const manyVideos = Array.from({ length: 200 }, (_, i) => ({ url: 'https://www.bilibili.com/video/av' + (i + 10000) }));
    await set({ [queue]: manyVideos }); const videosBefore = await get();
    assert.match(await importText(backup({ [queue]: [{ url: 'https://www.bilibili.com/video/av999999' }] })), /超过 200/); assert.deepEqual(await get(), videosBefore);
    await set({ [queue]: before[queue] });
    check('Video merge capacity rejects rather than truncating saved videos');
    const quotaBefore = await get(), bigRules = Array.from({ length: 50 }, (_, i) => ({ ...rule('quota-' + i), thumbnail: 'data:image/png;base64,' + 'A'.repeat(220000) }));
    assert.match(await importText(backup({ [prefix + 'quota.example']: { rules: bigRules } })), /操作失败/); assert.deepEqual(await get(), quotaBefore);
    check('Real chrome.storage quota failure leaves every existing key unchanged');
    // A valid current-site import must apply without reload.
    await importText(backup({ [prefix + '127.0.0.1']: { enabled: true, rules: [{ ...first, enabled: true, value: 60, layers: [{ ...rule('layer-one', 60), level: 1 }] }] } }));
    await ui.locator('#tab-resize').click(); assert.equal(await ui.locator('#rule-count').textContent(), '2');
    await page.waitForFunction(() => document.querySelector('#nested-image').getBoundingClientRect().width < 200);
    await page.reload(); await open(); assert.equal(await ui.locator('#rule-count').textContent(), '2');
    check('Imported website changes apply immediately, refresh persists data and default page stays current-site records');
    await ui.locator('#tab-settings').click();
    const styles = await ui.locator('#backup-export').evaluate(node => { const s = getComputedStyle(node); return [s.backgroundColor, s.color, s.borderRadius, s.fontSize, s.fontWeight, node.offsetHeight]; });
    assert.deepEqual(styles, ['rgb(237, 244, 241)', 'rgb(55, 104, 89)', '8px', '12px', '500', 34]);
    await page.screenshot({ path: path.join(root, 'outputs/设置导入导出预览.png') });
    const tabId = await worker.evaluate(async url => (await chrome.tabs.query({ url }))[0].id, page.url());
    await worker.evaluate(id => chrome.tabs.setZoom(id, 1.5), tabId);
    await page.waitForTimeout(200);
    const zoomStyles = await ui.locator('#backup-export').evaluate(node => { const rect = node.getBoundingClientRect(), panel = node.getRootNode().getElementById('panel').getBoundingClientRect(); return { height: rect.height, inside: rect.left >= panel.left && rect.right <= panel.right }; });
    assert.ok(zoomStyles.inside); assert.ok(Math.abs(zoomStyles.height * 1.5 - 34) < 2);
    await page.screenshot({ path: path.join(root, 'outputs/设置导入导出150缩放验证.png') });
    await worker.evaluate(id => chrome.tabs.setZoom(id, 1), tabId);
    check('Settings backup controls retain screen size and fit the panel at real 150% browser zoom');
    await page.setViewportSize({ width: 375, height: 812 });
    await ui.locator('#backup-import').scrollIntoViewIfNeeded();
    for (const id of ['backup-export', 'backup-import']) { const b = await ui.locator('#' + id).boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= 375); }
    await page.screenshot({ path: path.join(root, 'outputs/设置导入导出窄窗验证.png') });
    check('Backup actions use shared button CSS and remain visible in a 375px window');
    // Demo adapter uses the same schema and supports the real extension backup.
    demoContext = await chromium.launchPersistentContext(path.join(__dirname, 'demo-profile-' + Date.now()), { executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, acceptDownloads: true, downloadsPath: path.join(__dirname, 'downloads'), env: { ...process.env } });
    const demo = await demoContext.newPage(); await demo.goto(origin + '/demo.html'); const demoUI = demo.locator('#point-resize-ui');
    await demoUI.locator('#tab-settings').click(); await demoUI.locator('#backup-file').setInputFiles({ name: 'real-extension-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
    await demo.waitForFunction(() => /已导入合并/.test(document.querySelector('#point-resize-ui').shadowRoot.getElementById('backup-status').textContent));
    assert.deepEqual(await demo.evaluate(() => JSON.parse(localStorage.getItem('point-resize:video-queue:v1'))), exported.data[queue]);
    const demoDownload = demo.waitForEvent('download'); await demoUI.locator('#backup-export').click(); const downloaded = await demoDownload; const demoFile = path.join(__dirname, 'demo-backup.json'); await downloaded.saveAs(demoFile);
    const demoBackup = JSON.parse(fs.readFileSync(demoFile)); assert.equal(demoBackup.data[queue].length, 3); assert.equal(demoBackup.format, exported.format);
    assert.match(await importText(JSON.stringify(demoBackup)), /已导入合并/);
    const fromDemo = await get(); assert.deepEqual(fromDemo[queue], before[queue]); assert.deepEqual(fromDemo[pos], demoBackup.data[pos]);
    const demoQuota = await demo.evaluate(async text => {
      const before = Object.fromEntries(Object.entries(localStorage)); let failed = false;
      try { await chrome.storage.local.set({ 'point-resize:v1:new.example': { rules: [] }, 'point-resize:v1:too-big.example': { rules: [], fill: text } }); } catch { failed = true; }
      return { failed, same: JSON.stringify(before) === JSON.stringify(Object.fromEntries(Object.entries(localStorage))) };
    }, 'A'.repeat(6 * 1024 * 1024));
    assert.deepEqual(demoQuota, { failed: true, same: true });
    check('Local demo imports extension backup and exports compatible JSON');
    assert.deepEqual(errors, []); fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ passed: report.length, checks: report, errors, screenshots: ['设置导入导出预览.png', '设置导入导出窄窗验证.png', '设置导入导出150缩放验证.png'] }, null, 2));
  } finally { if (demoContext) await demoContext.close(); if (context) await context.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
