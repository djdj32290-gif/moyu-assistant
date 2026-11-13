from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[2];base=root/'work/moyu-0186-baseline-20261113-133558/src';src=root/'src'
read=lambda p:p.read_text(encoding='utf-8');css=lambda p:re.search(r'const BUTTON_CSS = `([\s\S]*?)`;',read(p)).group(1)
assert css(base/'panel.js')==css(src/'panel.js')
a=json.loads(read(base/'manifest.json'));b=json.loads(read(src/'manifest.json'));assert a['permissions']==b['permissions'] and a['optional_host_permissions']==b['optional_host_permissions']
unchanged=['desktop/DesktopBridge.cs','desktop/PanelWindow.cs','desktop/media-agent.js','picker.js','video-page.js','desktop/player.js','desktop/panel-app.js']
for name in unchanged:assert read(base/name).replace('0.18.5','0.18.6')==read(src/name),name
assert read(base/'desktop/PointResizeVideo.cs').replace('0.18.5','0.18.6')==read(src/'desktop/PointResizeVideo.cs')
old=read(base/'desktop/LibraryStore.cs');new=read(src/'desktop/LibraryStore.cs')
for start,end in [('    static void Durable','    static Dictionary<string,object> Obj'),('    public static Dictionary<string,object> Request','    static Dictionary<string,object> Locked')]:assert old[old.index(start):old.index(end)]==new[new.index(start):new.index(end)]
report={'version':'0.18.6','sharedButtonCSSUnchanged':True,'permissionsUnchanged':True,'existingSchemaNativePlayerPairingUnchanged':True,'durableLibraryCoreUnchanged':True,'newOptionalKey':'point-resize:hover-size:v1','scope':'Independent preview visibility, permission-scoped injection, wheel-resized preview frame and its optional canonical preference','sourceSHA256':{name:hashlib.sha256((src/name).read_bytes()).hexdigest() for name in ['panel.js','content.js','background.js','library-background.js','desktop/LibraryStore.cs','backup.js','library-api.js','video-background.js','video-common.js','desktop/panel-native.js']}}
(root/'work/software-main/source-review-0186.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Source review passed: permissions, button CSS, existing durable library core, pairing and native playback unchanged; optional preview size added')
