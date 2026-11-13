using System;
using System.IO;
using System.Drawing;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
static class StartupProbe {
    [DllImport("user32.dll")]static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")]static extern bool GetWindowRect(IntPtr h,out RECT r);
    [DllImport("user32.dll")]static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
    [DllImport("user32.dll")]static extern int GetWindowRgn(IntPtr h,IntPtr r);
    [DllImport("user32.dll")]static extern IntPtr WindowFromPoint(Point p);
    [DllImport("user32.dll")]static extern IntPtr GetAncestor(IntPtr h,uint f);
    [DllImport("user32.dll")]static extern IntPtr SendMessage(IntPtr h,int m,IntPtr w,IntPtr l);
    [DllImport("gdi32.dll")]static extern IntPtr CreateRectRgn(int l,int t,int r,int b);
    [DllImport("gdi32.dll")]static extern bool PtInRegion(IntPtr r,int x,int y);
    [DllImport("gdi32.dll")]static extern bool DeleteObject(IntPtr r);
    struct RECT {public int Left,Top,Right,Bottom;}
    static void Main(string[] args) {
        SetProcessDpiAwarenessContext(new IntPtr(-4));var timer=Stopwatch.StartNew();
        var process=Process.GetProcessById(Int32.Parse(args[0]));string home=Path.GetDirectoryName(process.MainModule.FileName);
        IntPtr hwnd=IntPtr.Zero;
        while(timer.ElapsedMilliseconds<15000&&!process.HasExited){process.Refresh();hwnd=process.MainWindowHandle;if(hwnd!=IntPtr.Zero&&IsWindowVisible(hwnd))break;System.Threading.Thread.Sleep(10);}
        if(hwnd==IntPtr.Zero||!IsWindowVisible(hwnd))throw new Exception("No visible software window");
        long shown=timer.ElapsedMilliseconds;bool dataExists=Directory.Exists(Path.Combine(home,"test-data"));
        RECT bounds;GetWindowRect(hwnd,out bounds);var r=CreateRectRgn(0,0,0,0);int kind=GetWindowRgn(hwnd,r);int w=bounds.Right-bounds.Left,h=bounds.Bottom-bounds.Top;
        bool center=PtInRegion(r,w*2/3,Math.Min(h/2,150)),corner=PtInRegion(r,0,0);DeleteObject(r);
        bool hit=GetAncestor(WindowFromPoint(new Point(bounds.Left+w*2/3,bounds.Top+Math.Min(h/2,150))),2)==hwnd;
        if(args.Length>1&&args[1]!="--close"){System.Threading.Thread.Sleep(250);using(var bitmap=new Bitmap(w,h)){using(var graphics=Graphics.FromImage(bitmap)){var dc=graphics.GetHdc();try{if(!PrintWindow(hwnd,dc,2))throw new Exception("Native startup capture failed");}finally{graphics.ReleaseHdc(dc);}}bitmap.Save(args[1]);}}
        if(args.Length>1&&args[1]=="--close")SendMessage(hwnd,0x10,IntPtr.Zero,IntPtr.Zero);
        Console.WriteLine(new JavaScriptSerializer().Serialize(new {pid=process.Id,hwnd=hwnd.ToInt64(),visible=true,shownMilliseconds=shown,dataExists,regionKind=kind,center,corner,hit}));
    }
}
