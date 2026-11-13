from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2];p=root/'work/native-video/verify.cjs';backup=root/'work/moyu-0185-baseline-20261113-123838/tests/native-video-verify.cjs'
if not backup.exists():shutil.copy2(p,backup)
s=p.read_text(encoding='utf-8');old="assert.equal(await ui.locator('#videos-page .vq-note').count(), 0);";new="assert.equal(await ui.locator('#videos-page .vq-note').count(), 1);assert.equal(await ui.locator('#videos-page .vq-note').innerText(),'支持 B站视频页、虎牙直播间页');"
assert old in s;s=s.replace(old,new).replace('Video picker precedes Collect current page, uses shared dark-green/white buttons, and both permanent notes are removed','Video picker precedes combined page collection, uses shared dark-green/white buttons, and the only note states supported page types')
p.write_text(s,encoding='utf-8')
