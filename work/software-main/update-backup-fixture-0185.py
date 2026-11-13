from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2];p=root/'work/backup/verify.cjs';backup=root/'work/moyu-0185-baseline-20261113-123838/tests/backup-verify.cjs'
if not backup.exists():shutil.copy2(p,backup)
s=p.read_text(encoding='utf-8');assert "ui.locator('[role=tab]')" in s;s=s.replace("ui.locator('[role=tab]')","ui.locator('#panel-tabs [role=tab]')");p.write_text(s,encoding='utf-8')
