const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
process.env.TEMP = process.env.TMP = path.join(root, 'work/browser-temp');
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const extension = path.join(root, 'src');
  const context = await chromium.launchPersistentContext(path.join(root, 'work/permission-profile-' + Date.now()), {
    executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], env: { ...process.env }
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).hostname;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/popup.html`);
    const generated = await page.evaluate(() => ({
      http: PointResizeAccess.patternFor('http://permission-test.invalid/path'),
      https: PointResizeAccess.patternFor('https://permission-test.invalid/path'),
      ipv6: PointResizeAccess.patternFor('http://[::1]:8080/path')
    }));
    assert.equal(generated.http, 'http://permission-test.invalid/*');
    assert.equal(generated.https, 'https://permission-test.invalid/*');
    assert.equal(generated.ipv6, 'http://[::1]/*');
    await page.evaluate(() => {
      window.results = {};
      for (const [name, origin] of [['wildcard', '*://permission-test.invalid/*'], ['explicit', PointResizeAccess.patternFor('https://permission-test.invalid/')]]) {
        const button = document.createElement('button'); button.id = name; button.textContent = name;
        button.onclick = () => {
          window.results[name] = { state: 'pending' };
          chrome.permissions.request({ origins: [origin] }).then(granted => {
            window.results[name] = { state: 'resolved', granted };
          }, error => { window.results[name] = { state: 'rejected', error: error.message }; });
        };
        document.body.append(button);
      }
    });
    await page.locator('#wildcard').click();
    await page.waitForTimeout(350);
    const old = await page.evaluate(() => results.wildcard);
    console.log('Original wildcard request:', old);
    assert.equal(old.state, 'rejected');
    assert.match(old.error, /Only permissions specified in the manifest/i);
    await page.locator('#explicit').click();
    await page.waitForTimeout(600);
    const fixed = await page.evaluate(() => results.explicit);
    console.log('Matching-scheme request:', fixed);
    assert.notEqual(fixed.state, 'rejected');
    const result = { old, fixed, manifest: await worker.evaluate(() => chrome.runtime.getManifest().optional_host_permissions) };
    fs.writeFileSync(path.join(root, 'work/permission-verification.json'), JSON.stringify(result, null, 2));
    console.log('PASS optional-host manifest validation on an unmodified, fresh extension installation');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
