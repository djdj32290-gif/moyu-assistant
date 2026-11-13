using System;
using System.IO;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Web.Script.Serialization;
sealed class Probe : Form {
    public int Clicks;
    protected override bool ShowWithoutActivation { get { return true; } }
    protected override void OnPaint(PaintEventArgs e) {for(int y=0;y<Height;y+=24)for(int x=0;x<Width;x+=24)using(var brush=new SolidBrush(((x+y)/24)%2==0?Color.FromArgb(224,232,240):Color.FromArgb(244,247,250)))e.Graphics.FillRectangle(brush,x,y,24,24);}
    protected override void WndProc(ref Message m) {if(m.Msg==0x21){m.Result=new IntPtr(3);return;}if(m.Msg==0x201){Clicks++;return;}base.WndProc(ref m);}
}
static class Test {
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll",SetLastError=true)] static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int w,int h,uint flags);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd,int command);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point p);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h,uint flags);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT rect);
    [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h,int index);
    [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h,int index,IntPtr value);
    struct RECT {public int Left,Top,Right,Bottom;}
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd,int m,IntPtr w,IntPtr l);
    [DllImport("user32.dll")] static extern int GetWindowRgn(IntPtr hwnd,IntPtr region);
    [DllImport("gdi32.dll")] static extern IntPtr CreateRectRgn(int l,int t,int r,int b);
    [DllImport("gdi32.dll")] static extern int GetRegionData(IntPtr region,int size,byte[] data);
    static string RegionBytes(IntPtr hwnd){var r=CreateRectRgn(0,0,0,0);try{GetWindowRgn(hwnd,r);int size=GetRegionData(r,0,null);byte[] bytes=new byte[size];GetRegionData(r,size,bytes);return Convert.ToBase64String(bytes);}finally{DeleteObject(r);}}
    [DllImport("gdi32.dll")] static extern bool PtInRegion(IntPtr region,int x,int y);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr value);
    [STAThread]static void Main(string[] args) {
        SetProcessDpiAwarenessContext(new IntPtr(-4));Application.EnableVisualStyles();
        var json=new JavaScriptSerializer();var state=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(args[0]));
        var hwnd=new IntPtr(Convert.ToInt64(state["hwnd"]));int x=Convert.ToInt32(state["x"]),y=Convert.ToInt32(state["y"]),w=Convert.ToInt32(state["width"]),h=Convert.ToInt32(state["height"]);
        if(args.Length==4&&args[1]=="--drag") {
            RECT before;GetWindowRect(hwnd,out before);double scale=(before.Right-before.Left)/Convert.ToDouble(state["viewportWidth"]);double startMain=before.Left;
            foreach(Dictionary<string,object> shape in (IEnumerable)state["shapes"])if(Convert.ToString(shape["kind"])=="panel")startMain+=Convert.ToDouble(shape["x"])*scale;
            Point original=Cursor.Position,start=new Point((int)startMain+90,before.Top+40);var samples=new List<object>();string originalRegion=RegionBytes(hwnd);var memory=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(RECT)));
            try{Cursor.Position=start;SendMessage(hwnd,0x231,IntPtr.Zero,IntPtr.Zero);for(int n=1;n<=16;n++){
                double desired=startMain+(Int32.Parse(args[2])-startMain)*n/16;Cursor.Position=new Point(start.X+(int)Math.Round(desired-startMain),start.Y);
                var r=new RECT {Left=before.Left+(int)(desired-startMain),Top=Int32.Parse(args[3]),Right=before.Right+(int)(desired-startMain),Bottom=Int32.Parse(args[3])+before.Bottom-before.Top};Marshal.StructureToPtr(r,memory,false);SendMessage(hwnd,0x216,new IntPtr(2),memory);r=(RECT)Marshal.PtrToStructure(memory,typeof(RECT));SetWindowPos(hwnd,IntPtr.Zero,r.Left,r.Top,0,0,0x15);System.Threading.Thread.Sleep(80);
                var current=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(args[0]));double actual=r.Left;foreach(Dictionary<string,object> shape in (IEnumerable)current["shapes"])if(Convert.ToString(shape["kind"])=="panel")actual+=Convert.ToDouble(shape["x"])*scale;samples.Add(new {desired,actual,side=current["tabSide"],regionStable=RegionBytes(hwnd)==originalRegion});
            }SendMessage(hwnd,0x232,IntPtr.Zero,IntPtr.Zero);System.Threading.Thread.Sleep(250);var final=json.Deserialize<Dictionary<string,object>>(File.ReadAllText(args[0]));RECT actualFinal;GetWindowRect(hwnd,out actualFinal);Console.WriteLine(json.Serialize(new {samples,finalSide=final["tabSide"],finalX=actualFinal.Left}));}finally{Cursor.Position=original;Marshal.FreeHGlobal(memory);}return;
        }
        if(args.Length==4&&args[1]=="--move") {
            RECT before;GetWindowRect(hwnd,out before);var moving=new RECT {Left=Int32.Parse(args[2]),Top=Int32.Parse(args[3])};moving.Right=moving.Left+before.Right-before.Left;moving.Bottom=moving.Top+before.Bottom-before.Top;
            var memory=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(RECT)));try{Marshal.StructureToPtr(moving,memory,false);SendMessage(hwnd,0x216,new IntPtr(2),memory);moving=(RECT)Marshal.PtrToStructure(memory,typeof(RECT));SetWindowPos(hwnd,IntPtr.Zero,moving.Left,moving.Top,0,0,0x15);SendMessage(hwnd,0x232,IntPtr.Zero,IntPtr.Zero);RECT after;GetWindowRect(hwnd,out after);Console.WriteLine(json.Serialize(new {before,after}));}finally{Marshal.FreeHGlobal(memory);}return;
        }
        RECT actualBounds;GetWindowRect(hwnd,out actualBounds);x=actualBounds.Left;y=actualBounds.Top;w=actualBounds.Right-x;h=actualBounds.Bottom-y;
        double sx=w/Convert.ToDouble(state["viewportWidth"]),sy=h/Convert.ToDouble(state["viewportHeight"]);
        bool rightSide=state.ContainsKey("tabSide")&&Convert.ToString(state["tabSide"])=="right";
        var points=new List<Tuple<string,Point,bool>>();points.Add(Tuple.Create("empty-side",new Point(rightSide?w-10:10,10),false));
        foreach(Dictionary<string,object> shape in (IEnumerable)state["shapes"]) {
            int left=(int)Math.Ceiling(Convert.ToDouble(shape["x"])*sx),top=(int)Math.Ceiling(Convert.ToDouble(shape["y"])*sy),right=(int)Math.Floor((Convert.ToDouble(shape["x"])+Convert.ToDouble(shape["width"]))*sx),bottom=(int)Math.Floor((Convert.ToDouble(shape["y"])+Convert.ToDouble(shape["height"]))*sy);
            string kind=Convert.ToString(shape["kind"]);points.Add(Tuple.Create(kind+"-center",new Point((left+right)/2,(top+bottom)/2),true));
            if(kind=="panel")points.Add(Tuple.Create("rounded-corner",new Point(rightSide?left:right-1,top),false));
            if(kind=="rail")points.Add(Tuple.Create("rail-gap",new Point(rightSide?left-5:right+5,(top+bottom)/2),false));
        }
        bool originalTopmost=(GetWindowLongPtr(hwnd,-20).ToInt64()&8)!=0;
        using(var under=new Probe {FormBorderStyle=FormBorderStyle.None,AutoScaleMode=AutoScaleMode.None,StartPosition=FormStartPosition.Manual,Bounds=new Rectangle(x,y,w,h),TopMost=true,ShowInTaskbar=false}) {
            try {
            under.Show();ShowWindow(under.Handle,5);under.Activate();Application.DoEvents();under.TopMost=false;under.TopMost=true;SetWindowPos(under.Handle,new IntPtr(-1),x,y,w,h,0x50);SetWindowPos(hwnd,new IntPtr(-1),0,0,0,0,0x13);System.Threading.Thread.Sleep(250);
            if(!IsWindowVisible(under.Handle))throw new Exception("The independent lower test window must actually be visible");
            var region=CreateRectRgn(0,0,0,0);GetWindowRgn(hwnd,region);var results=new List<object>();
            foreach(var item in points){
                // Keep only our two test windows in their intended order after each test click.
                bool raised=SetWindowPos(under.Handle,new IntPtr(-1),x,y,w,h,0x50);int raiseError=Marshal.GetLastWin32Error();bool underRaised=(GetWindowLongPtr(under.Handle,-20).ToInt64()&8)!=0;SetWindowPos(hwnd,new IntPtr(-1),0,0,0,0,0x13);Application.DoEvents();System.Threading.Thread.Sleep(40);
                bool inside=PtInRegion(region,item.Item2.X,item.Item2.Y);var actual=WindowFromPoint(new Point(x+item.Item2.X,y+item.Item2.Y));uint pid;GetWindowThreadProcessId(actual,out pid);bool target=GetAncestor(actual,2)==(item.Item3?hwnd:under.Handle);if(!inside&&target){SendMessage(actual,0x201,new IntPtr(1),IntPtr.Zero);SendMessage(actual,0x202,IntPtr.Zero,IntPtr.Zero);}results.Add(new {name=item.Item1,region=inside,expected=item.Item3,target,process=pid,raised,raiseError,underRaised,localX=item.Item2.X,localY=item.Item2.Y});}
            DeleteObject(region);
            if(args.Length>1)using(var bitmap=new Bitmap(w,h)){using(var graphics=Graphics.FromImage(bitmap))graphics.CopyFromScreen(x,y,0,0,new Size(w,h));bitmap.Save(args[1]);}
            RECT underBounds;GetWindowRect(under.Handle,out underBounds);
            Console.WriteLine(json.Serialize(new {points=results,clicks=under.Clicks,topmost=originalTopmost,measuringTopmost=(GetWindowLongPtr(hwnd,-20).ToInt64()&8)!=0,underTopmost=(GetWindowLongPtr(under.Handle,-20).ToInt64()&8)!=0,underVisible=IsWindowVisible(under.Handle),icon=SendMessage(hwnd,0x7F,new IntPtr(1),IntPtr.Zero).ToInt64(),dpi=state["dpi"],x,y,w,h,underBounds}));
            } finally {under.Close();SetWindowPos(hwnd,originalTopmost?new IntPtr(-1):new IntPtr(-2),0,0,0,0,0x13);}
        }
    }
}
