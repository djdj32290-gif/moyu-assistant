from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[2]
baseline=root/'work/moyu-0185-baseline-20261113-123838/tests';baseline.mkdir(exist_ok=True)
files=[*root.glob('work/software-main/verify*.cjs'),root/'work/panel-desktop/verify.cjs']
for p in files:
 shutil.copy2(p,baseline/(p.parent.name+'-'+p.name));s=p.read_text(encoding='utf-8').replace('0.18.4','0.18.5')
 if 'vq-live' in s:s=s.replace('#vq-live','#vq-current')
 if p.name=='verify.cjs' and p.parent.name=='panel-desktop':s=s.replace("await ui.locator('#vq-url').fill", "await ui.locator('#vq-add-card > summary').click();await ui.locator('#vq-url').fill")
 p.write_text(s,encoding='utf-8')
# These are fixture interactions with a card that is now deliberately collapsed.
for p in root.glob('work/software-main/verify*.cjs'):
 s=p.read_text(encoding='utf-8')
 # Explicit browser selection should open the connection card when needed.
 for prefix in ['ui', 'dui']:
  for control in ['browser-chrome','browser-edge']:
   old=f"await {prefix}.locator('#{control}').click()"
   new=f"await {prefix}.locator('#setup-card').evaluate(n=>n.open=true);"+old
   s=s.replace(old,new)
 s=s.replace("await ui.locator('#vq-url').fill", "await ui.locator('#vq-add-card').evaluate(n=>n.open=true);await ui.locator('#vq-url').fill")
 p.write_text(s,encoding='utf-8')
p=root/'work/software-main/run-final-0185.py';s=(root/'work/software-main/run-final-0184.py').read_text(encoding='utf-8').replace('0.18.4','0.18.5').replace('final-0184','final-0185').replace("'work/software-main/verify-sidebar-live.cjs'","'work/software-main/verify-capture-preview.cjs'")
p.write_text(s,encoding='utf-8')
print('Updated fixture versions and explicit disclosure interactions')
