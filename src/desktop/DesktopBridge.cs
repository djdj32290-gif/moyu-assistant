using System;
using System.IO;
using System.IO.Pipes;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

// Browser-owned, headless relay. Connecting never opens an application window.
sealed class DesktopBridge {
    readonly Stream input, output;
    readonly Dictionary<string,object> hello;
    readonly object gate=new object();
    StreamWriter panel;
    bool stopped,synced;
    public DesktopBridge(Stream i,Stream o,Dictionary<string,object> h) { input=i;output=o;hello=h; }
    public static string Session { get { return Program.Testing?"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee":"dddddddddddddddddddddddddddddddd"; } }
    public static string PanelPipe { get { return Program.PipeName+"-panel-"+Session; } }
    public static void Open(bool launch=true) {
        int attempts=launch?1:20;
        while(attempts-->0) {
        using(var pipe=new NamedPipeClientStream(".",PanelPipe,PipeDirection.InOut,PipeOptions.Asynchronous)) {
            try { pipe.Connect(150); using(var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true}) writer.WriteLine(Program.Encode(new { type="panel-focus" })); return; } catch(TimeoutException) {}
        }
        }
        if(!launch)return;
        Process.Start(new ProcessStartInfo(Program.ExecutablePath,(Program.Testing?"--panel-test ":"--panel ")+Session){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,WorkingDirectory=Program.Home});
    }
    void Send(object value) { lock(gate) Program.SendChunked(output,value); }
    public void Run() {
        Send(new {type="desktop-ready",protocol=2,version=Program.Version,library=true});
        Task.Run((Action)Follow);
        Task.Run((Action)Monitor);
        try {
            byte[] packet; while((packet=Program.ReadPacket(input))!=null) {
                var m=Program.Decode(Encoding.UTF8.GetString(packet)); string type=Program.Str(m,"type");
                if(type=="library") {
                    try { Send(new {type="desktop-result",request=Program.Str(m,"request"),result=LibraryStore.Request((Dictionary<string,object>)m["args"])}); }
                    catch(Exception e) { Send(new {type="desktop-result",request=Program.Str(m,"request"),error=e.Message}); }
                } else if(type=="browser-synced"||type=="browser-unsynced") {lock(gate){synced=type=="browser-synced";if(panel!=null)panel.WriteLine(Program.Encode(m));}}
                else if(type=="pairing-check") {
                    Task.Run(()=>{
                        try{if(Program.Testing&&File.Exists(Path.Combine(Program.Home,"test-data","reject-pair-check")))throw new IOException("测试：EXE 主面板未确认配对。");for(int n=0;n<40&&!stopped;n++){lock(gate){if(panel!=null){panel.WriteLine(Program.Encode(m));return;}}Thread.Sleep(100);}Send(new {type="desktop-result",request=Program.Str(m,"request"),error="尚未连通 EXE 主面板。请确认软件和插件来自同一目录，查看 data/last-error.txt 后重试；未确认配对成功。"});}
                        catch(Exception e){Send(new {type="desktop-result",request=Program.Str(m,"request"),error="软件窗口连接失败："+e.Message});}
                    });
                }
                else if(type=="panel-open"||type=="panel-focus") {
                    // A failed foreground request must never terminate the browser relay.
                    try {
                        if(Program.Testing&&File.Exists(Path.Combine(Program.Home,"test-data","reject-panel-open")))throw new UnauthorizedAccessException("测试：窗口通信访问被拒绝。");
                        Open();
                        lock(gate)if(panel!=null)panel.WriteLine(Program.Encode(m));
                        Send(new {type="desktop-result",request=Program.Str(m,"request"),result=new {ok=true}});
                    } catch(Exception e) {Program.Log(e);Send(new {type="desktop-result",request=Program.Str(m,"request"),error="未能唤出软件："+e.Message+" 浏览器连接已保留；请从同一软件目录打开 EXE。"});}
                }
                else { lock(gate) if(panel!=null) panel.WriteLine(Program.Encode(m)); }
            }
        } finally { stopped=true; lock(gate) if(panel!=null) try {panel.Dispose();} catch {} }
    }
    void Follow() {
        while(!stopped) {
            try {
                using(var pipe=new NamedPipeClientStream(".",PanelPipe,PipeDirection.InOut,PipeOptions.Asynchronous)) {
                    pipe.Connect(400); var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true};
                    lock(gate) { if(stopped)return; panel=writer; writer.WriteLine(Program.Encode(new {type="browser-connected",clientId=Program.Str(hello,"clientId"),extensionId=Program.Str(hello,"extensionId"),browser=Program.Str(hello,"browser"),connectionId=Program.Str(hello,"connectionId"),synced=synced||!Program.Flag(hello,"syncAcknowledgement")})); }
                    var reader=new StreamReader(pipe,Encoding.UTF8); string line; while(!stopped&&(line=reader.ReadLine())!=null) { lock(gate) Program.Packet(output,line); }
                }
            } catch(TimeoutException) {} catch(Exception) { if(!stopped) try { Send(new {type="panel-unavailable"}); } catch {stopped=true;} }
            finally { lock(gate) panel=null; }
            // The bridge survives UI closure, but never restarts it.
            for(int n=0;n<5&&!stopped;n++) Thread.Sleep(100);
        }
    }
    void Monitor() {
        long stamp=-1;
        while(!stopped) { try {long next=LibraryStore.Stamp;if(stamp!=next){stamp=next;Send(new {type="library-revision",stamp});}}catch{stopped=true;}
            for(int i=0;i<10&&!stopped;i++)Thread.Sleep(100);
        }
    }
}
