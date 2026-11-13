using System;
using Microsoft.Win32;
using System.Runtime.InteropServices;
class Probe {
 [DllImport("advapi32.dll")] static extern bool OpenProcessToken(IntPtr p,int access,out IntPtr token);
 [DllImport("advapi32.dll")] static extern bool GetTokenInformation(IntPtr t,int kind,out int value,int size,out int needed);
 [DllImport("advapi32.dll", CharSet=CharSet.Unicode)] static extern int RegCreateKeyEx(IntPtr root,string path,int reserved,string cls,int options,int access,IntPtr security,out IntPtr key,out int disp);
 [DllImport("advapi32.dll")] static extern int RegCloseKey(IntPtr key);
 static void Main() {
  Console.WriteLine(System.Security.Principal.WindowsIdentity.GetCurrent().Name);
  IntPtr tok;int flags,needed;OpenProcessToken(new IntPtr(-1),8,out tok);GetTokenInformation(tok,21,out flags,4,out needed);Console.WriteLine("Restricted: "+flags);
  foreach(var v in new[]{RegistryView.Default,RegistryView.Registry64,RegistryView.Registry32}) try {using(var root=RegistryKey.OpenBaseKey(RegistryHive.CurrentUser,v))using(var key=root.CreateSubKey("Software\\PointResizeVideoProbe")){key.SetValue("test","1");Console.WriteLine(v+": success");}}catch(Exception e){Console.WriteLine(v+": "+e.Message);}
  IntPtr handle;int d;int code=RegCreateKeyEx(new IntPtr(unchecked((int)0x80000001)),"Software\\PointResizeVideoProbe",0,null,0,0x0002|0x0004,IntPtr.Zero,out handle,out d); Console.WriteLine("RAW: "+code); if(code==0)RegCloseKey(handle);
  var psi=new System.Diagnostics.ProcessStartInfo("powershell.exe", "-NoProfile -Command \"try { $k=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\\PointResizeVideoProbe'); $k.SetValue('test','1'); $k.Dispose(); Write-Output 'Child PowerShell write succeeded' } catch { Write-Output $_.Exception.Message }\""); psi.UseShellExecute=false;psi.CreateNoWindow=true;psi.WindowStyle=System.Diagnostics.ProcessWindowStyle.Hidden;psi.RedirectStandardOutput=true; using(var child=System.Diagnostics.Process.Start(psi)){Console.WriteLine(child.StandardOutput.ReadToEnd());child.WaitForExit();}
 }
}
