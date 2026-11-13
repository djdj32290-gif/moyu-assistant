using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

sealed class PanelWindow : Form {
    readonly Stopwatch startupClock=Stopwatch.StartNew();
    readonly WebView2 web = new WebView2();
    readonly List<StreamWriter> clients = new List<StreamWriter>();
    readonly string session, data, marker;
    readonly bool testing;
    bool ready, closing, surfaceReady;
    long firstPaint=-1;
    bool dataExistedAtPaint;
    string startupMessage="正在准备…";
    readonly Dictionary<StreamWriter,string> sessions=new Dictionary<StreamWriter,string>();
    readonly Dictionary<StreamWriter,string> browserNames=new Dictionary<StreamWriter,string>();
    readonly HashSet<StreamWriter> syncedClients=new HashSet<StreamWriter>();
    StreamWriter activeClient;
    string activeSession="", browserName="", playerId="";
    long libraryStamp=-1;
    string lastBrowserState="";
    bool returnFromVideo, warmingPlayer;
    string lastPlayerToken="";
    string pairingAttemptId="",lastPairingFeedback="";
    Rectangle mainShape;
    bool railVisible;int visibleBottom;
    bool tabsRight,positioning,inNativeMove,inNativeLoop;
    readonly Dictionary<StreamWriter,string> clientIds=new Dictionary<StreamWriter,string>();
    readonly Dictionary<string,string> knownBrowsers=new Dictionary<string,string>();
    readonly System.Windows.Forms.Timer refresh=new System.Windows.Forms.Timer{Interval=750};
    CoreWebView2Environment environment;
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd, int msg, IntPtr w, IntPtr l);
    public PanelWindow(string id, bool test) {
        session = id; testing = test; data = Path.Combine(Program.Home, test ? "test-data" : "data");
        marker = Path.Combine(data, "panel-" + session + ".json");
        Text = "摸鱼助手"; FormBorderStyle=FormBorderStyle.None; AutoScaleMode=AutoScaleMode.None; StartPosition = FormStartPosition.Manual; Size = new Size(Pixels(472), Pixels(640)); MinimumSize = new Size(Pixels(408), Pixels(300));
        var area = Screen.PrimaryScreen.WorkingArea; Location = new Point(area.Right - Width - 30, area.Top + 50); TopMost = true;
        try{Icon=Icon.ExtractAssociatedIcon(Program.ExecutablePath);}catch{}
        try{var known=Program.Decode(File.ReadAllText(Path.Combine(data,"browser-connections.json")));foreach(var item in known)knownBrowsers[item.Key]=Convert.ToString(item.Value);}catch{}
        try { var pos = Program.Decode(File.ReadAllText(Path.Combine(data, "panel-position.json"))); Location = new Point(Convert.ToInt32(pos["x"]), Convert.ToInt32(pos["y"]));tabsRight=Program.Str(pos,"tabSide")=="right"; if(pos.ContainsKey("width"))Size=new Size(Pixels(Convert.ToInt32(pos["width"])),Pixels(Convert.ToInt32(pos["height"]))); } catch {}
        Clamp(); BackColor=Color.White; DoubleBuffered=true; web.Dock = DockStyle.Fill;web.Visible=false; Controls.Add(web);
        StartupRegion();
        Activated += (s,e) => {if(surfaceReady)web.Focus();};
        LocationChanged += (s,e) => SavePosition();
        SizeChanged += (s,e) => SavePosition();
        DpiChanged += (s,e) => {MinimumSize=new Size(Pixels(408),Pixels(300));Clamp();if(!surfaceReady)StartupRegion();};
        SizeChanged += (s,e)=>{if(!surfaceReady)StartupRegion();};
        refresh.Tick+=(s,e)=>RefreshLocal();
        Shown += async (s,e) => {
            // Paint a real, clipped window before creating the runtime folders.
            Update();
            try {
                await Task.Run(()=>{
                    int delay;if(testing&&Int32.TryParse(Environment.GetEnvironmentVariable("POINT_RESIZE_PANEL_TEST_PREPARE_DELAY"),out delay))System.Threading.Thread.Sleep(Math.Max(0,Math.Min(5000,delay)));
                    if(!closing)Directory.CreateDirectory(data);
                });
                if(closing)return;
                RecordStartup("prepared");var server=Task.Run((Action)Serve);await Initialize();
            } catch (Exception error) { if(closing)return;Program.Log(error);startupMessage="准备未完成："+error.GetBaseException().Message+"\n按 Escape 关闭后重试。";Invalidate(); }
        };
        FormClosed += (s,e) => {
            Program.EndPairing(Process.GetCurrentProcess().Id);
            SavePosition(); closing = true; refresh.Stop(); uint browserProcessId = 0;
            try { if (web.CoreWebView2 != null) browserProcessId = web.CoreWebView2.BrowserProcessId; } catch {}
            Broadcast(new { type = "panel-closed", browserProcessId });
            foreach (var client in clients.ToArray()) try { client.Dispose(); } catch {}
            web.Dispose(); try { File.Delete(marker); } catch {}
        };
    }
    void StartupRegion() {
        var rect=new Rectangle(Pixels(tabsRight?8:128),Pixels(8),Math.Max(1,ClientSize.Width-Pixels(136)),Math.Max(1,Math.Min(ClientSize.Height-Pixels(16),Pixels(440))));
        mainShape=rect;int d=Math.Min(Pixels(20),Math.Min(rect.Width,rect.Height));
        using(var path=new GraphicsPath()){path.AddArc(rect.Left,rect.Top,d,d,180,90);path.AddArc(rect.Right-d,rect.Top,d,d,270,90);path.AddArc(rect.Right-d,rect.Bottom-d,d,d,0,90);path.AddArc(rect.Left,rect.Bottom-d,d,d,90,90);path.CloseFigure();var previous=Region;Region=new Region(path);if(previous!=null)previous.Dispose();}
        Invalidate();
    }
    protected override void OnPaint(PaintEventArgs e) {
        base.OnPaint(e);if(surfaceReady)return;
        if(firstPaint<0){firstPaint=startupClock.ElapsedMilliseconds;dataExistedAtPaint=Directory.Exists(data);}
        var title=new Rectangle(mainShape.Left+Pixels(20),mainShape.Top+Pixels(20),mainShape.Width-Pixels(40),Pixels(40));
        using(var font=new Font("Microsoft YaHei",12,FontStyle.Bold))TextRenderer.DrawText(e.Graphics,"摸鱼助手",font,title,Color.FromArgb(41,60,56),TextFormatFlags.Left|TextFormatFlags.VerticalCenter);
        var text=new Rectangle(title.Left,title.Bottom+Pixels(12),title.Width,Math.Max(Pixels(48),mainShape.Height-Pixels(100)));
        using(var font=new Font("Microsoft YaHei",9))TextRenderer.DrawText(e.Graphics,startupMessage,font,text,Color.FromArgb(102,120,115),TextFormatFlags.Left|TextFormatFlags.WordBreak);
    }
    protected override bool ProcessCmdKey(ref Message msg,Keys keyData) {if(!surfaceReady&&keyData==Keys.Escape){Close();return true;}return base.ProcessCmdKey(ref msg,keyData);}
    protected override void OnMouseDown(MouseEventArgs e) {base.OnMouseDown(e);if(!surfaceReady&&e.Button==MouseButtons.Left){ReleaseCapture();SendMessage(Handle,0xA1,new IntPtr(2),IntPtr.Zero);}}
    void RecordStartup(string phase) {if(testing)File.WriteAllText(Path.Combine(data,"panel-startup.json"),Program.Encode(new {phase,hwnd=Handle.ToInt64(),pid=Process.GetCurrentProcess().Id,firstPaintMilliseconds=firstPaint,elapsedMilliseconds=startupClock.ElapsedMilliseconds,dataExistedAtFirstPaint=dataExistedAtPaint}));}
    [StructLayout(LayoutKind.Sequential)] struct MoveRect {public int Left,Top,Right,Bottom;}
    Rectangle PlaceBounds(Rectangle bounds) {
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
    void Clamp() {if(positioning)return;positioning=true;try{Bounds=PlaceBounds(Bounds);}finally{positioning=false;}}
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetDpiForSystem();
    int Pixels(int value) {uint dpi=96;try{dpi=IsHandleCreated?GetDpiForWindow(Handle):GetDpiForSystem();}catch{}return (int)Math.Round(value*(dpi>0?dpi:96)/96.0);}
    void SavePosition() { if (!ready || closing || inNativeMove || WindowState != FormWindowState.Normal) return; try { File.WriteAllText(Path.Combine(data,"panel-position.json"), Program.Encode(new { x = Left, y = Top, width=(int)Math.Round(Width*100.0/Pixels(100)),height=(int)Math.Round(Height*100.0/Pixels(100)),tabSide=tabsRight?"right":"left" })); } catch (Exception e) { Program.Log(e); } }
    void Post(object value) {if(ready&&!closing)web.CoreWebView2.PostWebMessageAsJson(Program.Encode(value));}
    void RecordLifecycle(){if(testing&&Directory.Exists(data))File.WriteAllText(Path.Combine(data,"panel-lifecycle.json"),Program.Encode(new {pid=Process.GetCurrentProcess().Id,hwnd=Handle.ToInt64(),visible=Visible,nativeVisible=IsWindowVisible(Handle),returnFromVideo,ready,surfaceReady}));}
    void ShowPanel(){if(closing)return;returnFromVideo=false;if(WindowState==FormWindowState.Minimized)WindowState=FormWindowState.Normal;Show();Activate();RecordLifecycle();}
    void HideForVideo(){if(closing||!Visible)return;SavePosition();returnFromVideo=true;Hide();RecordLifecycle();}
    void WarmPlayer(){
        if(closing||warmingPlayer)return;warmingPlayer=true;
        Task.Run(()=>{try{for(int attempt=0;attempt<4&&!closing;attempt++){
            using(var pipe=new NamedPipeClientStream(".",Program.PipeName+(testing?"-test":""),PipeDirection.InOut,PipeOptions.Asynchronous)){try{pipe.Connect(150);string request=Guid.NewGuid().ToString("N");var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true};writer.WriteLine(Program.Encode(new {type="warm-owner",ownerPid=Process.GetCurrentProcess().Id,request}));var reply=Task.Run(()=>{var reader=new StreamReader(pipe,Encoding.UTF8);string line;while((line=reader.ReadLine())!=null){var message=Program.Decode(line);if(Program.Str(message,"type")=="warm-ready"&&Program.Str(message,"request")==request)return true;}return false;});if(reply.Wait(1000)&&reply.Result)return;}catch(TimeoutException){}catch(IOException){}catch(AggregateException){}}
            if(!closing)Process.Start(new ProcessStartInfo(Program.ExecutablePath,(testing?"--test-warm ":"--player-warm ")+Process.GetCurrentProcess().Id){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Program.Home});System.Threading.Thread.Sleep(300);
        }}catch(Exception e){Program.Log(e);}finally{warmingPlayer=false;}});
    }
    string PlayerToken(){try{var state=Program.Decode(File.ReadAllText(Path.Combine(data,"player-state.json")));int pid=Convert.ToInt32(state["pid"]);using(var process=Process.GetProcessById(pid)){if(process.HasExited)return "";}return pid+":"+Program.Str(state,"playToken")+":"+Program.Str(state,"id");}catch{return "";}}
    void RefreshLocal() {
        if(!ready||closing)return;
        string playerToken=PlayerToken();
        if(returnFromVideo&&playerToken==""){ShowPanel();WarmPlayer();}
        else if(playerToken!=""&&playerToken!=lastPlayerToken)HideForVideo();
        lastPlayerToken=playerToken;
        Program.PairingHeartbeat();
        BrowserState();
        if(pairingAttemptId!=""&&File.Exists(Program.PairingResultFile))try{
            var feedback=Program.Decode(File.ReadAllText(Program.PairingResultFile));
            string fingerprint=Program.Str(feedback,"time")+Program.Str(feedback,"stage");
            if(Program.Str(feedback,"attemptId")==pairingAttemptId&&fingerprint!=lastPairingFeedback){lastPairingFeedback=fingerprint;BrowserState();if(!Program.Flag(feedback,"ok")||activeClient==null||!syncedClients.Contains(activeClient))Post(new {type="pairing-feedback",error=Program.Flag(feedback,"ok")?"":Program.Str(feedback,"message"),text=Program.Str(feedback,"message")});}
        }catch(Exception e){Program.Log(e);}
        try {long stamp=LibraryStore.Stamp;if(libraryStamp!=stamp){var state=LibraryStore.Request(new Dictionary<string,object>{{"action","read"}});libraryStamp=LibraryStore.Stamp;Post(new {type="library-changed",data=state["data"],revision=state["revision"]});}}
        catch(Exception e){Post(new {type="library-error",error=e.Message});}
        try {string path=Path.Combine(data,"player-state.json");string id=File.Exists(path)?Program.Str(Program.Decode(File.ReadAllText(path)),"id"):"";if(id!=playerId){playerId=id;Post(new {type="runtime-message",message=new {type="VIDEO_NATIVE_STATE",id}});}}catch{}
    }
    void BrowserState(string reason=null) {
        if(!ready)return;
        bool pairing=Program.PairingWaiting;
        if(reason==null && activeClient==null) {
            bool running=false;
            foreach(string name in new[]{"chrome","msedge"})foreach(var process in Process.GetProcessesByName(name))using(process){running=true;}
            reason=running?"浏览器未连接。请在设置页加载插件并完成配对；连接后解锁另外两个标签。":"浏览器未打开。可点“安装浏览器插件”打开 Chrome；已配对浏览器启动后自动连接。";
        }
        bool connected=activeClient!=null&&syncedClients.Contains(activeClient);
        reason=connected?("已连接 "+browserName):pairing?"已进入配对状态。请点击红灯插件打开配对页，再点“配对并授权”。":reason??"正在同步浏览器资料，完成后可使用点选缩放和视频待看。";
        var browsers=new List<object>();foreach(var known in knownBrowsers){bool live=false;foreach(var client in clientIds)if(client.Value==known.Key&&syncedClients.Contains(client.Key)){live=true;break;}browsers.Add(new {browser=known.Value,connected=live});}
        string state=Program.Encode(new {type="browser-state",connected,pairing,browser=browserName,reason,browsers});
        if(state==lastBrowserState)return;lastBrowserState=state;Post(Program.Decode(state));
    }
    void ActivateBrowser(StreamWriter client) {
        if(activeClient==client||!sessions.ContainsKey(client))return;
        if(activeClient!=null)try{lock(activeClient)activeClient.WriteLine(Program.Encode(new {type="panel-browser-inactive"}));}catch{}
        activeClient=client;activeSession=sessions[client];browserName=browserNames[client];
        Post(new {type="panel-target",available=false,reason="正在连接当前浏览器网页…"});BrowserState();
        if(ready)lock(client)client.WriteLine(Program.Encode(new {type="panel-ready",replay=true}));
    }
    void Geometry(Dictionary<string,object> m) {
        if(inNativeMove)return;
        double vw=Convert.ToDouble(m["viewportWidth"]),vh=Convert.ToDouble(m["viewportHeight"]);if(vw<100||vh<100||vw>10000||vh>10000)return;
        double sx=ClientSize.Width/vw,sy=ClientSize.Height/vh;var shapes=m["shapes"] as IEnumerable;if(shapes==null)return;
        var region=new Region(Rectangle.Empty);int count=0;bool nextRail=false;int nextBottom=0;
        foreach(var value in shapes) {
            if(++count>5){region.Dispose();return;}var shape=value as Dictionary<string,object>;if(shape==null){region.Dispose();return;}
            double x=Convert.ToDouble(shape["x"]),y=Convert.ToDouble(shape["y"]),w=Convert.ToDouble(shape["width"]),h=Convert.ToDouble(shape["height"]);
            if(Double.IsNaN(x+y+w+h)||Double.IsInfinity(x+y+w+h)||x<0||y<0||w<=0||h<=0||x+w>vw+2||y+h>vh+2){region.Dispose();return;}
            var rect=new RectangleF((float)(x*sx),(float)(y*sy),(float)(w*sx),(float)(h*sy));
            nextRail|=Program.Str(shape,"kind")=="rail";nextBottom=Math.Max(nextBottom,(int)Math.Ceiling(rect.Bottom));
            float radius=(float)(Convert.ToDouble(shape["radius"])*Math.Min(sx,sy));radius=Math.Max(0,Math.Min(radius,Math.Min(rect.Width,rect.Height)/2));
            using(var path=new GraphicsPath()) { if(radius<1)path.AddRectangle(rect);else {float d=radius*2;path.AddArc(rect.Left,rect.Top,d,d,180,90);path.AddArc(rect.Right-d,rect.Top,d,d,270,90);path.AddArc(rect.Right-d,rect.Bottom-d,d,d,0,90);path.AddArc(rect.Left,rect.Bottom-d,d,d,90,90);path.CloseFigure();}region.Union(path); }
            if(Program.Str(shape,"kind")=="tabs")region.Union(new RectangleF(tabsRight?rect.Left:rect.Left+radius,rect.Top,Math.Max(1,rect.Width-radius),rect.Height));
            if(Program.Str(shape,"kind")=="panel"){mainShape=Rectangle.Round(rect);region.Union(new RectangleF(tabsRight?rect.Right-radius:rect.Left,rect.Top,radius,radius));}
        }
        railVisible=nextRail;visibleBottom=nextBottom;var previous=Region;Region=region;if(previous!=null)previous.Dispose();
        if(!surfaceReady){surfaceReady=true;web.Visible=true;web.Focus();RecordStartup("interactive");RecordLifecycle();BeginInvoke((Action)WarmPlayer);}
        if(testing)File.WriteAllText(Path.Combine(data,"panel-window.json"),Program.Encode(new {hwnd=Handle.ToInt64(),pid=Process.GetCurrentProcess().Id,x=Left,y=Top,width=Width,height=Height,dpi=Pixels(96),shapes=m["shapes"],viewportWidth=vw,viewportHeight=vh,borderless=FormBorderStyle==FormBorderStyle.None,topmost=TopMost,tabSide=tabsRight?"right":"left"}));
    }
    async Task PlayLocal(Dictionary<string,object> args) {
        await Task.Run(()=>{
            using(var pipe=new NamedPipeClientStream(".",Program.PipeName+(testing?"-test":""),PipeDirection.InOut,PipeOptions.Asynchronous)) {
                try{pipe.Connect(150);}catch(TimeoutException){Process.Start(new ProcessStartInfo(Program.ExecutablePath,testing?"--test":"--player"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Program.Home});pipe.Connect(15000);}
                var state=LibraryStore.Request(new Dictionary<string,object>{{"action","read"}});var library=(Dictionary<string,object>)state["data"];
                var message=new {type="play",request=Guid.NewGuid().ToString("N"),item=args["item"],items=library.ContainsKey(LibraryStore.QueueKey)?library[LibraryStore.QueueKey]:new object[0],canonical=true};
                var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true};writer.WriteLine(Program.Encode(message));
                var read=Task.Run(()=>{var reader=new StreamReader(pipe,Encoding.UTF8);string line;while((line=reader.ReadLine())!=null){var response=Program.Decode(line);if(Program.Str(response,"type")=="error")throw new IOException(Program.Str(response,"error"));if(Program.Str(response,"type")=="opened")return;}throw new IOException("播放器连接已断开。");});
                if(!read.Wait(20000))throw new IOException("播放器启动超时，尚未确认播放。");read.GetAwaiter().GetResult();
            }
        });
    }
    async void LocalRPC(Dictionary<string,object> m) {
        string request=Program.Str(m,"request"),method=Program.Str(m,"method");
        try {
            object result;
            if(method=="panel-zoom-get")result=new {ok=true,zoomFactor=web.ZoomFactor};
            else if(method=="library")result=LibraryStore.Request((Dictionary<string,object>)m["args"]);
            else if(method=="browser-setup")result=BrowserSetup.Open((Dictionary<string,object>)m["args"]);
            else if(method=="portable-prepare")result=Program.PreparePortable();
            else if(method=="browser-pairing"){var invitation=Program.BeginPairing();pairingAttemptId=Program.Str(invitation,"attemptId");lastPairingFeedback="";result=invitation;lastBrowserState="";BrowserState();}
            else if(method=="browser-pairing-cancel"){Program.EndPairing(Process.GetCurrentProcess().Id);pairingAttemptId="";lastPairingFeedback="";Broadcast(new {type="pairing-cancelled"});lastBrowserState="";BrowserState();result=new {ok=true,cancelled=true};}
            else if(method=="portable-release"||method=="registration-clear"){result=Program.ClearRegistration();Program.EndPairing();Broadcast(new {type="desktop-disconnect"});syncedClients.Clear();activeClient=null;activeSession="";browserName="";BrowserState();}
            else if(method=="native-local") {
                var args=(Dictionary<string,object>)m["args"];string type=Program.Str(args,"type");
                if(type=="VIDEO_NATIVE_PLAY"){await PlayLocal(args);lastPlayerToken=PlayerToken();HideForVideo();if(activeClient!=null)lock(activeClient)activeClient.WriteLine(Program.Encode(new {type="panel-pause-source",item=args["item"]}));result=new {ok=true,id=Program.Str((Dictionary<string,object>)args["item"],"id")};}
                else if(type=="VIDEO_NATIVE_UNINSTALL"){Program.StartUninstall();result=new {ok=true,uninstallStarted=true};}
                else throw new InvalidDataException("不支持的本机操作。");
            } else if(method=="browser-disconnect") {if(activeClient!=null)lock(activeClient)activeClient.WriteLine(Program.Encode(new {type="desktop-disconnect"}));result=new {ok=true};}
            else if(method=="open-url"&&activeClient==null){var uri=new Uri(Program.Str(m,"args"));if(uri.Scheme!="http"&&uri.Scheme!="https")throw new InvalidDataException("链接无效。");Process.Start(new ProcessStartInfo(uri.AbsoluteUri){UseShellExecute=true});result=new {ok=true};}
            else {
                if(activeClient==null)throw new IOException("浏览器未连接。请打开已配对的浏览器。");
                if(method=="page-event"){var args=(Dictionary<string,object>)m["args"];if(Program.Str(args,"browserSession")!=activeSession)throw new IOException("浏览器已切换，请在当前网页重新操作。");}
                lock(activeClient)activeClient.WriteLine(Program.Encode(m));return;
            }
            Post(new {type="panel-result",request,result});RefreshLocal();
        }catch(Exception e){Post(new {type="panel-result",request,error=e.GetBaseException().Message});}
    }
    async Task Initialize() {
        var options = new CoreWebView2EnvironmentOptions();
        string port = Environment.GetEnvironmentVariable("POINT_RESIZE_PANEL_TEST_PORT");
        if (testing && Regex.IsMatch(port ?? "", "^[0-9]{4,5}$")) options.AdditionalBrowserArguments = "--remote-debugging-port=" + port;
        environment = await CoreWebView2Environment.CreateAsync(null,Path.Combine(data,"panel-webview"),options);
        await web.EnsureCoreWebView2Async(environment);
        web.ZoomFactorChanged+=(s,e)=>BeginInvoke((Action)(()=>Post(new {type="panel-zoom",factor=web.ZoomFactor})));
        var core = web.CoreWebView2;
        core.DOMContentLoaded+=(s,e)=>{if(!closing)web.Visible=true;};
        core.SetVirtualHostNameToFolderMapping("point-resize.local",Path.Combine(Program.Home,"ui"),CoreWebView2HostResourceAccessKind.DenyCors);
        core.Settings.AreDevToolsEnabled = testing; core.Settings.AreHostObjectsAllowed = false; core.Settings.IsStatusBarEnabled = false;
        var exports = Path.Combine(Program.Home, testing ? "test-exports" : "导出文件"); core.Profile.DefaultDownloadFolderPath = exports;
        core.NewWindowRequested += (s,e) => { e.Handled = true; };
        core.NavigationStarting += (s,e) => { if (e.Uri != "https://point-resize.local/panel.html") e.Cancel = true; };
        core.PermissionRequested += (s,e) => { e.State = CoreWebView2PermissionState.Deny; };
        core.WebMessageReceived += (s,e) => {
            if (e.Source != "https://point-resize.local/panel.html") return;
            try {
                var m = Program.Decode(e.WebMessageAsJson); string type = Program.Str(m,"type");
                if (type == "panel-ui-ready") {
                    ready = true; File.WriteAllText(marker,Program.Encode(new { session, browserProcessId = core.BrowserProcessId }));
                    lastPlayerToken=PlayerToken();Post(new {type="panel-init",extensionId="desktop",version=Program.Version,portable=Program.Portable});Post(new {type="panel-side",side=tabsRight?"right":"left"});Post(new {type="panel-preferences",pin=TopMost});BrowserState();RefreshLocal();refresh.Start();if(activeClient!=null)lock(activeClient)activeClient.WriteLine(Program.Encode(new {type="panel-ready"}));
                } else if (type == "panel-close") Close();
                else if(type=="panel-geometry")Geometry(m);
                else if(testing&&type=="panel-test-size"){Size=new Size(Math.Max(Pixels(408),Math.Min(1800,Convert.ToInt32(m["width"]))),Math.Max(Pixels(300),Math.Min(1600,Convert.ToInt32(m["height"]))));Clamp();}
                else if(testing&&type=="panel-test-position"){Left=Convert.ToInt32(m["x"]);Top=Convert.ToInt32(m["y"]);Clamp();SavePosition();}
                else if(testing&&type=="panel-test-zoom"){double factor=Convert.ToDouble(m["factor"]);if(factor>=.5&&factor<=2)web.ZoomFactor=factor;}
                else if(type=="panel-resize"){int hit=Convert.ToInt32(m["hit"]);if(hit>=10&&hit<=17){ReleaseCapture();SendMessage(Handle,0xA1,new IntPtr(hit),IntPtr.Zero);}}
                else if (type == "panel-focus-ui") { Activate(); web.Focus(); }
                else if (type == "panel-drag") { ReleaseCapture(); SendMessage(Handle,0xA1,new IntPtr(2),IntPtr.Zero); }
                else if (type == "panel-move") { string key=Program.Str(m,"key"); Left += key=="ArrowLeft"?-16:key=="ArrowRight"?16:0; Top += key=="ArrowUp"?-16:key=="ArrowDown"?16:0; Clamp(); SavePosition(); }
                else if (type == "panel-pin") { TopMost = !TopMost; web.CoreWebView2.PostWebMessageAsJson(Program.Encode(new { type="panel-preferences",pin=TopMost })); }
                else if (type == "panel-rpc") {
                    string method=Program.Str(m,"method");
                    if(method=="save-backup" || method=="save-installer") SaveExport(m,method=="save-installer");
                    else LocalRPC(m);
                }
            } catch (Exception error) { Program.Log(error); }
        };
        core.Navigate("https://point-resize.local/panel.html");
    }
    void SaveExport(Dictionary<string,object> message, bool installer) {
        string request=Program.Str(message,"request");
        try {
            var args=message["args"] as Dictionary<string,object>; if(args==null) throw new InvalidDataException("导出内容无效。");
            string filename; byte[] bytes;
            if(installer) {
                filename=Program.Str(args,"filename"); if(!Regex.IsMatch(filename,"^PointResizeVideo-[a-p]{32}\\.msi$")) throw new InvalidDataException("安装包名称无效。");
                bytes=Convert.FromBase64String(Program.Str(args,"base64"));
                byte[] signature={0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1};
                if(bytes.Length<8 || bytes.Length>8*1024*1024) throw new InvalidDataException("安装包容量无效。");
                for(int i=0;i<signature.Length;i++) if(bytes[i]!=signature[i]) throw new InvalidDataException("安装包格式无效。");
            } else {
                string text=Program.Str(args,"text"); bytes=new UTF8Encoding(false).GetBytes(text);
                if(bytes.Length>16*1024*1024 || Program.Str(Program.Decode(text),"format")!="point-resize-backup") throw new InvalidDataException("备份格式或容量无效。");
                filename="摸鱼助手-设置备份-"+DateTime.Now.ToString("yyyyMMdd-HHmmss")+".json";
            }
            string folder=Path.Combine(Program.Home,testing?"test-exports":"导出文件"); Directory.CreateDirectory(folder);
            string destination=Path.Combine(folder,filename);
            if(!testing) using(var dialog=new SaveFileDialog { InitialDirectory=folder,FileName=filename,Filter=installer?"Windows 安装包|*.msi":"JSON 设置备份|*.json",OverwritePrompt=true,AddExtension=true }) {
                if(dialog.ShowDialog(this)!=DialogResult.OK) { web.CoreWebView2.PostWebMessageAsJson(Program.Encode(new {type="panel-result",request,result=new {ok=true,cancelled=true}})); return; }
                destination=dialog.FileName;
            }
            File.WriteAllBytes(destination,bytes);
            web.CoreWebView2.PostWebMessageAsJson(Program.Encode(new {type="panel-result",request,result=new {ok=true,path=destination}}));
        } catch(Exception error) { web.CoreWebView2.PostWebMessageAsJson(Program.Encode(new {type="panel-result",request,error=error.Message})); }
    }
    void Broadcast(object value) {
        string json = Program.Encode(value);
        foreach (var client in clients.ToArray()) try {
            lock(client) {
                if (json.Length < 180000) client.WriteLine(json);
                else {
                    string id=Guid.NewGuid().ToString("N"); var parts=new List<string>();
                    for(int offset=0;offset<json.Length;) {
                        int length=Math.Min(180000,json.Length-offset);
                        if(offset+length<json.Length && Char.IsHighSurrogate(json[offset+length-1])) length--;
                        parts.Add(json.Substring(offset,length)); offset+=length;
                    }
                    for(int i=0;i<parts.Count;i++) client.WriteLine(Program.Encode(new { type="panel-chunk", id, index=i, total=parts.Count, text=parts[i] }));
                }
            }
        } catch { clients.Remove(client); }
    }
    void Serve() {
        while (!closing) {
            NamedPipeServerStream pipe=null;
            try {
                var security=new PipeSecurity(); security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User,PipeAccessRights.FullControl,AccessControlType.Allow));
                pipe=new NamedPipeServerStream(Program.PipeName+"-panel-"+session,PipeDirection.InOut,8,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,65536,65536,security);
                pipe.WaitForConnection(); var connected=pipe; Task.Run(()=>Client(connected));
            } catch(Exception e) { if (!closing) Program.Log(e); if(pipe!=null) pipe.Dispose(); }
        }
    }
    void Client(NamedPipeServerStream pipe) {
        StreamWriter writer=null;
        try {
            using(pipe) {
                writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true}; var reader=new StreamReader(pipe,Encoding.UTF8);
                Invoke((Action)(()=>clients.Add(writer)));
                string line;
                while((line=reader.ReadLine())!=null && !closing) {
                    if(line.Length>32*1024*1024) break;
                    var m=Program.Decode(line); string type=Program.Str(m,"type");
                    Invoke((Action)(()=> {
                        if(type=="panel-close") Close();
                        else if(type=="browser-connected") {
                            sessions[writer]=Program.Str(m,"connectionId");
                            browserNames[writer]=Program.Str(m,"browser");
                            string clientId=Program.Str(m,"clientId");if(Regex.IsMatch(clientId,"^[a-f0-9]{32}$")){clientIds[writer]=clientId;knownBrowsers[clientId]=browserNames[writer];File.WriteAllText(Path.Combine(data,"browser-connections.json"),Program.Encode(knownBrowsers));}BrowserState();
                            if(Program.Flag(m,"synced"))syncedClients.Add(writer);
                            if(activeClient==null)ActivateBrowser(writer);
                        }
                        else if(type=="browser-synced"){syncedClients.Add(writer);BrowserState();}
                        else if(type=="browser-unsynced"){syncedClients.Remove(writer);BrowserState();}
                        else if(type=="pairing-check"){bool valid=syncedClients.Contains(writer)&&Program.PairingWaiting&&pairingAttemptId!=""&&Program.Str(m,"attemptId")==pairingAttemptId;lock(writer)writer.WriteLine(Program.Encode(new {type="desktop-result",request=Program.Str(m,"request"),result=valid?new {ok=true}:null,error=valid?null:"配对已取消、过期或软件尚未确认资料同步，请在软件重新选择浏览器。"}));}
                        else if(type=="browser-active")ActivateBrowser(writer);
                        else if(type=="panel-open" || type=="panel-focus") {if(sessions.ContainsKey(writer))ActivateBrowser(writer);ShowPanel();if(ready&&activeClient!=null)lock(activeClient)activeClient.WriteLine(Program.Encode(new {type="panel-ready"})); }
                        else if(ready && writer==activeClient) {
                            if(type=="panel-snapshot"){var snapshot=(Dictionary<string,object>)m["snapshot"];snapshot["browserSession"]=activeSession;}
                            web.CoreWebView2.PostWebMessageAsJson(Program.Encode(m));
                            if(type=="panel-init") web.CoreWebView2.PostWebMessageAsJson(Program.Encode(new {type="panel-preferences",pin=TopMost}));
                        }
                    }));
                }
            }
        } catch(Exception e) { if(!closing) Program.Log(e); }
        finally { if(!closing) try { Invoke((Action)(()=> { clients.Remove(writer);syncedClients.Remove(writer);sessions.Remove(writer);browserNames.Remove(writer);clientIds.Remove(writer);if(activeClient==writer){activeClient=null;activeSession="";browserName="";Post(new {type="panel-target",available=false,reason="浏览器连接已断开；软件和本地资料仍可使用。"});foreach(var other in clients)if(sessions.ContainsKey(other)){ActivateBrowser(other);break;}}BrowserState(); })); } catch {} }
    }
    protected override void WndProc(ref Message m) {
        if(m.Msg==0x231){inNativeLoop=true;inNativeMove=false;}
        // Keep Windows' proposed drag rectangle unchanged. The layout and
        // native region remain fixed until WM_EXITSIZEMOVE settles the window.
        if(m.Msg==0x216){if(inNativeLoop&&!inNativeMove){inNativeMove=true;Post(new {type="panel-move-state",moving=true});}m.Result=new IntPtr(1);return;}
        if(m.Msg==0x84&&!mainShape.IsEmpty){var p=PointToClient(new Point((short)((long)m.LParam&0xffff),(short)(((long)m.LParam>>16)&0xffff)));int grip=Pixels(6);bool l=p.X>=mainShape.Left&&p.X<mainShape.Left+grip,r=p.X<mainShape.Right&&p.X>=mainShape.Right-grip,t=p.Y>=mainShape.Top&&p.Y<mainShape.Top+grip,b=p.Y<mainShape.Bottom&&p.Y>=mainShape.Bottom-grip;int hit=t?(l?13:r?14:12):b?(l?16:r?17:15):l?10:r?11:0;if(hit!=0){m.Result=new IntPtr(hit);return;}}
        if(m.Msg==0x232){bool moved=inNativeMove;inNativeMove=false;inNativeLoop=false;Clamp();SavePosition();if(moved)Post(new {type="panel-move-state",moving=false});}base.WndProc(ref m);
    }
}
