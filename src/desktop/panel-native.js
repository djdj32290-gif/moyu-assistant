// Local data RPC works without a browser. Only page operations cross the relay.
(() => {
  const pending = new Map(), changed = new Set(), messages = new Set(), events = new Set();
  const send = value => chrome.webview.postMessage(value);
  function rpc(method, args) {
    const request = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(request); reject(new Error("浏览器连接超时，请确认浏览器仍在运行。")); }, 60000);
      pending.set(request, { resolve, reject, timer }); send({ type: "panel-rpc", method, args, request });
    });
  }
  const original = globalThis.chrome;
  let snapshot={};
  async function get(keys) {
    const state=await rpc("library",{action:"read"});snapshot=state.data;
    if(keys==null)return structuredClone(snapshot);
    const names=typeof keys==="string"?[keys]:Array.isArray(keys)?keys:Object.keys(keys);
    return Object.fromEntries(names.filter(key=>key in snapshot||typeof keys==="object"&&!Array.isArray(keys)).map(key=>[key,key in snapshot?snapshot[key]:keys[key]]));
  }
  async function runtime(args) {
    if(args.type==='POINT_RESIZE_GET_ZOOM')return rpc('panel-zoom-get');
    if(/^(VIDEO_QUEUE_|POINT_RESIZE_BACKUP_|POINT_RESIZE_HOVER_(?:SET|SIZE)$)/.test(args.type||""))return PointResizeLibraryAPI(value=>rpc("library",{...value,operationId:crypto.randomUUID()})).runtime(args);
    if(args.type==="VIDEO_NATIVE_PLAY"||args.type==="VIDEO_NATIVE_UNINSTALL")return rpc("native-local",args);
    return rpc("runtime",args);
  }
  globalThis.chrome = { webview: original.webview,
    runtime: { id: "desktop", getManifest: () => ({ version: "" }), sendMessage: runtime, onMessage: { addListener: fn => messages.add(fn) } },
    storage: { local: { get, set: async values=>{if(Object.keys(values).some(key=>key!=="point-resize:panel-position"))throw new Error("请通过资料库接口保存。");} }, onChanged: { addListener: fn => changed.add(fn) } }
  };
  original.webview.addEventListener("message", event => {
    const m = event.data;
    if (m.type === "panel-result") {
      const task = pending.get(m.request); if (!task) return;
      pending.delete(m.request); clearTimeout(task.timer); m.error ? task.reject(new Error(m.error)) : task.resolve(m.result);
    } else if(m.type==="library-changed") {
      const changes={};for(const key of new Set([...Object.keys(snapshot),...Object.keys(m.data)]))if(JSON.stringify(snapshot[key])!==JSON.stringify(m.data[key]))changes[key]={oldValue:snapshot[key],newValue:m.data[key]};
      snapshot=m.data;for(const fn of changed)fn(changes,"local");for(const fn of events)fn(m);
    }
    else if (m.type === "storage-changed") { /* Browser caches never overwrite the local library. */ }
    else if (m.type === "runtime-message") { for (const fn of messages) fn(m.message); }
    else { for (const fn of events) fn(m); }
  });
  globalThis.PointResizeDesktop = { rpc, send, on: fn => events.add(fn) };
})();
