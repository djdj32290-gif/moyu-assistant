const fs = require('fs'), path = require('path'), cp = require('child_process'), net = require('net');
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../..'), home = path.join(root, 'outputs/点选缩放视频助手');
const sid = cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], { encoding: 'utf8', windowsHide: true }).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const child = cp.spawn(path.join(home, 'PointResizeVideo.exe'), ['--test'], { cwd: home, windowsHide: true, env: { ...process.env, TEMP: path.join(__dirname, 'temp'), TMP: path.join(__dirname, 'temp'), POINT_RESIZE_TEST_PORT: '9432' } });
  child.on('exit', code => console.log('EXIT', code));
  let sock;
  for (let i = 0; i < 80; i++) {
    try { sock = await new Promise((res, rej) => { const s = net.connect('\\\\.\\pipe\\PointResizeVideo-' + sid + '-test'); s.once('connect', () => res(s)); s.once('error', rej); }); break; } catch { await sleep(250); }
  }
  if (!sock) throw Error('no native pipe');
  sock.on('data', d => console.log('NATIVE', String(d).trim()));
  const common = fs.readFileSync(path.join(root, 'src/video-common.js'), 'utf8'); eval(common);
  const item = PointResizeVideoData.item({ url: 'https://www.bilibili.com/video/BV1GJ411x7h7' });
  sock.write(JSON.stringify({ type: 'play', item, items: [item] }) + '\n');
  let browser;
  for (let i = 0; i < 80; i++) { try { browser = await chromium.connectOverCDP('http://127.0.0.1:9432'); break; } catch { await sleep(250); } }
  if (!browser) throw Error('no CDP');
  const page = browser.contexts()[0].pages()[0]; console.log('PAGES', browser.contexts()[0].pages().map(p => p.url()));
  await page.waitForTimeout(14000);
  for (const frame of page.frames()) {
    console.log('FRAME', frame.url());
    console.log('MEDIA', await frame.locator('video').evaluateAll(vs => vs.map(v => ({ time: v.currentTime, width: v.videoWidth, height: v.videoHeight, paused: v.paused, ready: v.readyState, error: v.error?.message }))));
  }
  await page.screenshot({ path: path.join(__dirname, 'prototype.png') });
  console.log('STATUS', await page.locator('#status').textContent());
  sock.write(JSON.stringify({ type: 'test-close' }) + '\n'); await sleep(1000); sock.destroy(); await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
