from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[2];baseline=root/'work/moyu-0183-baseline-20261113-112502/src';src=root/'src'
old=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', (baseline/'panel.js').read_text(encoding='utf-8')).group(1);new=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;', (src/'panel.js').read_text(encoding='utf-8')).group(1);assert old==new
a=json.loads((baseline/'manifest.json').read_text(encoding='utf-8'));b=json.loads((src/'manifest.json').read_text(encoding='utf-8'));assert a['permissions']==b['permissions'] and a['optional_host_permissions']==b['optional_host_permissions']
for name in ['content.js','picker.js','desktop/DesktopBridge.cs','desktop/panel-shape.js','desktop/media-agent.js','panel-background.js','video-native.js']:
 assert (baseline/name).read_bytes()==(src/name).read_bytes(),name
changed=[str(p.relative_to(src)) for p in sorted(src.rglob('*')) if p.is_file() and (not (baseline/p.relative_to(src)).exists() or p.read_bytes()!=(baseline/p.relative_to(src)).read_bytes())]
report={'version':'0.18.4','changedSourceFiles':changed,'sharedButtonCSSUnchanged':True,'permissionsUnchanged':True,'DOMSelectionDraftsPipeSecurityMediaAgentUnchanged':True,'liveProvider':'huya official numeric-room iframe; same-origin generic canonical metadata; no stream signatures saved','douyu':'not supported; no decoded embed found in this attempt'}
(root/'work/software-main/source-review-0184.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
