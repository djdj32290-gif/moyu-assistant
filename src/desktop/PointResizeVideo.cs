using System;
using System.IO;
using System.IO.Pipes;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Diagnostics;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;
[assembly: System.Reflection.AssemblyVersion("0.18.8.0")]
[assembly: System.Reflection.AssemblyProduct("摸鱼助手")]

static class Program {
    public const string Version = "0.18.8";
    public static bool Testing { get { return TestMode; } }
    public static readonly string Home = AppDomain.CurrentDomain.BaseDirectory;
    public static string ExecutablePath { get { return Application.ExecutablePath; } }
    public static bool Portable { get { return File.Exists(Path.Combine(Home,"portable.json")); } }
    public static readonly string PipeName = "PointResizeVideo-" + WindowsIdentity.GetCurrent().User.Value;
    static bool TestMode { get { return Environment.GetEnvironmentVariable("POINT_RESIZE_TEST_MODE") == "1"; } }
    static string HostName { get { return TestMode ? "com.pointresize.video.test" : "com.pointresize.video"; } }
    static string Protocol { get { return TestMode ? "pointresize-video-test" : "pointresize-video"; } }
    public static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = 32 * 1024 * 1024 }; }
    public static string Encode(object o) { return Json().Serialize(o); }
    public static Dictionary<string, object> Decode(string s) { return Json().Deserialize<Dictionary<string, object>>(s); }
    public static string Str(Dictionary<string, object> o, string k) { object v; return o.TryGetValue(k, out v) && v != null ? Convert.ToString(v) : ""; }
    public static bool Flag(Dictionary<string, object> o, string k) { object v; return o.TryGetValue(k, out v) && v is bool && (bool)v; }
    public static void Log(Exception e) { try { Directory.CreateDirectory(Path.Combine(Home, "data")); File.WriteAllText(Path.Combine(Home, "data", "last-error.txt"), DateTime.Now + "\r\n" + e); } catch {} }
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("advapi32.dll", SetLastError = true)] static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr buffer, int length, out int needed);
    static void CheckRegistrationContext() {
        // A low-integrity file also starts low when double-clicked in Explorer.
        // Detect the actual integrity SID; TokenHasRestrictions is not this check.
        using (var identity = WindowsIdentity.GetCurrent()) {
            int needed;
            GetTokenInformation(identity.Token, 25, IntPtr.Zero, 0, out needed);
            if (needed <= 0) return;
            var buffer = Marshal.AllocHGlobal(needed);
            try {
                if (!GetTokenInformation(identity.Token, 25, buffer, needed, out needed)) return;
                string sid = new SecurityIdentifier(Marshal.ReadIntPtr(buffer)).Value;
                uint level;
                if (UInt32.TryParse(sid.Substring(sid.LastIndexOf('-') + 1), out level) && level < 8192)
                    throw new UnauthorizedAccessException("Windows 正以低完整性运行助手（" + sid + "），无法写入浏览器连接登记。文件或启动进程的隔离标记可能导致此情况；从资源管理器双击也不会自动解除。助手未修改系统权限，当前尚未完成准备。");
            } finally { Marshal.FreeHGlobal(buffer); }
        }
    }
    [STAThread] static void Main(string[] args) {
        try {
            if (args.Length == 2 && (args[0] == "--panel" || args[0] == "--panel-test") && Regex.IsMatch(args[1], "^[a-f0-9]{32}$")) {
                try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {}
                Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                bool created;
                using(var mutex=new Mutex(true,"Local\\"+PipeName+"-panel-"+args[1],out created)) {
                    if(!created) { DesktopBridge.Open(false); return; }
                    Application.Run(new PanelWindow(args[1], args[0] == "--panel-test"));
                }
            } else if ((args.Length == 1 && (args[0] == "--player" || args[0] == "--test")) || (args.Length==2&&(args[0]=="--player-warm"||args[0]=="--test-warm")&&Regex.IsMatch(args[1],"^[1-9][0-9]{0,8}$"))) {
                bool test = args[0] == "--test" || args[0]=="--test-warm";
                bool created;
                using (var mutex = new Mutex(true, "Local\\" + PipeName + (test ? "-test" : ""), out created)) {
                    if (!created) return;
                    try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {}
                    Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                    Application.Run(new VideoWindow(test,args.Length==2?Int32.Parse(args[1]):0));
                }
            } else if (args.Length == 2 && args[0] == "--connect") RegisterConnection(args[1]);
            else if (args.Length == 1 && args[0] == "--prepare") PrepareProtocol();
            else if (args.Length == 1 && args[0] == "--uninstall") StartUninstall();
            else if (args.Length == 1 && args[0] == "--uninstall-cleanup") CleanupUninstall();
            else if (args.Length == 2 && args[0] == "--install-prepare") {
                string id = BootstrapId(args[1]);
                PrepareProtocol();
                if (id != "") RegisterConnection(Protocol + "://connect?extension=" + id);
            }
            else if (TestMode && args.Length == 2 && args[0] == "--test-bootstrap") Console.WriteLine(Encode(new { id = BootstrapId(args[1]) }));
            else if (args.Length == 1 && args[0] == "--unregister") UnregisterConnection();
            else if (args.Length > 0 && Regex.IsMatch(args[0], "^chrome-extension://[a-p]{32}/?$")) Bridge();
            else if (args.Length == 0) {
                // Manual launch owns the UI directly; avoid a second EXE startup.
                try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {}
                Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                bool created;using(var mutex=new Mutex(true,"Local\\"+PipeName+"-panel-"+DesktopBridge.Session,out created)) {
                    if(!created){DesktopBridge.Open(false);return;}
                    Application.Run(new PanelWindow(DesktopBridge.Session,TestMode));
                }
            }
        } catch (Exception e) { if(args.Length==2&&args[0]=="--connect"){PairingResult(false,e.Message);EndPairing();}Log(e); Environment.ExitCode = 1; if (!TestMode && (args.Length == 0 || (args.Length == 1 && args[0] == "--uninstall"))) MessageBox.Show((args.Length == 0 ? "未能完成准备：" : "未能启动卸载：") + e.Message + "\r\n详细错误见 data/last-error.txt。", "摸鱼助手"); }
    }
    static void CloseRunningPlayer() {
        CloseRunningPanels();
        using (var pipe = new NamedPipeClientStream(".", PipeName + (TestMode ? "-test" : ""), PipeDirection.InOut, PipeOptions.Asynchronous)) {
            try { pipe.Connect(200); } catch (TimeoutException) { return; }
            var writer = new StreamWriter(pipe, new UTF8Encoding(false)) { AutoFlush = true };
            writer.WriteLine(Encode(new { type = "close" }));
            var reader = new StreamReader(pipe, Encoding.UTF8);
            var stopped = Task.Run(() => {
                string line; while ((line = reader.ReadLine()) != null) {
                    var message = Decode(line); if (Str(message, "type") != "closed") continue;
                    object value; return message.TryGetValue("browserProcessId", out value) ? Convert.ToInt32(value) : 0;
                }
                return 0;
            });
            if (!stopped.Wait(5000)) throw new IOException("请先关闭视频小窗，再重试卸载。");
            if (stopped.Result > 0) try {
                using (var process = Process.GetProcessById(stopped.Result))
                    if (!process.WaitForExit(10000)) throw new IOException("视频浏览进程尚未退出，请稍后重试卸载。");
            } catch (ArgumentException) { /* The owned browser has already exited. */ }
        }
    }
    static void NoLinks(string path, string root) {
        string full = Path.GetFullPath(path);
        if (!full.Equals(root, StringComparison.OrdinalIgnoreCase) && !full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("清理路径超出助手目录。");
        if ((File.GetAttributes(full) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("助手数据中存在目录链接，已停止清理，请检查：" + full);
        if (Directory.Exists(full)) foreach (string child in Directory.EnumerateFileSystemEntries(full)) NoLinks(child, root);
    }
    static void RemoveTree(string path) {
        if (Directory.Exists(path)) {
            foreach (string child in Directory.EnumerateFileSystemEntries(path)) RemoveTree(child);
            Directory.Delete(path);
        } else {
            var attributes = File.GetAttributes(path);
            if ((attributes & FileAttributes.ReadOnly) != 0) File.SetAttributes(path, attributes & ~FileAttributes.ReadOnly);
            File.Delete(path);
        }
    }
    static void CleanupUninstall() {
        if (!CanUninstall()) throw new InvalidOperationException("安装目录或产品记录不匹配，未清理任何数据。");
        string root = Path.GetFullPath(Home).TrimEnd(Path.DirectorySeparatorChar);
        if (root.Equals(Path.GetPathRoot(Home).TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase)) throw new IOException("安装目录位于磁盘根目录，已停止自动清理。");
        for (var parent = new DirectoryInfo(root); parent != null; parent = parent.Parent)
            if ((parent.Attributes & FileAttributes.ReparsePoint) != 0) throw new IOException("安装路径包含目录链接，已停止自动清理。");
        CloseRunningPlayer();
        string data = Path.Combine(root, TestMode ? "test-data" : "data");
        if (Directory.Exists(data) || File.Exists(data)) {
            var watch = Stopwatch.StartNew();
            while (true) {
                try { if (Directory.Exists(data) || File.Exists(data)) { NoLinks(data, root); RemoveTree(data); } break; }
                catch (IOException) { if (watch.ElapsedMilliseconds >= 10000) throw; Thread.Sleep(200); }
                catch (UnauthorizedAccessException) { if (watch.ElapsedMilliseconds >= 10000) throw; Thread.Sleep(200); }
            }
        }
        if (TestMode) File.WriteAllText(Path.Combine(root, "test-cleanup-request.json"), Encode(new { simulatedUnregister = true, removedData = data }));
        else UnregisterConnection();
        string manifest = Path.Combine(root, HostName + ".json");
        if (File.Exists(manifest)) { NoLinks(manifest, root); File.Delete(manifest); }
    }
    static void PrepareProtocol() {
        CheckRegistrationContext();
        using (var key = Registry.CurrentUser.CreateSubKey("Software\\Classes\\" + Protocol)) {
            key.SetValue("", "URL:PointResize Video Helper"); key.SetValue("URL Protocol", "");
            using (var command = key.CreateSubKey("shell\\open\\command")) command.SetValue("", "\"" + ExecutablePath + "\" --connect \"%1\"");
        }
    }
    static string PairingFile { get { return Path.Combine(Home,TestMode?"test-data":"data","pairing.json"); } }
    static string ownPairingAttempt="";
    public static string PairingResultFile { get { return Path.Combine(Home,TestMode?"test-data":"data","pairing-result.json"); } }
    static void PairingWrite(string path,object state) {
        string directory=Path.GetDirectoryName(path);Directory.CreateDirectory(directory);
        if((File.GetAttributes(directory)&FileAttributes.ReparsePoint)!=0||(File.Exists(path)&&(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0))throw new IOException("配对状态路径包含链接，已停止。");
        string temporary=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        try{using(var stream=new FileStream(temporary,FileMode.CreateNew,FileAccess.Write,FileShare.None)){byte[] bytes=new UTF8Encoding(false).GetBytes(Encode(state));stream.Write(bytes,0,bytes.Length);stream.Flush(true);}if(File.Exists(path))File.Replace(temporary,path,null);else File.Move(temporary,path);}
        finally{if(File.Exists(temporary))File.Delete(temporary);}
    }
    static Dictionary<string,object> ReadPairing() {using(var stream=new FileStream(PairingFile,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete))using(var reader=new StreamReader(stream))return Decode(reader.ReadToEnd());}
    static void PairingLock(Action action) {
        string path=Path.Combine(Path.GetDirectoryName(PairingFile),"pairing.lock");Directory.CreateDirectory(Path.GetDirectoryName(path));
        if(File.Exists(path)&&(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0)throw new IOException("配对锁路径包含链接，已停止。");
        FileStream stream=null;var deadline=DateTime.UtcNow.AddSeconds(3);
        while(stream==null){try{stream=new FileStream(path,FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);}catch(IOException){if(DateTime.UtcNow>=deadline)throw;Thread.Sleep(25);}}
        using(stream)action();
    }
    public static bool PairingWaiting {
        get {
            try {
                var state=ReadPairing();
                if(DateTime.UtcNow>=DateTime.Parse(Str(state,"until"),null,System.Globalization.DateTimeStyles.RoundtripKind))return false;
                var heartbeat=DateTime.Parse(Str(state,"heartbeat"),null,System.Globalization.DateTimeStyles.RoundtripKind);
                return Regex.IsMatch(Str(state,"attemptId"),"^[a-f0-9]{32}$")&&heartbeat<=DateTime.UtcNow.AddSeconds(2)&&DateTime.UtcNow-heartbeat<TimeSpan.FromSeconds(15);
            }catch{return false;}
        }
    }
    public static string PairingAttempt {get{try{return PairingWaiting?Str(ReadPairing(),"attemptId"):"";}catch{return "";}}}
    public static Dictionary<string,object> BeginPairing() {
        string cleared=Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json");if(File.Exists(cleared))File.Delete(cleared);
        if(Portable)PreparePortable();else PrepareProtocol();
        var until=DateTime.UtcNow.AddMinutes(10);
        string attemptId=Guid.NewGuid().ToString("N");
        PairingLock(()=>PairingWrite(PairingFile,new {pid=Process.GetCurrentProcess().Id,attemptId,until=until.ToString("o"),heartbeat=DateTime.UtcNow.ToString("o")}));
        ownPairingAttempt=attemptId;
        return new Dictionary<string,object>{{"ok",true},{"waiting",true},{"until",until.ToString("o")},{"attemptId",attemptId},{"simulated",TestMode}};
    }
    public static void PairingHeartbeat() {
        try{if(ownPairingAttempt==""||!File.Exists(PairingFile))return;PairingLock(()=>{if(!File.Exists(PairingFile))return;var state=ReadPairing();if(Str(state,"attemptId")!=ownPairingAttempt||Convert.ToInt32(state["pid"])!=Process.GetCurrentProcess().Id||DateTime.UtcNow>=DateTime.Parse(Str(state,"until"),null,System.Globalization.DateTimeStyles.RoundtripKind))return;state["heartbeat"]=DateTime.UtcNow.ToString("o");PairingWrite(PairingFile,state);});}catch(Exception e){Log(e);}
    }
    public static void PairingResult(bool ok,string message) {
        try{string attemptId=File.Exists(PairingFile)?Str(ReadPairing(),"attemptId"):"";PairingWrite(PairingResultFile,new {attemptId,ok,message,stage=ok?"registered":"failed",time=DateTime.UtcNow.ToString("o")});}catch(Exception e){Log(e);}
    }
    public static void EndPairing(int owner=0) {
        try{if(!File.Exists(PairingFile))return;PairingLock(()=>{if(File.Exists(PairingFile)&&(owner==0||Convert.ToInt32(ReadPairing()["pid"])==owner))File.Delete(PairingFile);});}catch(Exception e){Log(e);}
    }
    public static object PreparePortable() {
        if(!Portable)throw new InvalidOperationException("这是安装版，请使用原安装与连接流程。");
        if(File.Exists(Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json")))return new {ok=true,portable=true,cleared=true};
        string manifest=Path.Combine(Home,HostName+".json");var origins=new HashSet<string>();
        if(File.Exists(manifest))try{foreach(var value in (IEnumerable)Decode(File.ReadAllText(manifest))["allowed_origins"]){string origin=Convert.ToString(value);if(Regex.IsMatch(origin,"^chrome-extension://[a-p]{32}/$"))origins.Add(origin);}}catch{}
        object config=new {name=HostName,description="摸鱼助手",path=ExecutablePath,type="stdio",allowed_origins=origins};
        string command="\""+ExecutablePath+"\" --connect \"%1\"";
        // No test-mode registry writes: record precisely the paths the production
        // implementation will register, then exercise the browser via a fixture.
        if(!TestMode){CheckRegistrationContext();PrepareProtocol();}
        if(origins.Count>0){
            if(File.Exists(manifest)&&(File.GetAttributes(manifest)&FileAttributes.ReparsePoint)!=0)throw new IOException("连接文件包含链接，已停止登记。");
            File.WriteAllText(manifest,Encode(config),new UTF8Encoding(false));
            if(!TestMode)foreach(string browser in new[]{"Google\\Chrome","Microsoft\\Edge"})using(var key=Registry.CurrentUser.CreateSubKey("Software\\"+browser+"\\NativeMessagingHosts\\"+HostName))key.SetValue("",manifest);
        }
        if(TestMode){string data=Path.Combine(Home,"test-data");Directory.CreateDirectory(data);File.WriteAllText(Path.Combine(data,"portable-registration.json"),Encode(new {manifest,config,command,simulated=true}));}
        return new {ok=true,portable=true,simulated=TestMode,home=Home};
    }
    public static object ReleasePortable() {
        if(!Portable)throw new InvalidOperationException("这是安装版。请从 Windows“设置 → 应用”卸载，不要直接删除安装目录。");
        if(TestMode){string data=Path.Combine(Home,"test-data");Directory.CreateDirectory(data);File.WriteAllText(Path.Combine(data,"portable-release.json"),Encode(new {manifest=Path.Combine(Home,HostName+".json"),command="\""+ExecutablePath+"\" --connect \"%1\"",simulated=true}));}
        else UnregisterConnection();
        return new {ok=true,released=true,portable=true,simulated=TestMode};
    }
    public static object ClearRegistration() {
        object result;
        if(Portable)result=ReleasePortable();else {if(!TestMode)UnregisterConnection();result=new {ok=true,released=true,simulated=TestMode};}
        PairingWrite(Path.Combine(Home,TestMode?"test-data":"data","registration-cleared.json"),new {cleared=true});return result;
    }
    static string BootstrapId(string source) {
        // Browser download names may gain a duplicate-number suffix. Generic
        // manually opened packages still support the existing Connect workflow.
        var match = Regex.Match(Path.GetFileName(source), "^PointResizeVideo-([a-p]{32})(?: \\([0-9]+\\))?\\.msi$");
        return match.Success ? match.Groups[1].Value : "";
    }
    static bool CanUninstall() {
        if(Portable)return false;
        string marker = "Software\\PointResize\\VideoHelper" + (TestMode ? ".Test" : "");
        using (var key = Registry.CurrentUser.OpenSubKey(marker)) {
            if (key == null) return false;
            string location = Convert.ToString(key.GetValue("InstallLocation"));
            string product = Convert.ToString(key.GetValue("ProductCode"));
            return String.Equals(location.TrimEnd('\\'), Home.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)
                && String.Equals(product.Trim('{', '}'), InstallerIdentity.ProductCode, StringComparison.OrdinalIgnoreCase);
        }
    }
    public static void StartUninstall() {
        if (!CanUninstall()) throw new InvalidOperationException("未找到与当前助手匹配的安装记录。请使用新版安装包，或从 Windows 设置中的“应用”卸载助手。");
        CloseRunningPlayer();
        string command = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "msiexec.exe");
        string arguments = "/x {" + InstallerIdentity.ProductCode + "} /norestart";
        if (TestMode) {
            Directory.CreateDirectory(Path.Combine(Home, "test-data"));
            File.WriteAllText(Path.Combine(Home, "test-data", "uninstall-request.json"), Encode(new { command, arguments, simulated = true }));
            return;
        }
        Process.Start(new ProcessStartInfo(command, arguments) { UseShellExecute = false, WorkingDirectory = Home });
    }
    static void RegisterConnection(string address) {
        Uri uri;
        if (!Uri.TryCreate(address, UriKind.Absolute, out uri) || uri.Scheme != Protocol || uri.Host != "connect" || !String.IsNullOrEmpty(uri.UserInfo)) throw new InvalidDataException("连接地址无效。");
        string id = "";
        foreach (var part in uri.Query.TrimStart('?').Split('&')) { var pair = part.Split(new[] { '=' }, 2); if (pair.Length == 2 && pair[0] == "extension") id = Uri.UnescapeDataString(pair[1]); }
        if (!Regex.IsMatch(id, "^[a-p]{32}$")) throw new InvalidDataException("扩展 ID 无效。");
        if(Portable&&!PairingWaiting)throw new InvalidOperationException("请先打开 EXE，点击“配对浏览器插件”，再到插件配对页完成配对。");
        if(!TestMode)CheckRegistrationContext();
        var origins = new HashSet<string>();
        string manifest = Path.Combine(Home, HostName + ".json");
        if (File.Exists(manifest)) try {
            var existing = Decode(File.ReadAllText(manifest));
            foreach (var value in (IEnumerable)existing["allowed_origins"]) { string origin = Convert.ToString(value); if (Regex.IsMatch(origin, "^chrome-extension://[a-p]{32}/$")) origins.Add(origin); }
        } catch { /* Repair this helper's own invalid configuration. */ }
        origins.Add("chrome-extension://" + id + "/");
        PairingWrite(manifest,new { name = HostName, description = "摸鱼助手", path = ExecutablePath, type = "stdio", allowed_origins = origins });
        if(TestMode)PairingWrite(Path.Combine(Home,"test-data","connect-callback.json"),new {manifest,extensionId=id,simulated=true});
        else foreach (var browser in new[] { "Google\\Chrome", "Microsoft\\Edge" }) using (var key = Registry.CurrentUser.CreateSubKey("Software\\" + browser + "\\NativeMessagingHosts\\" + HostName)) key.SetValue("", manifest);
        PairingResult(true,"已收到插件身份，正在建立通信并同步资料。");
    }
    static void DeleteEmptyKey(string path) {
        using (var key = Registry.CurrentUser.OpenSubKey(path)) {
            if (key == null || key.SubKeyCount != 0 || key.ValueCount != 0) return;
        }
        Registry.CurrentUser.DeleteSubKey(path, false);
    }
    static void UnregisterConnection() {
        CheckRegistrationContext();
        string manifest = Path.Combine(Home, HostName + ".json");
        foreach (var browser in new[] { "Google\\Chrome", "Microsoft\\Edge" }) {
            string path = "Software\\" + browser + "\\NativeMessagingHosts\\" + HostName;
            using (var key = Registry.CurrentUser.OpenSubKey(path, true)) {
                if (key == null || !String.Equals(Convert.ToString(key.GetValue("")), manifest, StringComparison.OrdinalIgnoreCase)) continue;
                key.DeleteValue("", false);
            }
            DeleteEmptyKey(path);
        }
        string protocol = "Software\\Classes\\" + Protocol;
        string commandPath = protocol + "\\shell\\open\\command";
        string expected = "\"" + ExecutablePath + "\" --connect \"%1\"";
        using (var command = Registry.CurrentUser.OpenSubKey(commandPath, true)) {
            if (command == null || !String.Equals(Convert.ToString(command.GetValue("")), expected, StringComparison.OrdinalIgnoreCase)) return;
            command.DeleteValue("", false);
        }
        foreach (var suffix in new[] { "\\shell\\open\\command", "\\shell\\open", "\\shell" }) DeleteEmptyKey(protocol + suffix);
        using (var key = Registry.CurrentUser.OpenSubKey(protocol, true)) {
            if (key != null) { key.DeleteValue("", false); key.DeleteValue("URL Protocol", false); }
        }
        DeleteEmptyKey(protocol);
    }
    public static byte[] ReadPacket(Stream stream) {
        var length = new byte[4]; if (!ReadAll(stream, length)) return null;
        uint size = BitConverter.ToUInt32(length, 0); if (size == 0 || size > 32 * 1024 * 1024) throw new InvalidDataException("消息过大。");
        var bytes = new byte[size]; if (!ReadAll(stream, bytes)) return null; return bytes;
    }
    static bool ReadAll(Stream s, byte[] b) { int n = 0; while (n < b.Length) { int count = s.Read(b, n, b.Length - n); if (count == 0) return false; n += count; } return true; }
    public static void Packet(Stream s, string line) { var bytes = Encoding.UTF8.GetBytes(line); s.Write(BitConverter.GetBytes(bytes.Length), 0, 4); s.Write(bytes, 0, bytes.Length); s.Flush(); }
    public static void SendChunked(Stream stream,object value) {
        string json=Encode(value); if(Encoding.UTF8.GetByteCount(json)<800000) {Packet(stream,json);return;}
        string id=Guid.NewGuid().ToString("N");var parts=new List<string>();
        for(int offset=0;offset<json.Length;) {int length=Math.Min(180000,json.Length-offset);if(offset+length<json.Length&&Char.IsHighSurrogate(json[offset+length-1]))length--;parts.Add(json.Substring(offset,length));offset+=length;}
        for(int i=0;i<parts.Count;i++)Packet(stream,Encode(new {type="panel-chunk",id,index=i,total=parts.Count,text=parts[i]}));
    }
    static void PanelBridge(Stream input, Stream output, string first) {
        string session = Str(Decode(first), "session");
        if (!Regex.IsMatch(session, "^[a-f0-9]{32}$")) return;
        using(var pipe = new NamedPipeClientStream(".", PipeName + "-panel-" + session, PipeDirection.InOut, PipeOptions.Asynchronous)) {
            Process.Start(new ProcessStartInfo(ExecutablePath,(TestMode ? "--panel-test " : "--panel ") + session) { UseShellExecute=false, CreateNoWindow=true, WindowStyle=ProcessWindowStyle.Hidden, WorkingDirectory=Home });
            pipe.Connect(15000); var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true}; writer.WriteLine(first);
            Task.Run(()=> { try { byte[] packet; while((packet=ReadPacket(input))!=null) writer.WriteLine(Encoding.UTF8.GetString(packet)); } catch {} finally { try { pipe.Dispose(); } catch {} } });
            var reader=new StreamReader(pipe,Encoding.UTF8); string line; while((line=reader.ReadLine())!=null) Packet(output,line);
        }
    }
    static void CloseRunningPanels() {
        string data = Path.Combine(Home, TestMode ? "test-data" : "data"); if(!Directory.Exists(data)) return;
        foreach(string file in Directory.GetFiles(data,"panel-*.json")) {
            string session = Path.GetFileNameWithoutExtension(file).Substring(6); if(!Regex.IsMatch(session,"^[a-f0-9]{32}$")) continue;
            using(var pipe=new NamedPipeClientStream(".",PipeName+"-panel-"+session,PipeDirection.InOut,PipeOptions.Asynchronous)) {
                try { pipe.Connect(200); } catch(TimeoutException) { continue; }
                var writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true}; writer.WriteLine(Encode(new {type="panel-close"}));
                var stopped=Task.Run(()=> { var reader=new StreamReader(pipe,Encoding.UTF8); string line; while((line=reader.ReadLine())!=null) { var message=Decode(line); if(Str(message,"type")=="panel-closed") return Convert.ToInt32(message["browserProcessId"]); } return 0; });
                if(!stopped.Wait(5000)) throw new IOException("请先关闭点选缩放面板，再重试卸载。");
                if(stopped.Result>0) try { using(var process=Process.GetProcessById(stopped.Result)) if(!process.WaitForExit(10000)) throw new IOException("面板浏览进程尚未退出，请稍后重试卸载。"); } catch(ArgumentException) {}
            }
        }
    }
    static void Bridge() {
        var input = Console.OpenStandardInput(); var output = Console.OpenStandardOutput();
        // Do not launch an empty desktop player before the first valid Play request.
        var first = ReadPacket(input); if (first == null) return;
        var line = Encoding.UTF8.GetString(first); string type = Str(Decode(line), "type");
        if (type == "hello") { Packet(output, Encode(new { ok = true, protocol = 1, desktopProtocol=2, version = Version, panel = true, library=true, portable=Portable,pairingWaiting=PairingWaiting,pairingAttemptId=PairingAttempt, canUninstall = CanUninstall() })); return; }
        if(type=="release") {try{Packet(output,Encode(ClearRegistration()));}catch(Exception e){Packet(output,Encode(new {ok=false,error=e.Message}));}return;}
        if(type=="pair-complete"||type=="pair-failed"){var message=Decode(line);string attempt=Str(message,"attemptId");PairingLock(()=>{if(attempt!=""&&File.Exists(PairingFile)&&Str(ReadPairing(),"attemptId")==attempt){if(type=="pair-failed"){string error=Str(message,"error");PairingResult(false,error.Length>1500?error.Substring(0,1500):error);}File.Delete(PairingFile);}});Packet(output,Encode(new {ok=true}));return;}
        if (type == "desktop-connect") { new DesktopBridge(input,output,Decode(line)).Run(); return; }
        if (type == "library") { try {SendChunked(output,LibraryStore.Request((Dictionary<string,object>)Decode(line)["args"]));} catch(Exception e) {Packet(output,Encode(new {ok=false,error=e.Message}));} return; }
        if (type == "uninstall") {
            try { StartUninstall(); Packet(output, Encode(new { ok = true, uninstallStarted = true })); }
            catch (Exception error) { Packet(output, Encode(new { ok = false, error = error.Message })); }
            return;
        }
        if (type == "panel-open") { PanelBridge(input, output, line); return; }
        if (type != "play" && type != "close") return;
        bool test = TestMode;
        using (var pipe = new NamedPipeClientStream(".", PipeName + (test ? "-test" : ""), PipeDirection.InOut, PipeOptions.Asynchronous)) {
            try { pipe.Connect(100); }
            catch (TimeoutException) {
                if (type == "close") { Packet(output, Encode(new { type = "closed" })); return; }
                Process.Start(new ProcessStartInfo(ExecutablePath, test ? "--test" : "--player") { UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden, WorkingDirectory = Home });
                pipe.Connect(15000);
            }
            var writer = new StreamWriter(pipe, new UTF8Encoding(false)) { AutoFlush = true };
            writer.WriteLine(line);
            Task.Run(() => { try { byte[] packet; while ((packet = ReadPacket(input)) != null) writer.WriteLine(Encoding.UTF8.GetString(packet)); } catch {} finally { try { pipe.Dispose(); } catch {} } });
            var reader = new StreamReader(pipe, Encoding.UTF8);
            string message; while ((message = reader.ReadLine()) != null) Packet(output, message);
        }
    }
}

sealed class VideoToolsWindow : Form {
    protected override bool ShowWithoutActivation { get { return true; } }
}

class VideoWindow : Form {
    const string AppOrigin = "https://point-resize.local";
    readonly WebView2 web = new WebView2();
    readonly List<CoreWebView2Frame> frames = new List<CoreWebView2Frame>();
    readonly List<StreamWriter> clients = new List<StreamWriter>();
    readonly System.Windows.Forms.Timer mouseTimer = new System.Windows.Forms.Timer { Interval = 25 };
    readonly bool testing;
    readonly string data;
    bool ready, closed, hidden, armed, hover = true, transitioning;
    bool libraryOwned;
    int warmOwnerPid;
    bool initializing, allowVisible=true;
    readonly System.Windows.Forms.Timer ownerTimer=new System.Windows.Forms.Timer{Interval=500};
    long queueStamp=-1;
    readonly System.Windows.Forms.Timer libraryTimer=new System.Windows.Forms.Timer{Interval=750};
    bool restorePreservedFocus = true;
    int generation;
    Rectangle wake;
    CoreWebView2Environment environment;
    VideoToolsWindow tools;
    WebView2 toolsWeb;
    bool toolsReady, toolsInitializing, toolsRequested, listOpen = true, keyboardTools, resizing, watchedSent;
    Rectangle pointerResizeBounds;
    int pointerResizeEdge;
    string toolsSide = "right";
    double watchedStart = -1;
    DateTime toolsOutsideSince;
    Dictionary<string, object> latestMedia;
    Dictionary<string, object> lastPlay;
    string pending;
    Point? testCursor;
    Point? previousPointer;
    [DllImport("user32.dll")] static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetDpiForSystem();
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int command);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd, int msg, IntPtr w, IntPtr l);
    protected override bool ShowWithoutActivation { get { return true; } }
    protected override void SetVisibleCore(bool value){if(value&&!allowVisible){if(!IsHandleCreated)CreateHandle();base.SetVisibleCore(false);return;}base.SetVisibleCore(value);}
    async void BeginInitialize(){if(initializing||closed)return;initializing=true;StartServer();try{await Initialize();}catch(Exception err){if(closed)return;Program.Log(err);Broadcast(new {type="error",error="WebView2 初始化失败："+err.Message});Close();}}
    public VideoWindow(bool test,int ownerPid=0) {
        testing = test;
        warmOwnerPid=ownerPid;allowVisible=ownerPid==0;
        if (testing) testCursor = new Point(0, 0);
        data = Path.Combine(Program.Home, testing ? "test-data" : "data"); Directory.CreateDirectory(data);
        if (testing) foreach (var name in new[] { "media.json", "window.json" }) { var file = Path.Combine(data, name); if (File.Exists(file)) File.Delete(file); }
        try{Icon=Icon.ExtractAssociatedIcon(Program.ExecutablePath);}catch{}
        Text = "摸鱼助手 · 视频待看"; FormBorderStyle = FormBorderStyle.None; MinimumSize = new Size(380, 270); Size = new Size(Pixels(480), Pixels(300)); Padding = Padding.Empty; BackColor = Color.FromArgb(20,35,30);
        StartPosition = FormStartPosition.Manual; var area = Screen.PrimaryScreen.WorkingArea; Location = new Point(area.Right - Width - 24, area.Bottom - Height - 24);
        RestorePosition();
        // A hidden form has no taskbar entry. Keep this style stable so an early
        // Play cannot recreate the HWND while WebView2 is initializing.
        TopMost = !test; ShowInTaskbar = true; web.DefaultBackgroundColor=Color.FromArgb(20,35,30);web.Dock = DockStyle.Fill; Controls.Add(web);BackColor=Color.FromArgb(20,35,30);
        mouseTimer.Tick += async (s, e) => await MouseTick();
        libraryTimer.Tick+=(s,e)=>SyncLibraryQueue();libraryTimer.Start();
        LocationChanged += (s, e) => { PlaceTools(); if (!resizing) SavePosition(); };
        SizeChanged += (s, e) => PlaceTools();
        DpiChanged += (s, e) => { Padding = Padding.Empty; PlaceTools(); };
        Shown += (s,e)=>BeginInitialize();
        if(ownerPid>0){HandleCreated+=(s,e)=>BeginInvoke((Action)BeginInitialize);ownerTimer.Tick+=(s,e)=>{if(lastPlay!=null){ownerTimer.Stop();return;}try{using(var owner=Process.GetProcessById(warmOwnerPid)){if(owner.HasExited)Close();}}catch{Close();}};ownerTimer.Start();}
        FormClosed += (s, e) => { SavePosition(); closed = true; ++generation; mouseTimer.Stop();libraryTimer.Stop();ownerTimer.Stop();try{File.Delete(Path.Combine(data,"player-state.json"));}catch{} uint browserProcessId = 0; try { if (web.CoreWebView2 != null) browserProcessId = web.CoreWebView2.BrowserProcessId; } catch {} Broadcast(new { type = "closed", browserProcessId }); foreach (var c in clients.ToArray()) try { c.Dispose(); } catch {} if (tools != null) { tools.Close(); tools.Dispose(); } web.Dispose(); };
    }
    void RestorePosition() {
        try {
            string path = Path.Combine(data, "window-position.json"); if (!File.Exists(path)) return;
            var saved = Program.Decode(File.ReadAllText(path)); int x = Convert.ToInt32(saved["x"]), y = Convert.ToInt32(saved["y"]);
            if (Math.Abs((long)x) > 1000000 || Math.Abs((long)y) > 1000000) return;
            Location = new Point(x, y); KeepOnScreen();
        } catch { /* A corrupt position must not block video playback. */ }
    }
    void SavePosition() {
        if (!ready || closed || WindowState != FormWindowState.Normal) return;
        try { var rect = hidden ? wake : Bounds; File.WriteAllText(Path.Combine(data, "window-position.json"), Program.Encode(new { x = rect.X, y = rect.Y })); }
        catch (Exception error) { Program.Log(error); }
    }
    void StartServer() { Task.Run((Action)Serve); }
    async Task Initialize() {
        var options = new CoreWebView2EnvironmentOptions();
        // Remote debugging is opt-in and restricted to this development executable invocation.
        string port = Environment.GetEnvironmentVariable("POINT_RESIZE_TEST_PORT");
        if (testing && Regex.IsMatch(port ?? "", "^[0-9]{4,5}$")) options.AdditionalBrowserArguments = "--remote-debugging-port=" + port;
        environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(data, "webview"), options);
        await web.EnsureCoreWebView2Async(environment);
        var core = web.CoreWebView2;
        ConfigureCore(core, false);
        core.FrameCreated += (s, e) => Track(e.Frame);
        await core.AddScriptToExecuteOnDocumentCreatedAsync(File.ReadAllText(Path.Combine(Program.Home, "ui", "media-agent.js")));
        core.Navigate(AppOrigin + "/player.html");
        mouseTimer.Start();
    }
    void ConfigureCore(CoreWebView2 core, bool isTools) {
        core.SetVirtualHostNameToFolderMapping("point-resize.local", Path.Combine(Program.Home, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
        core.Settings.AreDevToolsEnabled = testing; core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false; core.Settings.AreHostObjectsAllowed = false;
        core.PermissionRequested += (s, e) => { e.State = CoreWebView2PermissionState.Deny; };
        core.DownloadStarting += (s, e) => { e.Cancel = true; };
        core.NewWindowRequested += (s, e) => { e.Handled = true; };
        core.NavigationStarting += (s, e) => { if (!e.Uri.StartsWith(AppOrigin + "/", StringComparison.Ordinal)) e.Cancel = true; };
        core.WebMessageReceived += (s, e) => { if (e.Source.StartsWith(AppOrigin + "/", StringComparison.Ordinal)) UiMessage(e.WebMessageAsJson, isTools); };
    }
    int Pixels(int value) {
        // .NET Framework's DeviceDpi may stay at 96 while WebView2 uses the
        // actual monitor scale. Match native hit areas and the web UI scale.
        uint dpi = 0;
        try { dpi = IsHandleCreated ? GetDpiForWindow(Handle) : GetDpiForSystem(); } catch {}
        return (int)Math.Round(value * (dpi > 0 ? (double)dpi : DeviceDpi) / 96.0);
    }
    Rectangle Tolerant(Rectangle rect, int pixels) { rect.Inflate(Pixels(pixels), Pixels(pixels)); return rect; }
    void PlaceTools() {
        if (tools == null || tools.IsDisposed) return;
        var area = Screen.FromRectangle(Bounds).WorkingArea;
        int width = Math.Min(Pixels(320), area.Width), height = Math.Min(Pixels(listOpen ? 460 : 218), area.Height);
        int gap = Pixels(8), x = toolsSide == "left" ? Left - gap - width : Right + gap;
        if (x < area.Left) x = Right + gap;
        if (x + width > area.Right) x = Left - gap - width;
        tools.Bounds = new Rectangle(Math.Max(area.Left, Math.Min(x, area.Right - width)), Math.Max(area.Top, Math.Min(Top, area.Bottom - height)), width, height);
    }
    async Task PrepareTools() {
        try {
            if(closed||toolsReady||toolsInitializing)return;toolsInitializing=true;
            if (tools == null) {
                tools = new VideoToolsWindow { Text = "视频控制区", FormBorderStyle = FormBorderStyle.None, ShowInTaskbar = false, StartPosition = FormStartPosition.Manual, BackColor = Color.FromArgb(203, 218, 209), Padding = new Padding(1), AutoScaleMode = AutoScaleMode.None };
                toolsWeb = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor=Color.White }; tools.Controls.Add(toolsWeb);
                tools.FormClosing += (s, e) => { if (!closed && e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; HideTools(); } };
            }
            PlaceTools();var preparedHandle=tools.Handle;
            await toolsWeb.EnsureCoreWebView2Async(environment);
            if(closed)return;
            ConfigureCore(toolsWeb.CoreWebView2,true);toolsWeb.CoreWebView2.Navigate(AppOrigin+"/player.html#controls");
        } catch (Exception error) { toolsInitializing = false;if(!closed){bool requested=toolsRequested;HideTools();if(requested)Post(new { type = "hint", text = "控制区暂未打开，请重试。" });Program.Log(error);} }
    }
    async Task ShowTools(bool keyboard) {
        toolsRequested=true;keyboardTools=keyboardTools||keyboard;toolsOutsideSince=DateTime.MinValue;
        await PrepareTools();DisplayTools();
    }
    void DisplayTools(){
        if(closed||hidden||!toolsRequested||!toolsReady||tools==null)return;
        PlaceTools();tools.TopMost=TopMost;if(!tools.Visible){tools.Show(this);ShowWindow(tools.Handle,4);}Post(new {type="tools",open=true});FocusTools();
    }
    void HideTools() {
        if (tools != null && !tools.IsDisposed) tools.Hide();
        toolsRequested=false;keyboardTools = false; toolsOutsideSince = DateTime.MinValue;
        Post(new { type = "tools", open = false });
    }
    void FocusTools() {
        if (!keyboardTools || !toolsReady || tools == null || !tools.Visible) return;
        tools.Activate(); toolsWeb.Focus();
        var ignored = toolsWeb.CoreWebView2.ExecuteScriptAsync("document.getElementById('title-expanded').focus()");
    }
    void Track(CoreWebView2Frame frame, int? playGeneration = null) {
        int frameGeneration = playGeneration ?? generation;
        frames.Add(frame);
        frame.FrameCreated += (s, e) => Track(e.Frame, frameGeneration);
        frame.Destroyed += (s, e) => frames.Remove(frame);
        frame.WebMessageReceived += (s, e) => { try { if (frameGeneration == generation) Media(Program.Decode(e.WebMessageAsJson)); } catch {} };
    }
    void Media(Dictionary<string, object> m) {
        if (Program.Str(m, "type") != "media") return;
        latestMedia = m;
        Post(m);
        // OGV can return a decoded error clip. Until real episode success can be
        // distinguished, its watched flag remains explicitly user-controlled.
        if (!watchedSent && lastPlay != null && Program.Str((Dictionary<string,object>)lastPlay["item"],"category")!="bangumi" && Convert.ToDouble(m["width"]) > 0 && Convert.ToDouble(m["ready"]) >= 2 && !Program.Flag(m, "paused")) {
            double time = Convert.ToDouble(m["time"]);
            if (watchedStart < 0) watchedStart = time;
            else if (time - watchedStart >= 0.3) {
                watchedSent = true;
                Broadcast(new { type = "watched", id = Program.Str((Dictionary<string, object>)lastPlay["item"], "id"), watched = true });
            }
        }
        if (hidden && !Program.Flag(m, "paused")) { var ignored = SetHeld(true); }
        if (testing) File.WriteAllText(Path.Combine(data, "media.json"), Program.Encode(m));
    }
    void UiMessage(string json, bool isTools = false) {
        try {
            var m = Program.Decode(json); var type = Program.Str(m, "type");
            if (type == "media") {
                if (!isTools && lastPlay != null && Program.Str(m, "playId") == Program.Str((Dictionary<string, object>)lastPlay["item"], "id")) Media(m);
                return;
            }
            if (type == "ready") {
                if (isTools) {
                    toolsReady = true; toolsInitializing = false;
                    if (lastPlay != null) toolsWeb.CoreWebView2.PostWebMessageAsJson(Program.Encode(lastPlay));
                    if (latestMedia != null) toolsWeb.CoreWebView2.PostWebMessageAsJson(Program.Encode(latestMedia));
                    Post(new { type = "preferences", hover, pin = TopMost });
                    SendView();DisplayTools();
        } else { ready = true; if (pending != null) { web.CoreWebView2.PostWebMessageAsJson(pending); pending = null; Acknowledge(); }BeginInvoke((Action)(()=>{var ignored=PrepareTools();})); }
                return;
            }
            if (type == "tools") { if (Program.Flag(m, "open")) { toolsSide = Program.Str(m, "side") == "left" ? "left" : "right"; var ignored = ShowTools(Program.Flag(m, "keyboard")); } else HideTools(); return; }
            if (type == "watched" || type == "clear-watched") { Broadcast(m); return; }
            if(type=="view"){LibraryStore.Request(new Dictionary<string,object>{{"action","video-view"},{"mode",Program.Str(m,"mode")},{"operationId",Guid.NewGuid().ToString("N")}});SendView();return;}
            if (type == "close") { Close(); return; }
            if (type == "select") { Select(Program.Str(m, "id")); return; }
            if (type == "list") { listOpen = Program.Flag(m, "open"); PlaceTools(); }
            else if (type == "hover") { hover = Program.Flag(m, "enabled"); armed = false; }
            else if (type == "pin") { TopMost = Program.Flag(m, "enabled"); if (tools != null) tools.TopMost = TopMost; }
            else if (type == "drag") { ReleaseCapture(); SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero); }
            else if (type == "resize" && !isTools) ResizeFromPointer(m);
            else if (type == "move") { Left += Math.Sign(Convert.ToInt32(m["x"])) * 10; Top += Math.Sign(Convert.ToInt32(m["y"])) * 10; KeepOnScreen(); }
        } catch (Exception e) { Program.Log(e);Post(new {type="hint",text=e.Message}); }
    }
    void SendView(){try{var state=LibraryStore.Request(new Dictionary<string,object>{{"action","read"}});SendView((Dictionary<string,object>)state["data"]);}catch(Exception e){Program.Log(e);Post(new {type="hint",text="显示设置读取失败："+e.Message});}}
    void SendView(Dictionary<string,object> library){string titles="expanded";if(library.ContainsKey(LibraryStore.ViewKey))titles=Program.Str((Dictionary<string,object>)library[LibraryStore.ViewKey],"titles");Post(new {type="view",titles});}
    void ResizeFromPointer(Dictionary<string,object> m) {
        string phase=Program.Str(m,"phase");
        if(phase=="start"){int edge=Convert.ToInt32(m["edge"]);if(edge<10||edge>17)return;pointerResizeEdge=edge;pointerResizeBounds=Bounds;resizing=true;return;}
        if(pointerResizeEdge==0)return;
        if(phase=="end"){pointerResizeEdge=0;resizing=false;KeepOnScreen();SavePosition();return;}
        if(phase!="move")return;
        double dx=Convert.ToDouble(m["x"]),dy=Convert.ToDouble(m["y"]);if(Double.IsNaN(dx+dy)||Double.IsInfinity(dx+dy)||Math.Abs(dx)>100000||Math.Abs(dy)>100000)return;
        int edgeCode=pointerResizeEdge,l=pointerResizeBounds.Left,t=pointerResizeBounds.Top,r=pointerResizeBounds.Right,b=pointerResizeBounds.Bottom;
        var area=Screen.FromRectangle(pointerResizeBounds).WorkingArea;int minW=Math.Min(MinimumSize.Width,area.Width),minH=Math.Min(MinimumSize.Height,area.Height);
        if(edgeCode==10||edgeCode==13||edgeCode==16)l=Math.Max(area.Left,Math.Min(r-minW,l+(int)Math.Round(dx)));
        if(edgeCode==11||edgeCode==14||edgeCode==17)r=Math.Min(area.Right,Math.Max(l+minW,r+(int)Math.Round(dx)));
        if(edgeCode==12||edgeCode==13||edgeCode==14)t=Math.Max(area.Top,Math.Min(b-minH,t+(int)Math.Round(dy)));
        if(edgeCode==15||edgeCode==16||edgeCode==17)b=Math.Min(area.Bottom,Math.Max(t+minH,b+(int)Math.Round(dy)));
        Bounds=Rectangle.FromLTRB(l,t,r,b);
    }
    void KeepOnScreen() { var r = Screen.FromRectangle(Bounds).WorkingArea; Size = new Size(Math.Min(Width, r.Width), Math.Min(Height, r.Height)); Location = new Point(Math.Max(r.Left, Math.Min(Left, r.Right - Width)), Math.Max(r.Top, Math.Min(Top, r.Bottom - Height))); }
    void Post(object o) { if (closed) return; string json = Program.Encode(o); if (ready) web.CoreWebView2.PostWebMessageAsJson(json); if (toolsReady) toolsWeb.CoreWebView2.PostWebMessageAsJson(json); }
    void Broadcast(object o) {
        string line=Program.Encode(o);var message=Program.Decode(line);string type=Program.Str(message,"type");
        if(libraryOwned&&(type=="watched"||type=="clear-watched"))try{message["action"]=type=="watched"?"watch":"clear-watched";message["operationId"]=Guid.NewGuid().ToString("N");LibraryStore.Request(message);SyncLibraryQueue();}catch(Exception e){Post(new {type="hint",text="保存观看状态失败："+e.Message});}
        foreach (var c in clients.ToArray()) try { lock(c) c.WriteLine(line); } catch { clients.Remove(c); }
    }
    void SyncLibraryQueue() {
        if(!libraryOwned||closed||lastPlay==null||queueStamp==LibraryStore.Stamp)return;
        try{var state=LibraryStore.Request(new Dictionary<string,object>{{"action","read"}});queueStamp=LibraryStore.Stamp;var library=(Dictionary<string,object>)state["data"];SendView(library);var items=new ArrayList();if(library.ContainsKey(LibraryStore.QueueKey))foreach(Dictionary<string,object> item in (IEnumerable)library[LibraryStore.QueueKey])if(!Program.Flag(item,"dependent"))items.Add(item);lastPlay["items"]=items;Post(new {type="queue",items});}catch(Exception e){Post(new {type="hint",text=e.Message});}
    }
    void Select(string id) {
        if (lastPlay == null) return;
        foreach (Dictionary<string, object> item in (IEnumerable)lastPlay["items"]) if (Program.Str(item, "id") == id) { lastPlay["item"] = item; Play(lastPlay); return; }
    }
    static bool ValidItem(Dictionary<string, object> item) {
        Uri uri;
        if (Program.Flag(item, "dependent")) return false;
        if (Program.Str(item, "kind") == "media") return Uri.TryCreate(Program.Str(item, "mediaUrl"), UriKind.Absolute, out uri) && (uri.Scheme == "http" || uri.Scheme == "https") && String.IsNullOrEmpty(uri.UserInfo);
        if(Program.Str(item,"kind")=="live"){string room=Program.Str(item,"room");return Program.Str(item,"provider")=="huya"&&Regex.IsMatch(room,"^[1-9][0-9]{0,11}$")&&Program.Str(item,"id")=="huya-live:"+room&&Program.Str(item,"url")=="https://www.huya.com/"+room&&Program.Str(item,"embed")=="https://liveshare.huya.com/iframe/"+room;}
        return Uri.TryCreate(Program.Str(item, "embed"), UriKind.Absolute, out uri) && uri.Scheme == "https" && uri.Host == "player.bilibili.com" && uri.AbsolutePath == "/player.html";
    }
    void Play(Dictionary<string, object> message) {
        var item = message["item"] as Dictionary<string, object>;
        if (item == null || !ValidItem(item)) throw new InvalidDataException("不支持临时视频流或无效地址。");
        lastPlay = message;
        ownerTimer.Stop();if(!allowVisible){allowVisible=true;Show();ShowWindow(Handle,4);}
        libraryOwned=Program.Flag(message,"canonical");queueStamp=-1;
        latestMedia = null;
        watchedSent = false; watchedStart = -1;
        ++generation; armed = false;
        if (hidden) Restore();
        string json = Program.Encode(message); if (ready) Post(message); else pending = json;
        if (ready) Acknowledge();
    }
    void Acknowledge() { string id=Program.Str((Dictionary<string, object>)lastPlay["item"],"id");File.WriteAllText(Path.Combine(data,"player-state.json"),Program.Encode(new {id,pid=Process.GetCurrentProcess().Id,playToken=generation}));Broadcast(new { type = "opened", id, request = Program.Str(lastPlay, "request") }); }
    void Restore() { var foreground = GetForegroundWindow(); hidden = false; Show(); ShowWindow(Handle, 4); restorePreservedFocus = GetForegroundWindow() == foreground; }
    void Serve() {
        while (!closed) {
            NamedPipeServerStream pipe = null;
            try {
                var security = new PipeSecurity(); security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User, PipeAccessRights.FullControl, AccessControlType.Allow));
                pipe = new NamedPipeServerStream(Program.PipeName + (testing ? "-test" : ""), PipeDirection.InOut, 8, PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 65536, 65536, security);
                pipe.WaitForConnection(); var connected = pipe;
                Task.Run(() => Client(connected));
            } catch (Exception e) { if (!closed) Program.Log(e); if (pipe != null) pipe.Dispose(); }
        }
    }
    void Client(NamedPipeServerStream pipe) {
        StreamWriter writer = null;
        try {
            using (pipe) {
                writer = new StreamWriter(pipe, new UTF8Encoding(false)) { AutoFlush = true };
                var reader = new StreamReader(pipe, Encoding.UTF8); string line;
                Invoke((Action)(() => clients.Add(writer)));
                while ((line = reader.ReadLine()) != null && !closed) {
                    if (line.Length > 1024 * 1024) break;
                    var m = Program.Decode(line); Invoke((Action)(() => Command(m)));
                }
            }
        } catch (Exception e) { if (!closed) Program.Log(e); }
        finally { if (!closed) try { Invoke((Action)(() => clients.Remove(writer))); } catch {} }
    }
    void Command(Dictionary<string, object> m) {
        try {
            switch (Program.Str(m, "type")) {
                case "warm-owner": if(lastPlay==null){warmOwnerPid=Convert.ToInt32(m["ownerPid"]);ownerTimer.Start();}Broadcast(new {type="warm-ready",request=Program.Str(m,"request"),idle=lastPlay==null});break;
                case "play": Play(m); break;
                case "close": Close(); break;
                case "queue": if (lastPlay != null) lastPlay["items"] = m["items"]; Post(m); break;
                case "hint": Post(m); break;
                case "test-cursor": if (testing) testCursor = new Point(Convert.ToInt32(m["x"]), Convert.ToInt32(m["y"])); break;
                case "test-close": if (testing) Close(); break;
                case "test-pause": if (testing) { var ignored = PauseManually(); } break;
                case "test-resize": if (testing) SendMessage(Handle, Program.Flag(m, "active") ? 0x231 : 0x232, IntPtr.Zero, IntPtr.Zero); break;
                case "test-size": if (testing) { Size = new Size(Math.Max(380, Math.Min(3000, Convert.ToInt32(m["width"]))), Math.Max(270, Math.Min(2000, Convert.ToInt32(m["height"])))); KeepOnScreen(); } break;
            }
        } catch (Exception e) { Broadcast(new { type = "error", error = e.Message, request = Program.Str(m, "request") }); }
    }
    async Task SetHeld(bool held) {
        string script = "globalThis.__pointResizeMedia?." + (held ? "pause" : "resume") + "()";
        await web.CoreWebView2.ExecuteScriptAsync(script);
        foreach (var frame in frames.ToArray()) try { await frame.ExecuteScriptAsync(script); } catch { if (frame.IsDestroyed() == 0 && frames.Contains(frame)) throw; }
    }
    async Task PauseManually() {
        const string script = "document.querySelectorAll('video').forEach(v=>v.pause())";
        await web.CoreWebView2.ExecuteScriptAsync(script);
        foreach (var frame in frames.ToArray()) try { await frame.ExecuteScriptAsync(script); } catch {}
    }
    async Task MouseTick() {
        if (closed || !ready || transitioning) return;
        if(lastPlay==null){Snapshot();return;}
        Point point; if (testing && testCursor.HasValue) point = testCursor.Value; else if (!GetCursorPos(out point)) return;
        if (previousPointer.HasValue && previousPointer.Value != point) keyboardTools = false;
        previousPointer = point;
        bool pressed = !testing && (GetAsyncKeyState(1) & 0x8000) != 0;
        if (tools != null && tools.Visible) {
            var arrow = new Rectangle(Right - Padding.Right - Pixels(44), Top + (Height - Pixels(44)) / 2, Pixels(44), Pixels(44));
            var leftArrow = new Rectangle(Left + Padding.Left, arrow.Top, Pixels(44), Pixels(44));
            if (Tolerant(tools.Bounds, 12).Contains(point) || arrow.Contains(point) || leftArrow.Contains(point) || (keyboardTools && tools.ContainsFocus)) toolsOutsideSince = DateTime.MinValue;
            else if (!resizing && !pressed) {
                if (toolsOutsideSince == DateTime.MinValue) toolsOutsideSince = DateTime.UtcNow;
                if ((DateTime.UtcNow - toolsOutsideSince).TotalMilliseconds > 650) HideTools();
            }
        }
        if (!hover) { Snapshot(); return; }
        bool inside = hidden ? wake.Contains(point) : PointerNear(point);
        if (inside) {
            armed = true;
            if (hidden) { transitioning = true; try { Restore(); await SetHeld(false); } catch (Exception e) { Post(new { type = "hint", text = "窗口已恢复，视频暂未续播，可使用播放控件。" }); Program.Log(e); } finally { transitioning = false; } }
        } else if (!hidden && armed && !resizing && !pressed && !(keyboardTools && tools != null && tools.ContainsFocus)) {
            transitioning = true; int token = generation;
            try {
                SavePosition(); wake = Bounds; HideTools(); hidden = true; Hide(); Snapshot();
                await SetHeld(true);
                Point now; if (testing && testCursor.HasValue) now = testCursor.Value; else GetCursorPos(out now);
                if (closed) return;
                if (token != generation || wake.Contains(now) || resizing || !hover) { if (hidden) Restore(); await SetHeld(false); }
            } catch (Exception e) { if (!closed && hidden) Restore(); hover = false; armed = false; Post(new { type = "preferences", hover, pin = TopMost }); Post(new { type = "hint", text = "未能确认视频暂停，已恢复窗口并停用移出隐藏，可重新开启后重试。" }); Program.Log(e); }
            finally { transitioning = false; }
        }
        Snapshot();
    }
    bool PointerNear(Point point) {
        if (Bounds.Contains(point)) return true;
        if (tools == null || !tools.Visible) return false;
        var panel = tools.Bounds; if (panel.Contains(point)) return true;
        int top = Math.Max(Top, panel.Top), bottom = Math.Min(Bottom, panel.Bottom);
        if (bottom <= top) return false;
        if (panel.Right <= Left) return Rectangle.FromLTRB(panel.Right, top, Left, bottom).Contains(point);
        if (panel.Left >= Right) return Rectangle.FromLTRB(Right, top, panel.Left, bottom).Contains(point);
        return false;
    }
    void Snapshot() { if (testing && !closed) { var rect = hidden ? wake : Bounds; var panel = tools == null ? Rectangle.Empty : tools.Bounds; File.WriteAllText(Path.Combine(data, "window.json"), Program.Encode(new { hidden, armed, visible = Visible, nativeVisible = IsWindowVisible(Handle), restorePreservedFocus, topmost = TopMost, x = rect.X, y = rect.Y, width = rect.Width, height = rect.Height, controlsVisible = tools != null && tools.Visible, controlsNativeVisible = tools != null && IsWindowVisible(tools.Handle), controlsReady = toolsReady, controlsX = panel.X, controlsY = panel.Y, controlsWidth = panel.Width, controlsHeight = panel.Height, resizing, hoverMargin = 0, resizeGrip = Pixels(8), hwnd = Handle.ToInt64(), pid = Process.GetCurrentProcess().Id })); } }
    protected override void WndProc(ref Message m) {
        if (m.Msg == 0x231) resizing = true;
        else if (m.Msg == 0x232) { resizing = false; KeepOnScreen(); SavePosition(); }
        if (m.Msg == 0x84) {
            var p = PointToClient(new Point((short)((long)m.LParam & 0xffff), (short)(((long)m.LParam >> 16) & 0xffff)));
            int grip = Pixels(8);
            bool l = p.X < grip, r = p.X >= ClientSize.Width - grip, t = p.Y < grip, b = p.Y >= ClientSize.Height - grip;
            int hit = t ? (l ? 13 : r ? 14 : 12) : b ? (l ? 16 : r ? 17 : 15) : l ? 10 : r ? 11 : 0;
            if (hit != 0) { m.Result = new IntPtr(hit); return; }
        }
        base.WndProc(ref m);
    }
}
