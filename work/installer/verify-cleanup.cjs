const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('assert/strict');
const root = path.resolve(__dirname, '../..'), home = path.join(__dirname, 'cleanup-helper');
const marker = 'HKCU\\Software\\PointResize\\VideoHelper.Test', checks = [];
const check = name => { checks.push(name); console.log('PASS', name); };
const env = { ...process.env, POINT_RESIZE_TEST_MODE: '1', TEMP: path.join(__dirname, 'temp'), TMP: path.join(__dirname, 'temp') };
const build = JSON.parse(fs.readFileSync(path.join(__dirname, 'build-manifest.json'), 'utf8'));
const run = (...args) => cp.spawnSync(path.join(home, 'PointResizeVideo.exe'), args, { cwd: home, windowsHide: true, env });
const reg = (name, value) => cp.execFileSync('reg.exe', ['add', marker, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true });
let created = false, junction, player, panel;
(async () => {
try {
  assert.notEqual(cp.spawnSync('reg.exe', ['query', marker], { windowsHide: true }).status, 0, 'another test owns the marker');
  fs.mkdirSync(home, { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'outputs/点选缩放视频助手'))) {
    if (!['data', 'test-data'].includes(f)) fs.cpSync(path.join(root, 'outputs/点选缩放视频助手', f), path.join(home, f), { recursive: true });
  }
  reg('InstallLocation', home); created = true; reg('ProductCode', '{' + build.productCode + '}');
  const data = path.join(home, 'test-data'), cookie = path.join(data, 'webview/Cookies');
  fs.mkdirSync(path.dirname(cookie), { recursive: true }); fs.writeFileSync(cookie, 'fake login fixture');
  fs.writeFileSync(path.join(data, 'window-position.json'), '{"x":100,"y":200}');
  fs.writeFileSync(path.join(home, 'keep-user-file.txt'), 'preserve');
  fs.mkdirSync(path.join(home,'test-library'),{recursive:true});fs.writeFileSync(path.join(home,'test-library/library.json'),'saved settings and watch list fixture');
  fs.mkdirSync(path.join(home,'test-exports'),{recursive:true});fs.writeFileSync(path.join(home,'test-exports/keep.json'),'export fixture');
  const manifest = path.join(home, 'com.pointresize.video.test.json'); fs.writeFileSync(manifest, '{}');
  assert.equal(run('--uninstall').status, 0);
  const plan = JSON.parse(fs.readFileSync(path.join(data, 'uninstall-request.json')));
  assert.equal(plan.simulated, true); assert.equal(plan.arguments, '/x {' + build.productCode + '} /norestart'); assert(fs.existsSync(cookie));
  check('Folder shortcut command requests only the matching MSI; test mode never starts actual Windows uninstall');
  reg('ProductCode', '{00000000-0000-0000-0000-000000000000}');
  assert.equal(run('--uninstall-cleanup').status, 1); assert.equal(fs.readFileSync(cookie, 'utf8'), 'fake login fixture');
  check('Product mismatch refuses cleanup without touching login or cache fixtures');
  reg('ProductCode', '{' + build.productCode + '}'); reg('InstallLocation', home + '-other');
  assert.equal(run('--uninstall-cleanup').status, 1); assert(fs.existsSync(cookie));
  check('A different installation directory refuses cleanup');
  reg('InstallLocation', home);
  const outside = path.join(__dirname, 'cleanup-outside-sentinel'); fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'must survive');
  junction = path.join(data, 'webview/outside-link'); fs.symlinkSync(outside, junction, 'junction');
  assert.equal(run('--uninstall-cleanup').status, 1); assert(fs.existsSync(cookie)); assert.equal(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8'), 'must survive');
  assert(fs.lstatSync(junction).isSymbolicLink()); fs.rmdirSync(junction); junction = null;
  check('A junction anywhere in the data tree blocks deletion; its outside target and original fixtures remain intact');
  player = cp.spawn(path.join(home, 'PointResizeVideo.exe'), ['--test'], { cwd: home, windowsHide: true, env });
  const exited = new Promise(resolve => player.once('exit', resolve));
  let readyWindow;
  for (let i = 0; i < 150; i++) {
    try { const candidate=JSON.parse(fs.readFileSync(path.join(data, 'window.json')));if(candidate.pid===player.pid){readyWindow=candidate;break;} } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(readyWindow?.pid, player.pid);
  const panelSession='f'.repeat(32);panel=cp.spawn(path.join(home,'PointResizeVideo.exe'),['--panel-test',panelSession],{cwd:home,windowsHide:true,env});const panelExited=new Promise(resolve=>panel.once('exit',resolve));
  for(let i=0;i<150&&!fs.existsSync(path.join(data,'panel-'+panelSession+'.json'));i++)await new Promise(r=>setTimeout(r,100));assert(fs.existsSync(path.join(data,'panel-'+panelSession+'.json')));
  assert.equal(run('--uninstall-cleanup').status, 0);assert.equal(await panelExited,0); assert.equal(fs.existsSync(data), false); assert.equal(fs.existsSync(manifest), false);
  assert.equal(await exited, 0);
  assert.equal(fs.readFileSync(path.join(home, 'keep-user-file.txt'), 'utf8'), 'preserve');
  assert.equal(fs.readFileSync(path.join(home,'test-library/library.json'),'utf8'),'saved settings and watch list fixture');assert.equal(fs.readFileSync(path.join(home,'test-exports/keep.json'),'utf8'),'export fixture');
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'test-cleanup-request.json'))).simulatedUnregister, true);
  check('Cleanup closes actual test panel and video WebView2 windows, waits for its browser, deletes fake login/cache/position and host JSON, and preserves other files');
} finally {
  if (player && player.exitCode === null) player.kill();
  if (panel && panel.exitCode === null) panel.kill();
  if (junction && fs.lstatSync(junction).isSymbolicLink()) fs.rmdirSync(junction);
  if (created) cp.execFileSync('reg.exe', ['delete', marker, '/f'], { windowsHide: true });
  fs.writeFileSync(path.join(__dirname, 'cleanup-verification.json'), JSON.stringify({ version: build.version, timestamp: new Date().toISOString(), checks, scope: 'Owned independent test directory only; actual deletion of fake data; dedicated test registry marker removed. Unregister is recorded in test mode, msiexec is never executed; no user application uninstall or real user cache deletion.' }, null, 2));
}
})().catch(error => { console.error(error); process.exitCode = 1; });
