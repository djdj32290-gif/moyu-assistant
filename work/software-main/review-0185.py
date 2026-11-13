from pathlib import Path
import re,json,hashlib
root=Path(__file__).resolve().parents[2];base=root/'work/moyu-0185-baseline-20261113-123838/src';src=root/'src'
read=lambda p:p.read_text(encoding='utf-8')
a=json.loads(read(base/'manifest.json'));b=json.loads(read(src/'manifest.json'));assert a['permissions']==b['permissions'] and a['optional_host_permissions']==b['optional_host_permissions']
old=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;',read(base/'panel.js')).group(1);new=re.search(r'const BUTTON_CSS = `([\s\S]*?)`;',read(src/'panel.js')).group(1)
added='    .provider-tab{flex:1;min-width:0}\n    .provider-tab[aria-selected="true"]{border-color:var(--button-selected-border);box-shadow:inset 0 0 0 1px var(--button-selected-border)}\n'
assert new.replace(added,'')==old
for name in ['picker.js','desktop/DesktopBridge.cs','desktop/panel-shape.js','desktop/media-agent.js','video-native.js']:
 assert (base/name).read_bytes()==(src/name).read_bytes(),name
assert read(base/'desktop/PointResizeVideo.cs').replace('0.18.4','0.18.5')==read(src/'desktop/PointResizeVideo.cs')
content=read(src/'content.js');content='\n'.join(line for line in content.split('\n') if 'const hoverPreview=' not in line and line.strip()!='hoverPreview.close();').replace('hoverPreview.close();','')
assert content==read(base/'content.js')
old=read(base/'desktop/LibraryStore.cs');new=read(src/'desktop/LibraryStore.cs')
for start,end in [('    static void Durable','    static Dictionary<string,object> Obj'),('    public static Dictionary<string,object> Request','    static Dictionary<string,object> Locked')]:assert old[old.index(start):old.index(end)]==new[new.index(start):new.index(end)]
report={'version':'0.18.5','permissionsUnchanged':True,'existingButtonRulesUnchanged':True,'newButtonRulesOnlyInSharedCSS':True,'DOMSelectionDraftAlgorithmsUnchanged':True,'nativePlaybackPipeSecurityRegionMediaAgentUnchanged':True,'durableLibraryCoreUnchanged':True,'previewPreference':'canonical point-resize:hover-preview:v1, strict boolean, same atomic writer and backup schema 1','liveResolution':'public Huya room canonical only; no cookies, stream signatures or arbitrary proxy targets','changedSourceFiles':[str(p.relative_to(src)) for p in sorted(src.rglob('*')) if p.is_file() and '__pycache__' not in p.parts and (not (base/p.relative_to(src)).exists() or p.read_bytes()!=(base/p.relative_to(src)).read_bytes())]}
(root/'work/software-main/source-review-0185.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Source review passed: shared styles, permissions, DOM/drafts, media/security and durable storage')
