from pathlib import Path
import hashlib,re,json
root=Path(__file__).resolve().parents[2];baseline=root/'work/moyu-0181-baseline-20261112-180756/src'
changed=[]
for p in sorted((root/'src').rglob('*')):
 if p.is_file():
  relative=p.relative_to(root/'src');old=baseline/relative
  if not old.exists() or hashlib.sha256(old.read_bytes()).digest()!=hashlib.sha256(p.read_bytes()).digest():changed.append(str(relative))
old=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', (baseline/'panel.js').read_text(encoding='utf-8')).group(1)
new=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', (root/'src/panel.js').read_text(encoding='utf-8')).group(1)
assert old==new,'Operation button appearance must be unchanged'
oldmanifest=json.loads((baseline/'manifest.json').read_text(encoding='utf-8'));manifest=json.loads((root/'src/manifest.json').read_text(encoding='utf-8'))
assert oldmanifest['permissions']==manifest['permissions'] and oldmanifest['optional_host_permissions']==manifest['optional_host_permissions']
for name in ['content.js','picker.js','backup.js','video-player.js','video-background.js','video-native.js','desktop/LibraryStore.cs']:
 assert (baseline/name).read_bytes()==(root/'src'/name).read_bytes(),name
report={'version':'0.18.2','changedSourceFiles':changed,'sharedButtonCSSUnchanged':True,'permissionsUnchanged':True,'coreDOMLibraryVideoBackupSourcesUnchanged':True}
(root/'work/software-main/source-review-0182.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
