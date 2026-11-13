from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
def edit(name,old,new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old[:80]);p.write_text(s.replace(old,new),encoding='utf-8')

edit('src/desktop/PanelWindow.cs','        if(activeClient==null)BrowserState();','        BrowserState();')
edit('src/desktop/PanelWindow.cs','if(activeClient==null||!syncedClients.Contains(activeClient))Post(new {type="pairing-feedback"','if(!Program.Flag(feedback,"ok")||activeClient==null||!syncedClients.Contains(activeClient))Post(new {type="pairing-feedback"')
p=root/'src/desktop/PanelWindow.cs';s=p.read_text(encoding='utf-8');s='\n'.join(line for line in s.split('\n') if 'void LegacyClampUnused()' not in line);p.write_text(s,encoding='utf-8')
edit('src/desktop/panel-app.js',"if(connected&&!pairing){pairingError='';", "if(connected&&!pairing&&!pairingError){")
edit('src/desktop/panel-app.js',".brand-line{", ".top{padding:12px;gap:6px}.top .drag-handle{flex:1;min-width:0}.brand-line{")
edit('src/desktop/panel-app.js','    ui.$("dock").innerHTML=ui.icon("pin");', '''    const move=document.createElement('button');move.id='panel-move';move.className='iconbutton video-move';move.innerHTML=ui.icon('move');move.setAttribute('aria-label','移动窗口，拖动或用方向键');move.title='拖动或用方向键移动';ui.$('close').before(move);
    move.onpointerdown=event=>{if(event.button===0)bridge.send({type:'panel-drag'});};move.onkeydown=event=>{if(/^Arrow/.test(event.key)){event.preventDefault();bridge.send({type:'panel-move',key:event.key});}};
    ui.$("dock").innerHTML=ui.icon("pin");''')
edit('src/desktop/panel-app.js','      ui.$("dock").title = message.pin ? "取消窗口置顶" : "窗口置顶";', '      ui.$("dock").title = message.pin ? "取消窗口置顶" : "窗口置顶";ui.$("dock").setAttribute("aria-label",ui.$("dock").title);')
edit('src/desktop/PointResizeVideo.cs','Encode(ReleasePortable())','Encode(ClearRegistration())')

# One deterministic vector drawing supplies every size and the EXE resource.
edit('src/build.py','import hashlib','import hashlib\nimport math')
p=root/'src/build.py';s=p.read_text(encoding='utf-8');start=s.index('def icon(size):');end=s.index('\n\ndef main():',start)
s=s[:start]+'''def icon(size):
    # Matches icons/fish.svg: a white line-drawn fish on blue, no external assets.
    points=[]
    def curve(a,b,c,d):
        for i in range(33):
            t=i/32;u=1-t
            points.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
    curve((72,128),(101,79),(161,79),(190,128))
    curve((190,128),(161,177),(101,177),(72,128))
    segments=list(zip(points,points[1:]))+[((72,128),(43,101)),((43,101),(43,155)),((43,155),(72,128))]
    def white(x,y):
        if (x-158)**2+(y-117)**2<=6**2:return True
        if not (36<=x<=197 and 85<=y<=171):return False
        for (ax,ay),(bx,by) in segments:
            if x<min(ax,bx)-6 or x>max(ax,bx)+6 or y<min(ay,by)-6 or y>max(ay,by)+6:continue
            dx=bx-ax;dy=by-ay;t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)))
            if (x-ax-t*dx)**2+(y-ay-t*dy)**2<=36:return True
        return False
    rows=[]
    for py in range(size):
        row=bytearray()
        for px in range(size):
            samples=[]
            for sy in range(3):
                for sx in range(3):
                    x=(px+(sx+.5)/3)*256/size;y=(py+(sy+.5)/3)*256/size
                    color=(38,132,215,255) if rounded(x,y,1,255,56) else (0,0,0,0)
                    if white(x,y):color=(255,255,255,255)
                    samples.append(color)
            row.extend(round(sum(c[k] for c in samples)/9) for k in range(4))
        rows.append(b"\\x00"+row)
    def chunk(kind,data):return struct.pack(">I",len(data))+kind+data+struct.pack(">I",zlib.crc32(kind+data))
    return b"\\x89PNG\\r\\n\\x1a\\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",size,size,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(b"".join(rows)))+chunk(b"IEND",b"")

def build_icons():
    folder=SOURCE/'icons';folder.mkdir(exist_ok=True)
    sizes=(16,32,48,128,256);images=[icon(size) for size in sizes]
    for size,png in zip(sizes,images):(folder/f'{size}.png').write_bytes(png)
    entries=[];offset=6+16*len(sizes)
    for size,png in zip(sizes,images):
        entries.append(struct.pack('<BBBBHHII',size%256,size%256,0,0,1,32,len(png),offset));offset+=len(png)
    (folder/'fish.ico').write_bytes(struct.pack('<HHH',0,1,len(sizes))+b''.join(entries)+b''.join(images))
'''+s[end:]
s=s.replace('    for size in (16, 48, 128):\n        (SOURCE / "icons" / f"{size}.png").write_bytes(icon(size))','    build_icons()')
p.write_text(s,encoding='utf-8')
(root/'src/icons/fish.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect x="1" y="1" width="254" height="254" rx="56" fill="#2684d7"/><g fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M72 128C101 79 161 79 190 128C161 177 101 177 72 128ZM72 128 43 101V155Z"/></g><circle cx="158" cy="117" r="6" fill="#fff"/></svg>\n',encoding='utf-8')

p=root/'src/desktop/build.py';s=p.read_text(encoding='utf-8').replace('from build import copy_extension','from build import copy_extension, build_icons')
s=s.replace('    OUT.mkdir(parents=True, exist_ok=True)','    build_icons()\n    OUT.mkdir(parents=True, exist_ok=True)')
s=s.replace("plugin = OUT / '浏览器插件/点选缩放'", "plugin = OUT / '浏览器插件/摸鱼助手'")
s=s.replace("'/out:' + str(OUT / 'PointResizeVideo.exe'),", "'/out:' + str(OUT / 'PointResizeVideo.exe'), '/win32icon:' + str(ROOT / 'src/icons/fish.ico'),")
start=s.index("    # The recommended portable bundle")
s=s[:start]+'''    # Whitelist only; never copy user data from a previously launched app.
    portable=OUT.parent/'摸鱼助手免安装版'/'摸鱼助手';portable.mkdir(parents=True,exist_ok=True)
    portable_files=[]
    for source in delivery_files:
        relative=source.relative_to(OUT)
        if source.suffix in ('.cmd','.ps1') or source.name=='这个文件夹是什么.md':continue
        if relative.as_posix()=='PointResizeVideo.exe':relative=Path('摸鱼助手.exe')
        target=portable/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);portable_files.append(target)
    marker=portable/'portable.json';marker.write_text(json.dumps({'format':'point-resize-portable','version':1})+'\\n',encoding='utf-8');portable_files.append(marker)
    readme=portable.parent/'这个文件夹是什么.md';shutil.copy2(SOURCE/'这个文件夹是什么.md',readme)
    hashes={p.relative_to(portable).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in portable_files}
    with zipfile.ZipFile(OUT.parent/f'摸鱼助手-免安装版-{version}.zip','w',zipfile.ZIP_DEFLATED) as archive:
        archive.write(readme,readme.name)
        for source in portable_files:archive.write(source,'摸鱼助手/'+source.relative_to(portable).as_posix())
    (WORK/'portable-build-manifest.json').write_text(json.dumps({'version':version,'folder':'摸鱼助手','files':hashes,'rootFiles':{readme.name:hashlib.sha256(readme.read_bytes()).hexdigest()}},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Portable application:',portable)
    print('Built:', OUT)

if __name__ == '__main__': main()
'''
p.write_text(s,encoding='utf-8')

# App-facing titles; feature tab "点选缩放" and all persistent keys stay stable.
for name in ('src/library-background.js','src/使用说明.md','src/安装说明.html','src/popup.html','src/demo.html','src/desktop/使用说明.md','src/desktop/这个文件夹是什么.md'):
    p=root/name;s=p.read_text(encoding='utf-8').replace('点选缩放.exe','摸鱼助手.exe').replace('新版点选缩放软件','新版摸鱼助手软件').replace('连接点选缩放软件','连接摸鱼助手软件').replace('“点选缩放”免安装软件','“摸鱼助手”免安装软件').replace('解除本目录登记','清除注册表记录')
    if p.suffix=='.md':s=s.replace('点选缩放-免安装版','摸鱼助手-免安装版').replace('浏览器插件/点选缩放','浏览器插件/摸鱼助手')
    p.write_text(s,encoding='utf-8')
with (root/'AGENTS.md').open('a',encoding='utf-8') as f:f.write('''
- 按用户最新要求，0.18.0 产品名和推荐免安装包、软件目录、EXE、插件展示名统一“摸鱼助手”；点选缩放保留为功能标签，既有资料库格式、协议、存储键与连接身份不改。蓝底白色线条小鱼由 src/icons/fish.svg 与同源构建绘图生成 PNG/ICO，EXE 内嵌并供主面板及视频任务栏使用。推荐 ZIP 顶层只有“这个文件夹是什么.md”和“摸鱼助手/”，说明不再放软件目录内。
- 0.18.0 上方配对按钮可反复为其他浏览器配对，等待期间禁用且显示配对中，已有连接不中断；下方按本地连接身份展示浏览器图标、名称和实际同步连接红绿灯。维护区仅“清除注册表记录”，清理自己目录的 Chrome/Edge 宿主和协议项，通知全部已连接扩展断开，不删除插件或资料库；清理后普通重开不自动恢复登记，显式配对才恢复。网页删除断开、解除登记按钮，保留重新授权。导入导出仅当前连接并同步后显示。主面板只在顶栏当前标题旁显示全局状态灯，不再跨每页占一行状态文字。
- 0.18.0 桌面标签背景按用户要求改白，公共 BUTTON_CSS 中集中定义桌面及左右侧的圆角、选中、hover/active 例外；其他按钮不变。靠左导致标签不可见时转右侧并重新计算真实 Region 和层级栏，保留移动、大小和位置记忆。顶栏提供置顶、移动、关闭，默认置顶，切换后真实 TopMost 更新。setup.html 内容水平垂直居中，小屏与展开帮助时保持可滚动。
''')
print('Build, branding and constraints updated')
