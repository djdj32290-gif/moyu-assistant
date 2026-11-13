using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using System.Windows.Forms;
using System.Threading;

// Opens only this installation's extension and the chosen extension manager.
// No browser profile enumeration, modification or automatic extension install.
static class BrowserSetup {
    static string ExtensionFolder() {
        string folder=Path.Combine(Program.Home,"浏览器插件","摸鱼助手");
        foreach(string path in new[]{Program.Home,Path.Combine(Program.Home,"浏览器插件"),folder,Path.Combine(folder,"manifest.json")})
            if(!Directory.Exists(path)&&!File.Exists(path))throw new IOException("插件文件缺失，请完整解压新版软件文件夹。");
            else if((File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0)throw new IOException("插件目录包含链接，请用原始安装目录中的插件。");
        var manifest=Program.Decode(File.ReadAllText(Path.Combine(folder,"manifest.json")));
        if(Program.Str(manifest,"version")!=Program.Version||Program.Str(manifest,"name")!="摸鱼助手")throw new IOException("插件与软件版本不一致，请完整更新软件文件夹后重试。");
        return folder;
    }
    static string BrowserExe(string browser) {
        string file=browser=="chrome"?"chrome.exe":"msedge.exe";
        string relative=browser=="chrome"?"Google\\Chrome\\Application\\chrome.exe":"Microsoft\\Edge\\Application\\msedge.exe";
        foreach(string hive in new[]{"HKEY_CURRENT_USER","HKEY_LOCAL_MACHINE"}) {
            string value=Convert.ToString(Registry.GetValue(hive+"\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\"+file,"",null));
            if(!String.IsNullOrEmpty(value)&&Path.IsPathRooted(value)&&File.Exists(value)&&String.Equals(Path.GetFileName(value),file,StringComparison.OrdinalIgnoreCase))return value;
        }
        foreach(var special in new[]{Environment.SpecialFolder.ProgramFiles,Environment.SpecialFolder.ProgramFilesX86,Environment.SpecialFolder.LocalApplicationData}) {
            string value=Path.Combine(Environment.GetFolderPath(special),relative);if(File.Exists(value))return value;
        }
        return "";
    }
    public static object Open(Dictionary<string,object> args) {
        string browser=Program.Str(args,"browser");
        if(browser!="chrome"&&browser!="edge")throw new InvalidDataException("请选择 Chrome 或 Edge。");
        string folder=ExtensionFolder(),url=browser=="chrome"?"chrome://extensions/":"edge://extensions/";
        string explorer=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"explorer.exe");
        string arguments="/select,\""+folder+"\"",exe=BrowserExe(browser);
        if(Program.Testing) {
            string data=Path.Combine(Program.Home,"test-data");Directory.CreateDirectory(data);
            File.WriteAllText(Path.Combine(data,"browser-setup.json"),Program.Encode(new {browser,folder,explorer,arguments,exe,url,clipboardURL=url,clipboardSimulated=true,browserArguments="--new-window \""+url+"\"",simulated=true}));
            return new {ok=true,folder,managerURL=url,simulated=true,browserOpened=false,clipboardCopied=false,clipboardSimulated=true};
        }
        bool copied=false;string clipboardError="";
        for(int attempt=0;attempt<3&&!copied;attempt++)try{Clipboard.SetText(url);copied=true;}catch(Exception e){clipboardError=e.Message;if(attempt<2)Thread.Sleep(30);}
        Process.Start(new ProcessStartInfo(explorer,arguments){UseShellExecute=true});
        bool opened=false;string error="";
        if(exe!="")try{Process.Start(new ProcessStartInfo(exe,"--new-window \""+url+"\""){UseShellExecute=true});opened=true;}catch(Exception e){error=e.Message;}
        return new {ok=true,folder,managerURL=url,browserOpened=opened,browserError=error,clipboardCopied=copied,clipboardError};
    }
}
