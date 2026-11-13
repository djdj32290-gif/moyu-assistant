from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2]
base=root/'work/moyu-0187-baseline'
assert not base.exists(), 'Baseline already exists'
shutil.copytree(root/'src',base/'src')
shutil.copy2(root/'AGENTS.md',base/'AGENTS.md')
for p in (root/'src').rglob('*'):
 if p.is_file() and p.suffix in {'.json','.cs','.md','.py','.js'}:
  s=p.read_text(encoding='utf-8-sig')
  if '0.18.6' in s:p.write_text(s.replace('0.18.6','0.18.7'),encoding='utf-8')
print('Baseline retained; version prepared: 0.18.7')
