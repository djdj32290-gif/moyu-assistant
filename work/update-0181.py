from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def edit(n,a,b):
 p=root/n;s=p.read_text(encoding='utf-8');assert a in s,(n,a[:100]);p.write_text(s.replace(a,b),encoding='utf-8')
p=root/'src/manifest.json';m=json.loads(p.read_text(encoding='utf-8'));m['version']='0.18.1';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
edit('src/desktop/PointResizeVideo.cs','0.18.0','0.18.1')
edit('src/build.py','    def white(x,y):\n','    def white(x,y):\n        x=256-x  # The application fish faces left in every generated size.\n')
edit('src/icons/fish.svg','<g fill="none"','<g transform="translate(256 0) scale(-1 1)"><g fill="none"')
edit('src/icons/fish.svg','fill="#fff"/></svg>','fill="#fff"/></g></svg>')

edit('src/panel.js','    :host([data-desktop]) .mark{background:transparent}', '''    :host([data-desktop]) .desktop-pin[aria-pressed="true"]{background:var(--button-main-bg);border-color:var(--button-main-bg);color:var(--button-main-ink)}
    :host([data-desktop]) .desktop-pin[aria-pressed="true"]:hover:enabled{background:var(--button-main-hover);border-color:var(--button-main-hover)}
    :host([data-desktop]) .desktop-pin[aria-pressed="true"]:active:enabled{background:var(--button-main-pressed);border-color:var(--button-main-pressed)}''')

p=root/'src/desktop/panel-app.js';s=p.read_text(encoding='utf-8')
s=s.replace("pairingError='';", "pairingError='';",1)
s=s.replace('  function note(', '  let setupStep=1,setSetupStep=()=>{};\n  function note(',1)
s=s.replace('ui.$("brand-mark").innerHTML = \'<img src="app-icon.png" width="27" height="27" alt="摸鱼助手">\';', 'ui.$("brand-mark").innerHTML = ui.icon({resize:"pointer",videos:"video",settings:"settings"}[value]);')
s=s.replace('.paired-browsers{', '.setup-step{border:2px solid #e4e9e6;border-radius:12px;padding:12px;margin:10px 0;background:#f4f6f5}.setup-step[aria-current="step"]{border-color:#75a28d;background:#fff}.setup-step h3{margin:0 0 8px;font-size:13px;line-height:1.5}.setup-step p{margin:8px 0 0}.setup-step a{color:#376859;overflow-wrap:anywhere}.setup-step:not([aria-current="step"]){color:#667873}.step-note{font-size:11px}:host([data-moving="true"]) .panel{height:var(--moving-panel-height)!important;overflow:hidden!important}.paired-browsers{')
start=s.index("    setup.innerHTML=");end=s.index('    PointResizePanelShape(ui,bridge);',start)
s=s[:start]+'''    setup.innerHTML=`<section id="setup-step-1" class="setup-step" aria-current="step"><h3>① 选择浏览器</h3><button id="browser-install" class="primary" type="button" aria-expanded="false" aria-controls="browser-choices">安装浏览器插件</button><div id="browser-choices" hidden><div class="rule-actions"><button id="browser-chrome" type="button" aria-pressed="false">谷歌浏览器</button><button id="browser-edge" type="button" aria-pressed="false">Edge</button></div></div></section>
      <section id="setup-step-2" class="setup-step"><h3>② 打开扩展管理页</h3><p id="browser-select-note">先在第一步选择浏览器。</p><a id="browser-open" href="chrome://extensions/" hidden>打开谷歌浏览器扩展管理页</a><p id="browser-address" hidden></p><p class="step-note">点击链接会复制管理页地址，并打开浏览器及插件目录。若未进入管理页，在地址栏粘贴并回车；开启开发者模式，加载选中的插件文件夹。</p><p id="browser-setup-status" role="status"></p></section>
      <section id="setup-step-3" class="setup-step"><h3>③ 配对插件</h3><div class="rule-actions pairing-actions"><button id="browser-pair" type="button">③ 配对浏览器插件</button></div><p id="pairing-status" role="status"></p></section><div id="paired-browsers" class="paired-browsers" aria-label="已配对浏览器"></div>`;
    ui.$('settings-page').prepend(setup);
    let selectedBrowser='chrome';
    setSetupStep=value=>{setupStep=value;for(let step=1;step<=3;step++){const card=ui.$('setup-step-'+step);if(step===value)card.setAttribute('aria-current','step');else card.removeAttribute('aria-current');}};
    const revealSetup=()=>{setup.hidden=false;ui.$('browser-choices').hidden=false;ui.$('browser-install').setAttribute('aria-expanded','true');setSetupStep(1);};
    const selectBrowser=browser=>{selectedBrowser=browser;const edge=browser==='edge',url=edge?'edge://extensions/':'chrome://extensions/';ui.$('browser-select-note').textContent='已选择'+(edge?' Edge':'谷歌浏览器')+'。';ui.$('browser-open').hidden=false;ui.$('browser-open').href=url;ui.$('browser-open').textContent='打开'+(edge?' Edge':'谷歌浏览器')+'扩展管理页';ui.$('browser-address').hidden=false;ui.$('browser-address').textContent=url;for(const name of ['chrome','edge'])ui.$('browser-'+name).setAttribute('aria-pressed',String(name===browser));setSetupStep(2);};
    const beginPairing=async()=>{
      setSetupStep(3);if(pairing)return;pairing=true;pairingError='';
      const button=ui.$('browser-pair');button.disabled=true;button.textContent='③ 配对中…';button.setAttribute('aria-busy','true');
      try{await bridge.rpc('browser-pairing');ui.$('portable-status')?.setAttribute('hidden','');ui.$('pairing-status').textContent='已进入配对状态（10 分钟）。安装好插件后，在插件配对网页点“配对并授权”。';}
      catch(error){pairing=false;pairingError=error.message;ui.$('pairing-status').textContent='未能进入配对状态：'+error.message;}
      finally{button.disabled=pairing;if(!pairing)button.textContent='③ 配对浏览器插件';button.setAttribute('aria-busy',String(pairing));}
    };
    async function installPlugin(){
      if(installing)return;installing=true;const button=ui.$('browser-install');button.disabled=true;
      const link=ui.$('browser-open');link.setAttribute('aria-disabled','true');ui.$('browser-chrome').disabled=ui.$('browser-edge').disabled=true;
      try{const result=await bridge.rpc('browser-setup',{browser:selectedBrowser});
        ui.$('browser-setup-status').textContent=result.simulated?'测试模式已记录打开和复制地址请求，未修改日常剪贴板或打开浏览器。':((result.clipboardCopied?'地址已复制到剪贴板。':'地址未能复制，请手动复制上方地址。')+'插件目录已打开。'+(result.browserOpened?'已请求打开浏览器，未进入管理页时请粘贴地址。':'未能启动浏览器，请手动打开并粘贴地址。'));
        if(result.simulated||result.browserOpened)await beginPairing();
      }catch(error){ui.$('browser-setup-status').textContent=error.message;setSetupStep(2);}
      finally{installing=false;button.disabled=false;link.removeAttribute('aria-disabled');ui.$('browser-chrome').disabled=ui.$('browser-edge').disabled=false;}
    }
    ui.$('browser-install').onclick=revealSetup;ui.$('browser-pair').onclick=beginPairing;
    for(const browser of ['chrome','edge'])ui.$('browser-'+browser).onclick=()=>selectBrowser(browser);
    ui.$('browser-open').onclick=event=>{event.preventDefault();installPlugin();};
    ui.syncGeometry=PointResizePanelShape(ui,bridge);
'''+s[end+len('    PointResizePanelShape(ui,bridge);\n'):]
s=s.replace('ui.$("dock").innerHTML=ui.icon("pin");','ui.$("dock").classList.add("desktop-pin");ui.$("dock").innerHTML=ui.icon("pin");')
s=s.replace("else if(!wasConnected)chooseTab('resize');", "else if(!wasConnected){chooseTab('settings');setSetupStep(3);}")
s=s.replace("'② 配对中…':'② 配对浏览器插件'", "'③ 配对中…':'③ 配对浏览器插件'")
s=s.replace("    if(message.type==='panel-zoom')", "    if(message.type==='panel-move-state'){if(message.moving){const scale=parseFloat(getComputedStyle(ui.$('panel')).zoom)||1;ui.host.style.setProperty('--moving-panel-height',ui.$('panel').getBoundingClientRect().height/scale+'px');ui.host.dataset.moving='true';}else{delete ui.host.dataset.moving;ui.syncGeometry?.();}}\n    if(message.type==='panel-zoom')")
p.write_text(s,encoding='utf-8')
edit('src/desktop/panel-shape.js','  function schedule(){','  function schedule(force=false){if(force===true)last="";')
edit('src/desktop/panel-shape.js','schedule();return schedule;', 'schedule();return ()=>schedule(true);')

edit('src/desktop/BrowserSetup.cs','using Microsoft.Win32;','using Microsoft.Win32;\nusing System.Windows.Forms;\nusing System.Threading;')
edit('src/desktop/BrowserSetup.cs','url,browserArguments="--new-window', 'url,clipboardURL=url,clipboardSimulated=true,browserArguments="--new-window')
edit('src/desktop/BrowserSetup.cs','simulated=true,browserOpened=false','simulated=true,browserOpened=false,clipboardCopied=false,clipboardSimulated=true')
edit('src/desktop/BrowserSetup.cs','        Process.Start(new ProcessStartInfo(explorer,arguments)', '''        bool copied=false;string clipboardError="";
        for(int attempt=0;attempt<3&&!copied;attempt++)try{Clipboard.SetText(url);copied=true;}catch(Exception e){clipboardError=e.Message;if(attempt<2)Thread.Sleep(30);}
        Process.Start(new ProcessStartInfo(explorer,arguments)''')
edit('src/desktop/BrowserSetup.cs','browserError=error};','browserError=error,clipboardCopied=copied,clipboardError};')

p=root/'src/desktop/PanelWindow.cs';s=p.read_text(encoding='utf-8')
s=s.replace('    Rectangle mainShape;','    Rectangle mainShape;\n    bool railVisible;int visibleBottom;')
start=s.index('    Rectangle PlaceBounds(');end=s.index('    void Clamp()',start)
s=s[:start]+'''    Rectangle PlaceBounds(Rectangle bounds) {
        int oldOffset=Pixels(tabsRight?8:128);var area=Screen.FromRectangle(new Rectangle(bounds.Left+oldOffset,bounds.Top,Math.Max(1,bounds.Width-Pixels(136)),Math.Max(1,bounds.Height))).WorkingArea;
        bounds.Width=Math.Min(bounds.Width,area.Width);bounds.Height=Math.Min(bounds.Height,area.Height);
        int mainWidth=Math.Max(1,bounds.Width-Pixels(136)),margin=Pixels(8),mainLeft=bounds.Left+oldOffset;
        mainLeft=Math.Max(area.Left+margin,Math.Min(mainLeft,area.Right-mainWidth-margin));
        int gutter=Pixels(railVisible?120:44);bool next=mainLeft-gutter<area.Left+margin;
        if(next&&mainLeft+mainWidth+gutter>area.Right-margin&&mainLeft-gutter>=area.Left)next=false;
        if(next!=tabsRight){tabsRight=next;Post(new {type="panel-side",side=tabsRight?"right":"left"});}
        bounds.X=mainLeft-Pixels(tabsRight?8:128);
        int bottom=visibleBottom>0?Math.Min(bounds.Height,visibleBottom):bounds.Height;
        bounds.Y=Math.Max(area.Top,Math.Min(bounds.Y,area.Bottom-bottom-margin));return bounds;
    }
'''+s[end:]
s=s.replace('    void Geometry(Dictionary<string,object> m) {', '    void Geometry(Dictionary<string,object> m) {\n        if(inNativeMove)return;')
s=s.replace('var region=new Region(Rectangle.Empty);int count=0;', 'var region=new Region(Rectangle.Empty);int count=0;bool nextRail=false;int nextBottom=0;')
s=s.replace('            float radius=', '            nextRail|=Program.Str(shape,"kind")=="rail";nextBottom=Math.Max(nextBottom,(int)Math.Ceiling(rect.Bottom));\n            float radius=')
s=s.replace('var previous=Region;Region=region;', 'railVisible=nextRail;visibleBottom=nextBottom;var previous=Region;Region=region;')
s=s.replace('if(m.Msg==0x231){inNativeMove=true;', 'if(m.Msg==0x231){inNativeMove=true;Post(new {type="panel-move-state",moving=true});')
s=s.replace('            var b=PlaceBounds(proposed);r.Left=', '            var b=proposed;r.Left=')
s=s.replace('if(m.Msg==0x232){inNativeMove=false;Clamp();SavePosition();}', 'if(m.Msg==0x232){inNativeMove=false;Clamp();SavePosition();Post(new {type="panel-move-state",moving=false});}')
p.write_text(s,encoding='utf-8')

for name in ('src/desktop/这个文件夹是什么.md','src/desktop/使用说明.md','src/desktop/安装包说明.md','src/使用说明.md','src/安装说明.html'):
 p=root/name;s=p.read_text(encoding='utf-8').replace('0.18.0','0.18.1').replace('② 配对浏览器插件','③ 配对浏览器插件').replace('② 配对中','③ 配对中');p.write_text(s,encoding='utf-8')
with (root/'AGENTS.md').open('a',encoding='utf-8') as f:f.write('''
- 0.18.1 按用户授权，将软件首次连接改为①选择浏览器、②链接打开扩展管理页、③配对三张卡片，当前白底绿色边框、其他灰底但仍可返回操作。第一步只展开/选择；第二步明确点击才请求打开浏览器与本目录插件文件夹，并通过原生 Clipboard.SetText 写入对应 chrome://extensions/ 或 edge://extensions/，不新增扩展剪贴板权限。复制失败与浏览器内部地址过滤须如实提示，不能当作安装成功；测试模式仅记录剪贴板目标，不读取/覆盖日常剪贴板。请求打开后自动进入原有10分钟配对等待，取消、超时可在第三步重试。成功及重连留在设置页，不自动跳点选页。
- 0.18.1 恢复三个功能页标题原来的齿轮/点选/视频图标；软件、任务栏、扩展等应用小鱼图标保留，统一鱼头向左。置顶按下态按用户要求使用公共 BUTTON_CSS 的主深绿背景和白图标，取消后浅底。拖动原生移动循环内不换边、不校正边界、不更新原生区域，保持外形；松开后先校正可见主面板，再按侧栏空间换边，保持主面板位置。层级块与真实Region仍同步，保留大小/位置记忆与空白点击穿透。
''')
print('Updated 摸鱼助手 0.18.1 source')
