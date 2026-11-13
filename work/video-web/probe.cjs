const fs = require('node:fs'), path = require('node:path');
process.env.TEMP = process.env.TMP = path.join(__dirname, 'temp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = require('C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const context = await chromium.launchPersistentContext(path.join(__dirname, 'probe-profile-' + Date.now()), {
    executablePath: 'C:/Users/cx/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage(), requests = [], failures = [];
  page.on('request', request => { if (request.resourceType() === 'media' || /\.m3u8|\.mp4|\.webm|player\.bilibili/.test(request.url())) requests.push({ type: request.resourceType(), url: request.url() }); });
  page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  try {
    const response = await page.goto('https://xiaoheihe.cn/app/bbs/link/196563505', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(6000);
    const data = await page.evaluate(() => ({ title: document.title, url: location.href, text: document.body.innerText.slice(0, 2400),
      videos: [...document.querySelectorAll('video')].map(video => ({ outer: video.outerHTML, currentSrc: video.currentSrc, poster: video.poster, width: video.clientWidth, height: video.clientHeight })),
      frames: [...document.querySelectorAll('iframe')].map(frame => ({ src: frame.src, outer: frame.outerHTML })),
      links: [...document.querySelectorAll('a[href]')].filter(link => /bilibili|b23\.tv|\.mp4|\.webm/.test(link.href)).map(link => ({ url: link.href, text: link.textContent.slice(0, 100) }))
    }));
    fs.writeFileSync(path.join(__dirname, 'page.html'), await page.content());
    fs.writeFileSync(path.join(__dirname, 'probe.json'), JSON.stringify({ status: response?.status(), ...data, requests, failures: failures.slice(0, 15) }, null, 2));
    await page.screenshot({ path: path.join(__dirname, 'page.png') });
    console.log(JSON.stringify({ status: response?.status(), ...data, requests, failures: failures.slice(0, 5) }, null, 2));
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
