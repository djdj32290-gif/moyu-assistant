const fs = require('fs'), path = require('path'), cp = require('child_process'), net = require('net'), assert = require('assert/strict'), crypto = require('crypto');
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../..'), home = path.join(__dirname, 'controls-probe-helper');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn) { for (let i = 0; i < 150; i++) { try { const value = await fn(); if (value) return value; } catch {} await sleep(100); } throw Error('Probe timed out'); }
(async () => {
  fs.mkdirSync(home, { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'outputs/点选缩放视频助手'))) {
    if (['data', 'test-data'].includes(f)) continue;
    fs.cpSync(path.join(root, 'outputs/点选缩放视频助手', f), path.join(home, f), { recursive: true });
  }
  for (const f of ['player.html', 'player.css', 'player.js']) fs.copyFileSync(path.join(root, 'src/desktop', f), path.join(home, 'ui', f));
  fs.copyFileSync(path.join(root, 'src/video-common.js'), path.join(home, 'ui/video-common.js'));
  const sid = cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], { encoding: 'utf8', windowsHide: true }).trim();
  const child = cp.spawn(path.join(home, 'PointResizeVideo.exe'), ['--test'], { cwd: home, windowsHide: true, env: { ...process.env, TEMP: path.join(__dirname, 'temp'), TMP: path.join(__dirname, 'temp'), POINT_RESIZE_TEST_PORT: '9434' } });
  let socket, browser;
  try {
    socket = await until(() => new Promise((resolve, reject) => { const s = net.connect('\\\\.\\pipe\\PointResizeVideo-' + sid + '-test'); s.once('connect', () => resolve(s)); s.once('error', reject); })); socket.on('error', () => {});
    browser = await until(() => chromium.connectOverCDP('http://127.0.0.1:9434'));
    const page = browser.contexts()[0].pages()[0]; await page.waitForURL('https://point-resize.local/player.html');
    eval(fs.readFileSync(path.join(root, 'src/video-common.js'), 'utf8'));
    const item = PointResizeVideoData.item({ url: 'https://www.bilibili.com/video/BV1GJ411x7h7' });
    socket.write(JSON.stringify({ type: 'play', item, items: [item] }) + '\n');
    const frame = await until(() => page.frames().find(f => f.url().startsWith('https://player.bilibili.com/')));
    await frame.waitForFunction(() => document.querySelector('video')?.videoWidth > 0); await sleep(1200);
    const results = [];
    let defaultControls;
    for (const width of [null, 480, 744]) {
      if (width) socket.write(JSON.stringify({ type: 'test-size', width, height: width === 480 ? 300 : 474 }) + '\n'); await sleep(500);
      const bounds = await page.locator('iframe').boundingBox(); await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 22); await sleep(250);
      const state = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight, url: location.href, bodyClass: document.body.className,
        controls: [...document.querySelectorAll('[class*=control], [class*=progress], [class*=danmaku], [class*=dm-btn]')].map(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return { cls: el.className, text: el.textContent.slice(0, 65), display: s.display, visibility: s.visibility, opacity: s.opacity, width: r.width, height: r.height }; }).filter(el => el.width > 0 && el.height > 0).slice(0, 60)
      }));
      results.push(state); await page.screenshot({ path: path.join(__dirname, 'bili-controls-' + (width || 'default') + '.png') });
      if (width === null) {
        assert(state.width >= 450); assert.equal(new URL(state.url).searchParams.has('danmaku'), false);
        const progress = frame.locator('.bpx-player-progress-wrap'), danmaku = frame.locator('.bpx-player-dm-switch');
        assert.equal(await progress.isVisible(), true); assert.equal(await danmaku.isVisible(), true);
        await page.screenshot({ path: path.join(root, 'outputs/桌面视频B站原版控件验证.png') });
        const beforeSeek = await frame.locator('video').evaluate(v => v.currentTime), r = await progress.boundingBox();
        await progress.click({ position: { x: r.width * .25, y: r.height / 2 } });
        await frame.waitForFunction(t => document.querySelector('video').currentTime > t + 3, beforeSeek);
        defaultControls = { viewportWidth: state.width, viewportHeight: state.height, progressVisible: true, danmakuSwitchVisible: true, danmakuNotDisabled: true, beforeSeek, afterSeek: await frame.locator('video').evaluate(v => v.currentTime) };
      }
    }
    fs.writeFileSync(path.join(__dirname, 'player-controls-probe.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(__dirname, 'player-controls-verification.json'), JSON.stringify({ timestamp: new Date().toISOString(), version: JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'))).version, binarySHA256: crypto.createHash('sha256').update(fs.readFileSync(path.join(home, 'PointResizeVideo.exe'))).digest('hex'), defaultControls, cases: results.map(s => ({ width: s.width, height: s.height, controls: s.controls.filter(c => ['bpx-player-progress-wrap', 'bpx-player-dm-switch'].includes(c.cls)) })) }, null, 2));
    console.log('Verified original Bili controls:', JSON.stringify(defaultControls));
  } finally {
    if (socket) { socket.write(JSON.stringify({ type: 'test-close' }) + '\n'); await sleep(500); socket.destroy(); }
    if (browser) await browser.close().catch(() => {});
    if (child.exitCode === null) child.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
