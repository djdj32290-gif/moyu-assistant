from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(n,a,b):
 p=root/n;s=p.read_text(encoding='utf-8');assert a in s,(n,a[:90]);p.write_text(s.replace(a,b),encoding='utf-8')
edit('src/desktop/build.py',"    for name in ('video-common.js'", "    shutil.copy2(ROOT / 'src/icons/128.png', ui / 'app-icon.png')\n    for name in ('video-common.js'")
edit('src/desktop/build.py',"['player.html', 'player.css'", "['app-icon.png', 'player.html', 'player.css'")
edit('src/desktop/build-installer.py',"('player.html', 'player.css'", "('app-icon.png', 'player.html', 'player.css'")
edit('src/desktop/panel-app.js','ui.$("brand-mark").innerHTML = ui.icon({ resize: "pointer", videos: "video", settings: "settings" }[value]);', 'ui.$("brand-mark").innerHTML = \'<img src="app-icon.png" width="27" height="27" alt="摸鱼助手">\';')
edit('src/panel.js','    :host([data-desktop]) .panel-tab{', '    :host([data-desktop]) .mark{background:transparent}\n    :host([data-desktop]) .panel-tab{')
for n in ('src/setup.html','src/popup.html','src/demo.html'):
 p=root/n;s=p.read_text(encoding='utf-8').replace('点选缩放','摸鱼助手').replace('</head>','<link rel="icon" href="icons/48.png"></head>');p.write_text(s,encoding='utf-8')
edit('src/setup.html','<h1>连接摸鱼助手</h1>','<h1><img src="icons/48.png" width="40" height="40" alt="">连接摸鱼助手</h1>')
edit('src/setup.css','h1{font-size:18px;', 'h1{display:flex;align-items:center;gap:12px;font-size:18px;')
edit('src/desktop/panel.html','</head>','<link rel="icon" href="app-icon.png"></head>')
p=root/'src/安装说明.html';s=p.read_text(encoding='utf-8').replace('点选缩放','摸鱼助手').replace('0.17.4','0.18.0');p.write_text(s,encoding='utf-8')
(root/'src/desktop/这个文件夹是什么.md').write_text('''# 摸鱼助手 0.18.0

打开旁边“摸鱼助手”文件夹，双击“摸鱼助手.exe”。请保留整个文件夹，不要单独移动 EXE。

## 第一次使用

1. 在软件设置点“① 安装浏览器插件”，选择谷歌浏览器或 Edge。打开扩展管理页，开启开发者模式，加载软件内“浏览器插件/摸鱼助手”。Chrome 没打开管理页时，在地址栏输入 chrome://extensions/；Edge 输入 edge://extensions/。
2. 软件点“② 配对浏览器插件”，再在插件配对网页点“配对并授权”。按浏览器提示确认，实际通信及资料同步后显示绿灯。
3. 同一个配对按钮还可以添加其他浏览器。下方图标与红绿灯分别显示浏览器连接情况。

未连接时只开放设置，导入导出在连接并同步后显示。已有浏览器保存缓存仍可自动应用网页规则。软件默认置顶，可点顶栏图钉取消；靠左时侧边标签会转到右侧。

## 文件夹里的内容

- 浏览器插件：安装到浏览器的扩展文件。
- 资料库：全部规则、截图、待看、已看标记和迁移恢复快照。
- data：软件自己的网页登录、缓存、位置和连接状态。
- 导出文件：自己导出的 JSON 备份。

移动前关闭浏览器、主面板和视频，移动整个软件文件夹及资料库。新位置运行后重新加载插件并配对。

更新时关闭所有窗口，覆盖程序、依赖、ui 和插件，保留“资料库、data、导出文件”。已有插件在原目录更新并重新加载，不先卸载或清空数据。从旧 MSI 版迁入时先复制完整“资料库”，保留原件。

## 不再使用

先备份需要的数据，在软件点“清除注册表记录”并确认成功，再移除所有浏览器里的本扩展，关闭浏览器和全部软件窗口，删除整个软件文件夹。删除会同时删除里面的资料库和缓存。清理只处理仍指向本目录的连接登记，不删除其他目录或其他软件的记录。

其他位置的旧副本、ZIP、另存备份和快捷方式需要自行处理；旧 MSI 版需单独从 Windows 设置卸载。Windows 和浏览器自己的历史、运行记录不保证自动清理。本软件不设置开机启动或常驻服务，不自动安装依赖，不修改系统安全策略或文件隔离标签。
''',encoding='utf-8')
p=root/'src/desktop/使用说明.md';s=p.read_text(encoding='utf-8').replace('# 点选缩放 0.17.4','# 摸鱼助手 0.18.0').replace('设置中的备份导入导出仍可用','备份导入导出在连接并同步后显示').replace('拖入“点选缩放”文件夹','拖入“摸鱼助手”文件夹');s=s.replace('软件显示浏览器未打开、未连接或已连接。','顶栏标题旁的灯表示连接状态；配对按钮下方分别显示已配对浏览器图标与状态，可重复点击同一个配对按钮添加浏览器。')
s=s.replace('标题可拖动或用方向键移动，置顶、关闭、位置及大小记忆保留；','标题与移动按钮可拖动或用方向键移动，默认置顶，图钉可取消；标签在靠左时翻到右边，位置及大小记忆保留；')
p.write_text(s,encoding='utf-8')
p=root/'src/使用说明.md';s=p.read_text(encoding='utf-8').replace('# 点选缩放 0.17.1','# 摸鱼助手 0.18.0').replace('把“点选缩放”固定到工具栏','把“摸鱼助手”固定到工具栏').replace('只开放设置与备份','只开放设置，连接同步后显示备份').replace('双击桌面或开始菜单的“点选缩放”打开软件','双击“摸鱼助手.exe”打开软件');p.write_text(s,encoding='utf-8')

# Test probe adapts to mirrored region and reads the actual native style/icon.
edit('work/software-main/RegionProbe.cs','var points=new List<Tuple<string,Point,bool>>();points.Add(Tuple.Create("empty-left",new Point(10,10),false));','bool rightSide=state.ContainsKey("tabSide")&&Convert.ToString(state["tabSide"])=="right";\n        var points=new List<Tuple<string,Point,bool>>();points.Add(Tuple.Create("empty-side",new Point(rightSide?w-10:10,10),false));')
edit('work/software-main/RegionProbe.cs','new Point(right-1,top),false','new Point(rightSide?left:right-1,top),false')
edit('work/software-main/RegionProbe.cs','new Point(right+5,(top+bottom)/2),false','new Point(rightSide?left-5:right+5,(top+bottom)/2),false')
edit('work/software-main/RegionProbe.cs','clicks=under.Clicks,dpi=state["dpi"]','clicks=under.Clicks,topmost=(GetWindowLongPtr(hwnd,-20).ToInt64()&8)!=0,icon=SendMessage(hwnd,0x7F,new IntPtr(1),IntPtr.Zero).ToInt64(),dpi=state["dpi"]')
print('Documentation, icon coverage and mirrored-window probe updated')
