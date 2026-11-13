const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks = [], errors = [], check = name => { checks.push(name); console.log('PASS', name); };
let context;
(async () => {
  context = await chromium.launchPersistentContext(path.join(__dirname, 'profile-' + Date.now()), {
    executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
    viewport: { width: 1100, height: 800 }, env: { ...process.env }
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, 'src/demo.html')).href);
  const ui = page.locator('#point-resize-ui'); await ui.locator('#tab-settings').click();
  // State-response fixture only: no native processes, protocols, installer downloads or registry changes.
  await page.evaluate(() => {
    const root = document.querySelector('#point-resize-ui').shadowRoot;
    window.linkFixture = { connected: true, calls: [], fail: '', saved: 0 };
    chrome.runtime.id = 'a'.repeat(32);
    chrome.runtime.sendMessage = async ({ type }) => {
      const fixture = window.linkFixture; fixture.calls.push(type);
      if (fixture.fail === type) return { ok: false, error: '连接测试失败' };
      if (type === 'VIDEO_NATIVE_DISCONNECT' || type === 'VIDEO_NATIVE_UNINSTALL') fixture.connected = false;
      if (type === 'VIDEO_NATIVE_CONNECT') fixture.connected = true;
      return { ok: true, connected: fixture.connected, pendingUntil: type === 'VIDEO_NATIVE_INSTALLER' ? Date.now() + 900000 : 0 };
    };
    PointResizeNativeSettings.saveInstaller = () => { ++window.linkFixture.saved; };
    for (const id of ['native-install', 'native-toggle', 'native-uninstall']) root.getElementById(id).disabled = false;
    PointResizeNativeSettings.mount({ root, $: id => root.getElementById(id), syncControls() {} });
    window.emitLink = async connected => { window.linkFixture.connected = connected; await chrome.storage.local.set({ 'point-resize:desktop-link:v1': { enabled: connected, connected } }); };
  });
  const install = ui.locator('#native-install'), toggle = ui.locator('#native-toggle'), uninstall = ui.locator('#native-uninstall');
  await page.waitForFunction(() => document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-toggle').textContent === '断开桌面助手');
  assert.equal(await install.isDisabled(), true); assert.equal(await toggle.isDisabled(), false); assert.equal(await uninstall.isDisabled(), false);
  await page.evaluate(() => document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-install').onclick());
  assert.equal(await page.evaluate(() => linkFixture.calls.includes('VIDEO_NATIVE_INSTALLER')), false);
  check('Initial connected status disables Install and blocks redundant installer requests');
  await install.hover(); await page.waitForTimeout(180);
  assert.deepEqual(await install.evaluate(node => { const s = getComputedStyle(node); return [s.opacity, s.backgroundColor, s.borderRadius, s.fontSize]; }), ['0.45', 'rgb(237, 244, 241)', '8px', '12px']);
  await page.screenshot({ path: path.join(root, 'outputs/已连接时禁用安装助手.png') });
  check('Disabled Install uses the existing shared button style and ignores hover colors');
  await toggle.click(); await page.waitForFunction(() => !document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-install').disabled);
  assert.equal(await toggle.textContent(), '连接桌面助手');
  await toggle.click(); await page.waitForFunction(() => document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-toggle').textContent === '断开桌面助手');
  assert.equal(await install.isDisabled(), true); assert.equal(await toggle.isDisabled(), false);
  check('Disconnect enables Install; reconnect keeps Install disabled after the async operation finishes');
  await page.evaluate(() => emitLink(false)); assert.equal(await install.isDisabled(), false);
  await page.evaluate(() => emitLink(true)); assert.equal(await install.isDisabled(), true);
  await page.evaluate(() => { linkFixture.fail = 'VIDEO_NATIVE_DISCONNECT'; }); await toggle.click();
  await ui.locator('#native-status').filter({ hasText: '连接测试失败' }).waitFor();
  assert.equal(await install.isDisabled(), true); assert.equal(await toggle.isDisabled(), false);
  await page.evaluate(() => { linkFixture.fail = ''; });
  check('Cross-page state changes update Install; failed disconnect preserves the connected disabled state');
  await page.evaluate(() => emitLink(false)); await install.click();
  assert.equal(await install.isDisabled(), true); assert.equal(await uninstall.isDisabled(), true); assert.equal(await toggle.textContent(), '取消等待连接');
  await page.evaluate(() => { linkFixture.connected = true; });
  await page.waitForFunction(() => document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-toggle').textContent === '断开桌面助手');
  assert.equal(await install.isDisabled(), true); assert.equal(await toggle.isDisabled(), false); assert.equal(await uninstall.isDisabled(), false);
  assert.equal(await page.evaluate(() => linkFixture.saved), 1);
  check('Installation wait disables Install; successful automatic connection keeps it disabled after polling completes');
  await uninstall.click(); await page.waitForFunction(() => !document.querySelector('#point-resize-ui').shadowRoot.getElementById('native-install').disabled);
  assert.equal(await toggle.textContent(), '连接桌面助手'); assert.deepEqual(errors, []);
  check('Uninstall request returning to disconnected state enables Install; no uncaught errors');
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify({ passed: checks.length, checks, errors, scope: 'Actual settings DOM with deterministic status-response fixture; no real installation or native launch.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (context) await context.close(); });
