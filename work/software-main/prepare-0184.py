from pathlib import Path
root=Path(__file__).resolve().parents[2]
for p in (root/'src').rglob('*'):
 if p.is_file() and p.suffix in ('.js','.json','.cs','.md','.html'):
  s=p.read_text(encoding='utf-8');new=s.replace('0.18.3','0.18.4')
  if new!=s:p.write_text(new,encoding='utf-8')
