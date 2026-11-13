from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
def edit(name,old,new):
    p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old[:100]);p.write_text(s.replace(old,new),encoding='utf-8')

p=root/'src/manifest.json';m=json.loads(p.read_text(encoding='utf-8'));m['name']='摸鱼助手';m['version']='0.18.0';m['action']['default_title']='摸鱼助手 · 打开软件';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ('src/desktop/PointResizeVideo.cs','src/desktop/PanelWindow.cs','src/desktop/panel.html','src/setup.html','src/setup.js','src/connection-icon.js'):
    p=root/name;s=p.read_text(encoding='utf-8').replace('0.17.4','0.18.0')
    s=s.replace('点选缩放视频助手','摸鱼助手').replace('点选缩放桌面视频助手','摸鱼助手').replace('点选缩放.exe','摸鱼助手.exe').replace('连接点选缩放','连接摸鱼助手').replace('“点选缩放”','“摸鱼助手”').replace('Text = "点选缩放','Text = "摸鱼助手').replace('<title>点选缩放</title>','<title>摸鱼助手</title>').replace("'点选缩放 ·", "'摸鱼助手 ·").replace('description="点选缩放"','description="摸鱼助手"')
    p.write_text(s,encoding='utf-8')
edit('src/setup.html','<body>','<body><main>')
edit('src/setup.html','<div class="actions"><button id="authorize" type="button">重新授权网页访问</button><button id="disconnect" type="button" hidden>断开连接</button><button id="uninstall" class="danger" type="button">解除本目录登记</button></div>','<div class="actions"><button id="authorize" type="button">重新授权网页访问</button></div>')
edit('src/setup.html','<script src="panel.js">','</main><script src="panel.js">')
edit('src/setup.js',"$('disconnect').hidden=!value;",'')
p=root/'src/setup.js';s=p.read_text(encoding='utf-8');s='\n'.join(line for line in s.split('\n') if not line.strip().startswith(("$('disconnect').onclick=","$('uninstall').onclick=")));p.write_text(s,encoding='utf-8')
edit('src/setup.css','body{width:360px;max-width:100vw;margin:0 auto;padding:16px;', 'html{min-height:100%}body{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;margin:0;padding:24px;')
edit('src/setup.css','h1{font-size:18px;', 'main{width:100%;max-width:480px;margin:auto}h1{font-size:18px;')

# All desktop-specific tab appearance stays in the common BUTTON_CSS.
edit('src/panel.js',"    dock: '<rect", "    pin: '<path d=\"m8 3 8 0-1 6 3 4H6l3-4-1-6ZM12 13v8\"/>',\n    move: '<path d=\"M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3\"/>',\n    dock: '<rect")
edit('src/panel.js','    .thumb-button,.editor-thumbnail{', '''    :host([data-desktop]) .panel-tab{background:#fff}
    :host([data-desktop]) .panel-tab:hover:enabled{background:#f4f8f6}
    :host([data-desktop]) .panel-tab:active:enabled{background:#e8f0ec}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab{border-radius:0}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab:first-child{border-top-right-radius:var(--button-radius)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab:last-child{border-bottom-right-radius:var(--button-radius)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]{border-right-color:var(--button-selected-border);border-left-color:transparent;box-shadow:inset -1px 0 0 var(--button-selected-border),inset 0 1px 0 var(--button-selected-border),inset 0 -1px 0 var(--button-selected-border)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]::after{right:auto;left:-1px}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]::before{left:auto;right:-1px}
    .thumb-button,.editor-thumbnail{''')
edit('src/panel.js','rail.style.left = Math.max(8 * uiScale, r.left - width - 8 * uiScale) / uiScale + "px";', 'rail.style.left = (host.dataset.tabSide === "right" ? r.right + 8 * uiScale : Math.max(8 * uiScale, r.left - width - 8 * uiScale)) / uiScale + "px";')
edit('src/panel.js','tabs.style.left = (r.left - 43 * uiScale) / uiScale + "px";', 'tabs.dataset.side = host.dataset.tabSide || "left";\n      tabs.style.left = (host.dataset.tabSide === "right" ? r.right - uiScale : r.left - 43 * uiScale) / uiScale + "px";')
edit('src/panel.js','      const editing = !$("resize-page").hidden', '      if (host.hasAttribute("data-desktop")) { syncTabs(); syncRail(); return; }\n      const editing = !$("resize-page").hidden')

edit('src/desktop/BrowserSetup.cs','"浏览器插件","点选缩放"','"浏览器插件","摸鱼助手"')
edit('src/desktop/BrowserSetup.cs','Program.Str(manifest,"name")!="点选缩放"','Program.Str(manifest,"name")!="摸鱼助手"')

p=root/'src/desktop/panel-app.js';s=p.read_text(encoding='utf-8')
s=s.replace('ui = PointResizePanel.create();','ui = PointResizePanel.create(); ui.host.dataset.desktop="true";')
s=s.replace('.panel-tabs{top:8px!important}', ':host([data-tab-side="right"]) .panel{left:8px!important;right:128px!important}.panel-tabs{top:8px!important}.brand-line{display:flex;align-items:center;gap:8px}.paired-browsers{display:grid;gap:8px;margin:12px 0}.paired-browser{display:flex;align-items:center;gap:8px}.browser-logo{width:20px;height:20px;flex:none}')
start=s.index("    const connection=document.createElement('div')")
end=s.index("    const setup=document.createElement('section')",start)
s=s[:start]+'''    const title=ui.$('brand-title'),line=document.createElement('span');line.className='brand-line';title.before(line);line.append(title);
    const light=document.createElement('span');light.id='connection-light';light.className='connection-light';light.setAttribute('role','img');light.setAttribute('aria-label','未连接，红灯');light.dataset.connected='false';line.append(light);
    const backups=document.createElement('section');backups.id='settings-backup';backups.hidden=true;
    for(const node of [...ui.$('settings-page').children])if(node.id!=='native-settings')backups.append(node);
    ui.$('settings-page').prepend(backups);
'''+s[end:]
s=s.replace('<p id="pairing-status" role="status"></p>','<p id="pairing-status" role="status"></p><div id="paired-browsers" class="paired-browsers" aria-label="已配对浏览器"></div>')
s=s.replace('选中的“点选缩放”文件夹','选中的“摸鱼助手”文件夹')
s=s.replace('finally{installing=false;button.disabled=connected;', 'finally{installing=false;button.disabled=false;')
s=s.replace("pairingError='';\n      const button", "if(pairing)return;pairing=true;pairingError='';\n      const button")
s=s.replace("finally{button.disabled=connected||pairing;if(!pairing&&!connected)button.textContent='② 配对浏览器插件';", "finally{button.disabled=pairing;if(!pairing)button.textContent='② 配对浏览器插件';")
s=s.replace('ui.$("dock").title = "切换窗口置顶";', 'ui.$("dock").innerHTML=ui.icon("pin");ui.$("dock").title = "取消窗口置顶";')
start=s.index("    ui.$('native-install').textContent='添加其他浏览器'")
end=s.index("    ui.$('preview-close').onclick", start)
s=s[:start]+'''    ui.$('native-install').remove();ui.$('native-toggle').remove();
    ui.$('native-settings').querySelector('strong').textContent='连接记录';
    ui.$('native-settings').querySelector('p').textContent='清除浏览器连接登记，保留软件资料和浏览器插件。删除软件前先清理，再关闭所有窗口并删除软件文件夹。';
    ui.$('native-status').textContent='';
    const status=document.createElement('p');status.id='portable-status';status.setAttribute('role','status');status.hidden=true;ui.$('browser-pair').parentElement.after(status);
    if(init.portable){const prepare=async()=>{try{await bridge.rpc('portable-prepare');}catch(error){status.hidden=false;status.textContent='连接入口准备失败：'+error.message+' 请点击“配对浏览器插件”重试。';}};prepare();}
    ui.$('native-uninstall').textContent='清除注册表记录';
    ui.$('native-uninstall').onclick=async()=>{const button=ui.$('native-uninstall');button.disabled=true;try{const result=await bridge.rpc('registration-clear');ui.$('native-status').textContent=result.simulated?'测试模式已记录清理目标，连接已断开，资料未删除。':'已清除指向本目录的浏览器连接记录。可关闭软件并删除文件夹；再次使用请重新配对。';}catch(error){ui.$('native-status').textContent='清理未完成：'+error.message;}finally{button.disabled=false;}};
'''+s[end:]
s=s.replace("connected=message.connected;pairing=!!message.pairing&&!connected;ui.$('connection-text').textContent=message.reason;", "connected=message.connected;pairing=!!message.pairing;ui.$('connection-light').title=message.reason;")
s=s.replace("ui.$('browser-install').disabled=connected||installing;ui.$('browser-pair').disabled=connected||pairing;", "ui.$('browser-install').disabled=installing;ui.$('browser-pair').disabled=pairing;")
s=s.replace("connected?'② 已配对':pairing?'② 配对中…':'② 配对浏览器插件'", "pairing?'② 配对中…':'② 配对浏览器插件'")
s=s.replace("if(connected){pairingError='';ui.$('pairing-status').textContent='配对成功，资料已同步。';", "if(connected&&!pairing){pairingError='';ui.$('pairing-status').textContent='';")
start=s.index("      ui.$('tab-resize').disabled=ui.$('tab-videos').disabled=!connected;")
end=s.index("      if(!connected){",start)
s=s[:start]+'''      ui.$('tab-resize').disabled=ui.$('tab-videos').disabled=!connected;ui.$('settings-backup').hidden=!connected;
      const browsers=ui.$('paired-browsers');browsers.replaceChildren();
      const counts={};for(const browser of message.browsers||[]){
        const row=document.createElement('div');row.className='paired-browser';
        const kind=browser.browser==='Edge'?'Edge':'谷歌浏览器',number=counts[kind]=(counts[kind]||0)+1;
        const logo=document.createElement('span');logo.className='browser-logo';logo.setAttribute('aria-hidden','true');
        logo.innerHTML=browser.browser==='Edge'?'<svg viewBox="0 0 24 24"><path fill="#168ac5" d="M21 15a9 9 0 1 1-1-9c-8-5-15 2-13 8 3-5 8-5 14-2Z"/><path fill="#24bba1" d="M21 15c-3 8-14 8-17 0 4 3 9 3 12 0-6 1-6-5-2-5 3 0 5 2 7 5Z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e9b735"/><path d="M12 12 2.5 6.5A11 11 0 0 1 22 7H12Z" fill="#e75a4a"/><path d="M12 12 6.5 21.5A11 11 0 0 1 2.5 6.5Z" fill="#4da66a"/><circle cx="12" cy="12" r="5" fill="#fff"/><circle cx="12" cy="12" r="3.7" fill="#3e91d8"/></svg>';
        const name=document.createElement('span');name.textContent=kind+(number>1?' '+number:'');
        const light=document.createElement('span');light.className='connection-light';light.dataset.connected=String(browser.connected);light.setAttribute('role','img');light.setAttribute('aria-label',browser.connected?'已连接，绿灯':'未连接，红灯');light.title=browser.connected?'已连接':'未连接';row.append(logo,name,light);browsers.append(row);
      }
'''+s[end:]
s=s.replace("    if(message.type==='panel-zoom')", "    if(message.type==='panel-side'){ui.host.dataset.tabSide=message.side;ui.syncControls();}\n    if(message.type==='panel-zoom')")
p.write_text(s,encoding='utf-8')

# Persist browser identities only in local connection metadata, outside backups.
p=root/'src/desktop/PanelWindow.cs';s=p.read_text(encoding='utf-8')
s=s.replace('    Rectangle mainShape;', '    Rectangle mainShape;\n    bool tabsRight,positioning;\n    readonly Dictionary<StreamWriter,string> clientIds=new Dictionary<StreamWriter,string>();\n    readonly Dictionary<string,string> knownBrowsers=new Dictionary<string,string>();')
s=s.replace('TopMost = !test;', 'TopMost = true;\n        try{Icon=Icon.ExtractAssociatedIcon(Program.ExecutablePath);}catch{}\n        try{var known=Program.Decode(File.ReadAllText(Path.Combine(data,"browser-connections.json")));foreach(var item in known)knownBrowsers[item.Key]=Convert.ToString(item.Value);}catch{}')
s=s.replace('LocationChanged += (s,e) => SavePosition();','LocationChanged += (s,e) => SavePosition();')
s=s.replace('    void Clamp() { var area', '''    [StructLayout(LayoutKind.Sequential)] struct MoveRect {public int Left,Top,Right,Bottom;}
    Rectangle PlaceBounds(Rectangle bounds) {
        var area=Screen.FromRectangle(bounds).WorkingArea;int oldOffset=Pixels(tabsRight?8:128),mainLeft=bounds.Left+oldOffset;
        bool next=tabsRight?mainLeft<area.Left+Pixels(176):mainLeft<area.Left+Pixels(128);
        if(next!=tabsRight){tabsRight=next;bounds.X+=oldOffset-Pixels(tabsRight?8:128);Post(new {type="panel-side",side=tabsRight?"right":"left"});}
        bounds.Width=Math.Min(bounds.Width,area.Width);bounds.Height=Math.Min(bounds.Height,area.Height);
        bounds.X=Math.Max(area.Left,Math.Min(bounds.X,area.Right-bounds.Width));bounds.Y=Math.Max(area.Top,Math.Min(bounds.Y,area.Bottom-bounds.Height));return bounds;
    }
    void Clamp() {if(positioning)return;positioning=true;try{Bounds=PlaceBounds(Bounds);}finally{positioning=false;}}
    void LegacyClampUnused() { var area''')
s=s.replace('if(reason==lastBrowserState)return;lastBrowserState=reason;\n        Post(new {type="browser-state",connected,pairing,browser=browserName,reason});', '''var browsers=new List<object>();foreach(var known in knownBrowsers){bool live=false;foreach(var client in clientIds)if(client.Value==known.Key&&syncedClients.Contains(client.Key)){live=true;break;}browsers.Add(new {browser=known.Value,connected=live});}
        string state=Program.Encode(new {type="browser-state",connected,pairing,browser=browserName,reason,browsers});
        if(state==lastBrowserState)return;lastBrowserState=state;Post(Program.Decode(state));''')
s=s.replace('if(Program.Str(shape,"kind")=="tabs")region.Union(new RectangleF(rect.Left+radius,rect.Top,Math.Max(1,rect.Width-radius),rect.Height));', 'if(Program.Str(shape,"kind")=="tabs")region.Union(new RectangleF(tabsRight?rect.Left:rect.Left+radius,rect.Top,Math.Max(1,rect.Width-radius),rect.Height));')
s=s.replace('region.Union(new RectangleF(rect.Left,rect.Top,radius,radius));','region.Union(new RectangleF(tabsRight?rect.Right-radius:rect.Left,rect.Top,radius,radius));')
s=s.replace('borderless=FormBorderStyle==FormBorderStyle.None}', 'borderless=FormBorderStyle==FormBorderStyle.None,topmost=TopMost,tabSide=tabsRight?"right":"left"}')
s=s.replace('else if(method=="portable-release"){result=Program.ReleasePortable();Broadcast(new {type="desktop-disconnect"});}', 'else if(method=="portable-release"||method=="registration-clear"){result=Program.ClearRegistration();Program.EndPairing();Broadcast(new {type="desktop-disconnect"});syncedClients.Clear();activeClient=null;activeSession="";browserName="";BrowserState();}')
s=s.replace('Post(new {type="panel-init",extensionId="desktop",version=Program.Version,portable=Program.Portable});','Post(new {type="panel-init",extensionId="desktop",version=Program.Version,portable=Program.Portable});Post(new {type="panel-side",side=tabsRight?"right":"left"});')
s=s.replace('else if(testing&&type=="panel-test-zoom")','else if(testing&&type=="panel-test-position"){Left=Convert.ToInt32(m["x"]);Top=Convert.ToInt32(m["y"]);Clamp();SavePosition();}\n                else if(testing&&type=="panel-test-zoom")')
s=s.replace('filename="点选缩放-设置备份-', 'filename="摸鱼助手-设置备份-')
s=s.replace('browserNames[writer]=Program.Str(m,"browser");', 'browserNames[writer]=Program.Str(m,"browser");\n                            string clientId=Program.Str(m,"clientId");if(Regex.IsMatch(clientId,"^[a-f0-9]{32}$")){clientIds[writer]=clientId;knownBrowsers[clientId]=browserNames[writer];File.WriteAllText(Path.Combine(data,"browser-connections.json"),Program.Encode(knownBrowsers));}BrowserState();')
s=s.replace('sessions.Remove(writer);browserNames.Remove(writer);', 'sessions.Remove(writer);browserNames.Remove(writer);clientIds.Remove(writer);')
s=s.replace('if(activeClient==writer){activeClient=null;', 'if(activeClient==writer){activeClient=null;')
s=s.replace('break;}BrowserState();} }));', 'break;}}BrowserState(); }));')
s=s.replace('        if(m.Msg==0x84', '        if(m.Msg==0x216){var r=(MoveRect)Marshal.PtrToStructure(m.LParam,typeof(MoveRect));var b=PlaceBounds(Rectangle.FromLTRB(r.Left,r.Top,r.Right,r.Bottom));r.Left=b.Left;r.Top=b.Top;r.Right=b.Right;r.Bottom=b.Bottom;Marshal.StructureToPtr(r,m.LParam,false);m.Result=new IntPtr(1);return;}\n        if(m.Msg==0x84')
p.write_text(s,encoding='utf-8')

p=root/'src/desktop/PointResizeVideo.cs';s=p.read_text(encoding='utf-8')
s=s.replace('if(Portable)PreparePortable();else PrepareProtocol();', 'string cleared=Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json");if(File.Exists(cleared))File.Delete(cleared);\n        if(Portable)PreparePortable();else PrepareProtocol();')
s=s.replace('string manifest=Path.Combine(Home,HostName+".json");var origins', 'if(File.Exists(Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json")))return new {ok=true,portable=true,cleared=true};\n        string manifest=Path.Combine(Home,HostName+".json");var origins')
idx=s.index('    static string BootstrapId(')
s=s[:idx]+'''    public static object ClearRegistration() {
        object result;
        if(Portable)result=ReleasePortable();else {if(!TestMode)UnregisterConnection();result=new {ok=true,released=true,simulated=TestMode};}
        PairingWrite(Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json"),new {cleared=true});return result;
    }
'''+s[idx:]
s=s.replace('Text = "摸鱼助手 · 视频待看";', 'try{Icon=Icon.ExtractAssociatedIcon(Program.ExecutablePath);}catch{}\n        Text = "摸鱼助手 · 视频待看";')
p.write_text(s,encoding='utf-8')
print('Updated source for 摸鱼助手 0.18.0')
