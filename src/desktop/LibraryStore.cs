using System;
using System.IO;
using System.Collections;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Text.RegularExpressions;

// Every process uses the same installation-scoped lock and durable revision.
// Browser storage is only a cache after migration. Never reconcile stale caches.
static class LibraryStore {
    public const string QueueKey = "point-resize:video-queue:v1";
    public const string ViewKey = "point-resize:video-view:v1";
    public const string PreviewKey = "point-resize:hover-preview:v1";
    public const string PreviewSizeKey = "point-resize:hover-size:v1";
    static string Folder { get { return Path.Combine(Program.Home, Program.Testing ? "test-library" : "资料库"); } }
    static string FilePath { get { return Path.Combine(Folder,"library.json"); } }
    public static long Stamp { get { return File.Exists(FilePath)?File.GetLastWriteTimeUtc(FilePath).Ticks:0; } }
    static string Comparable(object value) {
        var obj=value as Dictionary<string,object>;
        if(obj!=null) {var keys=new List<string>(obj.Keys);keys.Sort(StringComparer.Ordinal);var parts=new List<string>();foreach(string key in keys)parts.Add(Program.Encode(key)+":"+Comparable(obj[key]));return "{"+String.Join(",",parts)+"}";}
        if(value is IEnumerable && !(value is string)) {var parts=new List<string>();foreach(var item in (IEnumerable)value)parts.Add(Comparable(item));return "["+String.Join(",",parts)+"]";}
        return Program.Encode(value);
    }
    static string Hash(string value) { using(var sha=SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-","").ToLowerInvariant(); }
    static void SafePath(string path) {
        for(var info=new DirectoryInfo(Folder);info!=null;info=info.Parent) if(info.Exists && (info.Attributes & FileAttributes.ReparsePoint)!=0) throw new IOException("资料库路径包含链接，已停止写入。");
        if(File.Exists(path) && (File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0) throw new IOException("资料库文件是链接，已停止写入。");
    }
    static void Durable(string path,string text) {
        SafePath(path); byte[] bytes=new UTF8Encoding(false).GetBytes(text);
        using(var stream=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { stream.Write(bytes,0,bytes.Length); stream.Flush(true); }
    }
    static void Write(Dictionary<string,object> state) {
        SafePath(FilePath);Directory.CreateDirectory(Folder); string json=Program.Encode(state);
        if(Encoding.UTF8.GetByteCount(json)>24*1024*1024) throw new IOException("资料库超过 24 MB，未保存；现有资料保持不变。");
        string temporary=Path.Combine(Folder,"commit-"+Guid.NewGuid().ToString("N")+".tmp"), previous=Path.Combine(Folder,"library.previous.json");
        SafePath(FilePath); SafePath(previous);
        try { Durable(temporary,Program.Encode(new { payload=json, sha256=Hash(json) })); if(File.Exists(FilePath)) File.Replace(temporary,FilePath,previous,true); else File.Move(temporary,FilePath); }
        finally { if(File.Exists(temporary)) File.Delete(temporary); }
    }
    static Dictionary<string,object> Read() {
        SafePath(FilePath);
        if(!File.Exists(FilePath)) { var empty=new Dictionary<string,object>{{"schema",1},{"libraryId",Guid.NewGuid().ToString("N")},{"revision",0},{"data",new Dictionary<string,object>()},{"sources",new Dictionary<string,object>()},{"operations",new ArrayList()}}; Write(empty); return empty; }
        var wrap=Program.Decode(File.ReadAllText(FilePath,Encoding.UTF8)); string payload=Program.Str(wrap,"payload");
        if(Hash(payload)!=Program.Str(wrap,"sha256")) throw new IOException("资料库校验失败。原文件已保留，请从 library.previous.json 或迁移备份恢复，未创建空库。");
        var state=Program.Decode(payload);
        if(Convert.ToInt32(state["schema"])!=1) throw new IOException("资料库版本不受支持，请更新软件。");
        return state;
    }
    static Dictionary<string,object> Obj(object value) { var obj=value as Dictionary<string,object>; if(obj==null) throw new InvalidDataException("资料格式无效。"); return obj; }
    static ArrayList List(object value) { var list=value as IEnumerable; if(list==null || value is string || value is IDictionary) throw new InvalidDataException("列表格式无效。"); var result=new ArrayList(); foreach(var item in list) result.Add(item); return result; }
    static bool Owns(string key) { if(key==QueueKey || key==ViewKey || key==PreviewKey || key==PreviewSizeKey || key=="point-resize:panel-position") return true; if(!key.StartsWith("point-resize:v1:")) return false; string site=key.Substring(16); return site=="local-demo" || Uri.CheckHostName(site)!=UriHostNameType.Unknown; }
    static void ValidateRule(Dictionary<string,object> rule,bool layer) {
        string mode=Program.Str(rule,"mode"), selector=Program.Str(rule,"selector");
        if(selector.Length==0 || selector.Length>2500 || (mode!="scale" && mode!="font")) throw new InvalidDataException("保存项选区或类型无效。");
        double value=Convert.ToDouble(rule["value"]); if(Double.IsNaN(value)||Double.IsInfinity(value)||value<(mode=="font"?8:10)||value>(mode=="font"?64:200)) throw new InvalidDataException("保存项大小无效。");
        foreach(string key in new[]{"hidden","enabled","similar"}) if(rule.ContainsKey(key) && !(rule[key] is bool)) throw new InvalidDataException("保存项开关无效。");
        foreach(string key in new[]{"id","name","label","defaultLabel","kind","pageURL"}) if(rule.ContainsKey(key) && (!(rule[key] is string)||((string)rule[key]).Length>10000)) throw new InvalidDataException("保存项文字无效。");
        if(rule.ContainsKey("thumbnail") && Program.Str(rule,"thumbnail")!="" && !Regex.IsMatch(Program.Str(rule,"thumbnail"),"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")) throw new InvalidDataException("截图无效。");
        if(Program.Str(rule,"thumbnail").Length>240000) throw new InvalidDataException("截图过大。");
        if(rule.ContainsKey("layers")) { var layers=List(rule["layers"]); if(layer||layers.Count>100) throw new InvalidDataException("层级超出限制。"); foreach(var entry in layers) ValidateRule(Obj(entry),true); }
    }
    static bool ValidPreviewScale(object value){if(!(value is int)&&!(value is long)&&!(value is double)&&!(value is decimal))return false;double scale=Convert.ToDouble(value);return !Double.IsNaN(scale)&&!Double.IsInfinity(scale)&&scale>=.5&&scale<=3;}
    static void Validate(Dictionary<string,object> data) {
        foreach(var pair in data) {
            if(!Owns(pair.Key)) throw new InvalidDataException("不支持的资料键。");
            if(pair.Key.StartsWith("point-resize:v1:")) { var profile=Obj(pair.Value); var rules=List(profile["rules"]); if(rules.Count>100) throw new InvalidDataException("网站保存项超过 100 条，未截断或保存。"); if(profile.ContainsKey("enabled")&&!(profile["enabled"] is bool)) throw new InvalidDataException("网站开关无效。"); foreach(var item in rules) ValidateRule(Obj(item),false); }
            else if(pair.Key==QueueKey) { var queue=List(pair.Value); if(queue.Count>200) throw new InvalidDataException("待看列表超过 200 条，未截断或保存。"); var ids=new HashSet<string>(); foreach(var item in queue) { var entry=Obj(item); if(Program.Str(entry,"id")=="" || !ids.Add(Program.Str(entry,"id"))) throw new InvalidDataException("视频身份无效或重复。"); if(entry.ContainsKey("watched")&&!(entry["watched"] is bool)) throw new InvalidDataException("已看标记无效。"); } }
            else if(pair.Key==PreviewSizeKey){var size=Obj(pair.Value);if(size.Count!=1||!size.ContainsKey("scale")||!ValidPreviewScale(size["scale"]))throw new InvalidDataException("预览尺寸无效。");}
            else if(pair.Key==PreviewKey){var view=Obj(pair.Value);if(view.Count!=1||!view.ContainsKey("images")||!(view["images"] is bool))throw new InvalidDataException("悬停预览设置无效。");}
            else if(pair.Key==ViewKey){var view=Obj(pair.Value);string mode=Program.Str(view,"titles");if(view.Count!=1||(mode!="expanded"&&mode!="collapsed"))throw new InvalidDataException("标题显示方式无效。");}
            else { var pos=Obj(pair.Value); double x=Convert.ToDouble(pos["x"]), y=Convert.ToDouble(pos["y"]); if(Double.IsNaN(x)||Double.IsInfinity(x)||Double.IsNaN(y)||Double.IsInfinity(y)) throw new InvalidDataException("位置无效。"); }
        }
    }
    static Dictionary<string,object> Response(Dictionary<string,object> state) { return new Dictionary<string,object>{{"ok",true},{"libraryId",state["libraryId"]},{"revision",state["revision"]},{"data",state["data"]}}; }
    public static Dictionary<string,object> Request(Dictionary<string,object> message) {
        using(var mutex=new Mutex(false,"Local\\PointResizeLibrary-"+Hash(Program.Home.ToLowerInvariant()).Substring(0,24)+(Program.Testing?"-test":""))) {
            bool acquired=false; try { try { acquired=mutex.WaitOne(15000); } catch(AbandonedMutexException) { acquired=true; } if(!acquired) throw new IOException("资料库忙碌，请重试。"); return Locked(message); } finally { if(acquired) mutex.ReleaseMutex(); }
        }
    }
    static Dictionary<string,object> Locked(Dictionary<string,object> m) {
        var state=Read(); var data=Obj(state["data"]); string action=Program.Str(m,"action"), op=Program.Str(m,"operationId");
        if(m.ContainsKey("libraryId") && Program.Str(m,"libraryId")!=Program.Str(state,"libraryId")) throw new InvalidDataException("资料库已更换，请重新连接；旧缓存未覆盖当前资料。");
        if(action=="read") {var response=Response(state);response["migrated"]=Obj(state["sources"]).ContainsKey(Program.Str(m,"source"));return response;}
        var operations=List(state["operations"]);
        if(op!="" && operations.Contains(op)) return Response(state);
        if(m.ContainsKey("libraryId") && Program.Str(m,"libraryId")!=Program.Str(state,"libraryId")) throw new InvalidDataException("资料库已更换，请重新连接；旧缓存未覆盖当前资料。");
        if(action=="migrate") {
            string source=Program.Str(m,"source"); if(!Regex.IsMatch(source,"^[a-p]{32}:[a-f0-9]{32}$")) throw new InvalidDataException("迁移来源无效。");
            var sources=Obj(state["sources"]); if(sources.ContainsKey(source)) return Response(state);
            var incoming=Obj(m["data"]); Validate(incoming);
            string raw=Program.Str(m,"raw"); if(Encoding.UTF8.GetByteCount(raw)>16*1024*1024) throw new InvalidDataException("迁移快照超过限制，原扩展数据未删除。");
            string backup=Path.Combine(Folder,"migration-"+source.Replace(':','-')+".json"); SafePath(backup);
            if(!File.Exists(backup)) Durable(backup,Program.Encode(new { format="point-resize-backup",schemaVersion=1,extensionVersion=Program.Version,exportedAt=DateTime.UtcNow.ToString("o"),migrationSource=source,raw,data=incoming }));
            foreach(var pair in incoming) {
                if(!data.ContainsKey(pair.Key)) { data[pair.Key]=pair.Value; continue; }
                if(pair.Key.StartsWith("point-resize:v1:")) {
                    var old=Obj(data[pair.Key]); var rules=List(old["rules"]); bool oldEnabled=!old.ContainsKey("enabled")||Program.Flag(old,"enabled");
                    foreach(var item in rules) { var rule=Obj(item); rule["enabled"]=oldEnabled&&(!rule.ContainsKey("enabled")||Program.Flag(rule,"enabled")); }
                    var added=Obj(pair.Value); foreach(var item in List(added["rules"])) { var rule=Obj(item); rule["enabled"]=(!added.ContainsKey("enabled")||Program.Flag(added,"enabled"))&&(!rule.ContainsKey("enabled")||Program.Flag(rule,"enabled")); bool duplicate=false; foreach(var existing in rules) if(Program.Encode(existing)==Program.Encode(rule)) {duplicate=true;break;} if(duplicate) continue; foreach(var existing in rules) if(Program.Str(Obj(existing),"id")==Program.Str(rule,"id")) { rule["migrationOriginalId"]=Program.Str(rule,"id");rule["id"]=Guid.NewGuid().ToString("N");break; } rules.Add(rule); }
                    old["enabled"]=true; old["rules"]=rules;
                } else if(pair.Key==QueueKey) { var queue=List(data[pair.Key]); foreach(var item in List(pair.Value)) { var entry=Obj(item); Dictionary<string,object> found=null; foreach(var existing in queue) if(Program.Str(Obj(existing),"id")==Program.Str(entry,"id")) {found=Obj(existing);break;} if(found==null) queue.Add(entry); else found["watched"]=Program.Flag(found,"watched")||Program.Flag(entry,"watched"); } data[pair.Key]=queue; }
            }
            sources[source]=new { completedAt=DateTime.UtcNow.ToString("o"), snapshot=Path.GetFileName(backup) };
        } else if(action=="set") {
            if(!m.ContainsKey("revision") || Convert.ToInt64(m["revision"])!=Convert.ToInt64(state["revision"])) { var conflict=Response(state); conflict["conflict"]=true; return conflict; }
            foreach(var pair in Obj(m["writes"])) { if(!Owns(pair.Key)) throw new InvalidDataException("不支持的资料键。"); data[pair.Key]=pair.Value; }
        } else if(action=="profile") {
            string key=Program.Str(m,"key"); if(!key.StartsWith("point-resize:v1:") || !Owns(key)) throw new InvalidDataException("网站无效。");
            if(!data.ContainsKey(key)) data[key]=new Dictionary<string,object>{{"enabled",true},{"rules",new ArrayList()}};
            var profile=Obj(data[key]); var rules=List(profile["rules"]); string id=Program.Str(m,"id"), command=Program.Str(m,"command");
            // Legacy whole-site pause becomes per-item pause before editing one
            // record, so enabling or adding one item leaves the others paused.
            if(profile.ContainsKey("enabled")&&!Program.Flag(profile,"enabled")){foreach(var item in rules)Obj(item)["enabled"]=false;profile["enabled"]=true;}
            if(command=="upsert") { var rule=Obj(m["rule"]); if(Program.Str(rule,"id")!=id || id=="") throw new InvalidDataException("保存项身份无效。");
                if(m.ContainsKey("baseRule")) { Dictionary<string,object> current=null; foreach(var item in rules) if(Program.Str(Obj(item),"id")==id) current=Program.Decode(Program.Encode(item)); if(current!=null) { current["enabled"]=(!profile.ContainsKey("enabled")||Program.Flag(profile,"enabled"))&&(!current.ContainsKey("enabled")||Program.Flag(current,"enabled"));if(!current.ContainsKey("thumbnail"))current["thumbnail"]=""; } if(Comparable(current)!=Comparable(m["baseRule"])) throw new IOException("此保存项已在另一处修改，请保留草稿并重新载入后保存。"); }
                for(int i=rules.Count-1;i>=0;i--) if(Program.Str(Obj(rules[i]),"id")==id) rules.RemoveAt(i); rules.Add(rule);
            } else if(command=="remove") { for(int i=rules.Count-1;i>=0;i--) if(Program.Str(Obj(rules[i]),"id")==id) rules.RemoveAt(i); }
            else if(command=="toggle-all") { foreach(var item in rules) Obj(item)["enabled"]=Program.Flag(m,"enabled"); profile["enabled"]=true; }
            else if(command=="update") { foreach(var item in rules) if(Program.Str(Obj(item),"id")==id) foreach(var pair in Obj(m["updates"])) { if(pair.Key!="enabled"&&pair.Key!="name"&&pair.Key!="label") throw new InvalidDataException("不支持的保存项更新。"); Obj(item)[pair.Key]=pair.Value; } }
            else throw new InvalidDataException("不支持的保存项操作。"); profile["rules"]=rules;
        } else if(action=="hover-size"){if(!m.ContainsKey("scale")||!ValidPreviewScale(m["scale"]))throw new InvalidDataException("预览尺寸无效。");data[PreviewSizeKey]=new Dictionary<string,object>{{"scale",m["scale"]}};
        } else if(action=="hover-preview") {if(!m.ContainsKey("images")||!(m["images"] is bool))throw new InvalidDataException("悬停预览设置无效。");data[PreviewKey]=new Dictionary<string,object>{{"images",m["images"]}};
        } else if(action=="video-view") {string mode=Program.Str(m,"mode");if(mode!="expanded"&&mode!="collapsed")throw new InvalidDataException("标题显示方式无效。");data[ViewKey]=new Dictionary<string,object>{{"titles",mode}};
        } else if(action=="queue-add" || action=="queue-remove" || action=="watch" || action=="clear-watched") {
            var queue=data.ContainsKey(QueueKey)?List(data[QueueKey]):new ArrayList(); string id=Program.Str(m,"id");
            if(action=="queue-add") { var item=Obj(m["item"]); if(Program.Flag(item,"dependent")) throw new InvalidDataException("临时视频流不会加入待看列表。"); bool exists=false; foreach(var entry in queue) if(Program.Str(Obj(entry),"id")==Program.Str(item,"id")) exists=true; if(!exists) queue.Insert(0,item); }
            else for(int i=queue.Count-1;i>=0;i--) { var entry=Obj(queue[i]); if(action=="queue-remove"&&Program.Str(entry,"id")==id || action=="clear-watched"&&Program.Flag(entry,"watched")) queue.RemoveAt(i); else if(action=="watch"&&Program.Str(entry,"id")==id) entry["watched"]=Program.Flag(m,"watched"); }
            data[QueueKey]=queue;
        } else throw new InvalidDataException("不支持的资料操作。");
        Validate(data); state["revision"]=Convert.ToInt64(state["revision"])+1;
        if(op!="") { operations.Add(op); while(operations.Count>512) operations.RemoveAt(0); } state["operations"]=operations;
        Write(state); return Response(state);
    }
}
