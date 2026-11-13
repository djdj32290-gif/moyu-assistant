from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
def edit(name, old, new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old[:80]);p.write_text(s.replace(old,new),encoding='utf-8')

# Storage remains owned by the same canonical library and atomic writer.
edit('src/video-common.js','  function titleMode', '  const previewKey = "point-resize:hover-preview:v1";\n  function candidate(input) {\n    try { return parse(input); } catch(error) {\n      const url=webURL(new URL(String(input).trim(), "https://www.huya.com/").href);\n      if(!["www.huya.com","huya.com"].includes(url.hostname)||!/^\\/[A-Za-z][A-Za-z0-9_-]{0,79}\\/?$/.test(url.pathname))throw error;\n      url.protocol="https:";url.hostname="www.huya.com";url.search="";url.hash="";\n      return {kind:"live-pending",id:"huya-alias:"+url.pathname.replace(/\\/$/,""),url:url.href};\n    }\n  }\n  function group(item){return item.kind==="bilibili"?"bilibili":item.kind==="live"&&item.provider==="huya"?"huya":"other";}\n  function titleMode')
edit('src/video-common.js','{ key, viewKey, titleMode, parse,','{ key, viewKey, previewKey, candidate, group, titleMode, parse,')
edit('src/backup.js','} else if (key === positionKey)', '} else if (key === PointResizeVideoData.previewKey) {\n        if (!object(value)||Object.keys(value).length!==1||typeof value.images!=="boolean") fail("悬停预览设置无效。");\n        result[key]={images:value.images};\n      } else if (key === positionKey)')
edit('src/backup.js','key === PointResizeVideoData.viewKey || key === positionKey','key === PointResizeVideoData.viewKey || key === PointResizeVideoData.previewKey || key === positionKey')
edit('src/desktop/LibraryStore.cs','    static string Folder', '    public const string PreviewKey = "point-resize:hover-preview:v1";\n    static string Folder')
edit('src/desktop/LibraryStore.cs','key==QueueKey || key==ViewKey','key==QueueKey || key==ViewKey || key==PreviewKey')
edit('src/desktop/LibraryStore.cs','            else if(pair.Key==ViewKey)', '            else if(pair.Key==PreviewKey){var view=Obj(pair.Value);if(view.Count!=1||!view.ContainsKey("images")||!(view["images"] is bool))throw new InvalidDataException("悬停预览设置无效。");}\n            else if(pair.Key==ViewKey)')
edit('src/desktop/LibraryStore.cs','        } else if(action=="video-view")', '        } else if(action=="hover-preview") {if(!m.ContainsKey("images")||!(m["images"] is bool))throw new InvalidDataException("悬停预览设置无效。");data[PreviewKey]=new Dictionary<string,object>{{"images",m["images"]}};\n        } else if(action=="video-view")')
edit('src/library-api.js','      if(type==="VIDEO_QUEUE_VIEW")','      if(type==="POINT_RESIZE_HOVER_SET") {if(typeof message.images!=="boolean")throw new Error("悬停预览设置无效。");await transport({action:"hover-preview",images:message.images});return {ok:true};}\n      if(type==="VIDEO_QUEUE_VIEW")')
for name in ['src/video-background.js','src/desktop/panel-native.js']:
 edit(name,'VIDEO_QUEUE_|POINT_RESIZE_BACKUP_','VIDEO_QUEUE_|POINT_RESIZE_BACKUP_|POINT_RESIZE_HOVER_SET$')
edit('src/video-background.js','  if (sender.id !== chrome.runtime.id || typeof message?.type', '  if(sender.id===chrome.runtime.id&&message?.type==="POINT_RESIZE_HOVER_SET"){const operation=videoWrites.then(async()=>{if(typeof message.images!=="boolean")throw new Error("悬停预览设置无效。");await chrome.storage.local.set({[VQ.previewKey]:{images:message.images}});return {ok:true};});videoWrites=operation.catch(()=>{});return operation;}\n  if (sender.id !== chrome.runtime.id || typeof message?.type')

# Optical and geometric centering, with one source for all bitmap sizes.
edit('src/icons/fish.svg','translate(256 0)','translate(244.5 0)')
edit('src/build.py','x=256-x  #','x=244.5-x  #')

# Release identifiers, not storage/protocol identities.
for p in (root/'src').rglob('*'):
 if p.is_file() and p.suffix in {'.json','.cs','.md','.py','.js'}:
  s=p.read_text(encoding='utf-8-sig')
  if '0.18.4' in s:p.write_text(s.replace('0.18.4','0.18.5'),encoding='utf-8')
print('Updated canonical settings, icon and version')
