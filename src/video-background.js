// Imported by the service worker. All queue writes pass through one serial writer.
const VQ = PointResizeVideoData;
let videoWrites = Promise.resolve();
function videoMutate(mutate) {
  const result = videoWrites.then(async () => {
    const data = await chrome.storage.local.get(VQ.key), items = VQ.clean(data[VQ.key]);
    const extra = mutate(items) || {};
    await chrome.storage.local.set({ [VQ.key]: items });
    return { ok: true, items, ...extra };
  });
  videoWrites = result.catch(() => {});
  return result;
}
function legacyQueueRequest(message, sender) {
  if (sender.id === chrome.runtime.id && ["POINT_RESIZE_BACKUP_EXPORT", "POINT_RESIZE_BACKUP_IMPORT"].includes(message?.type)) {
    // Imports share the queue writer, so an in-flight video add cannot be lost.
    const operation = videoWrites.then(async () => {
      const current = await chrome.storage.local.get(null);
      if (message.type === "POINT_RESIZE_BACKUP_EXPORT") return { ok: true, backup: PointResizeBackup.create(current, chrome.runtime.getManifest().version) };
      const incoming = PointResizeBackup.parse(message.text);
      await chrome.storage.local.set(PointResizeBackup.merge(current, incoming));
      return { ok: true, summary: PointResizeBackup.counts(incoming) };
    });
    videoWrites = operation.catch(() => {});
    return operation;
  }
  if(sender.id===chrome.runtime.id&&message?.type==="POINT_RESIZE_HOVER_SIZE"){const operation=videoWrites.then(async()=>{const scale=VQ.previewScale(message.scale);await chrome.storage.local.set({[VQ.previewSizeKey]:{scale}});return {ok:true};});videoWrites=operation.catch(()=>{});return operation;}
  if(sender.id===chrome.runtime.id&&message?.type==="POINT_RESIZE_HOVER_SET"){const operation=videoWrites.then(async()=>{if(typeof message.images!=="boolean")throw new Error("悬停预览设置无效。");await chrome.storage.local.set({[VQ.previewKey]:{images:message.images}});return {ok:true};});videoWrites=operation.catch(()=>{});return operation;}
  if (sender.id !== chrome.runtime.id || typeof message?.type !== "string" || !message.type.startsWith("VIDEO_QUEUE_")) return;
  let operation;
  if (message.type === "VIDEO_QUEUE_VIEW") { operation=videoWrites.then(async()=>{const view={titles:VQ.titleMode(message.mode)};await chrome.storage.local.set({[VQ.viewKey]:view});return {ok:true,view};});videoWrites=operation.catch(()=>{}); }
  else if (message.type === "VIDEO_QUEUE_ADD") operation = videoMutate(items => {
    const value = VQ.queueItem(message.item || {}), existing = items.find(entry => entry.id === value.id);
    if (existing) return { duplicate: true };
    if (items.length >= 200) throw new Error("待看列表最多保存 200 条，请先移除一些视频。");
    items.unshift(value);
  });
  else if (message.type === "VIDEO_QUEUE_REMOVE") operation = videoMutate(items => { const index = items.findIndex(item => item.id === message.id); if (index >= 0) items.splice(index, 1); });
  else if (message.type === "VIDEO_QUEUE_WATCH") operation = videoMutate(items => VQ.watch(items, message.id, message.watched));
  else if (message.type === "VIDEO_QUEUE_CLEAR_WATCHED") operation = videoMutate(VQ.clearWatched);
  else return;
  return operation;
}
function queueRequest(message,sender) {
  if(sender.id!==chrome.runtime.id||!(/^(VIDEO_QUEUE_|POINT_RESIZE_BACKUP_|POINT_RESIZE_HOVER_(?:SET|SIZE)$)/.test(message?.type||'')))return;
  if(typeof desktopLibrary!=='function')return legacyQueueRequest(message,sender);
  return serialLibrary(async()=>{
    try {await desktopConnect();}
    catch(error) {
      const meta=(await chrome.storage.local.get(LIBRARY_META))[LIBRARY_META];
      if(meta?.migrated||desktopReady)throw error;
      // Compatibility for old, unpaired installations and the local demo tests.
      return legacyQueueRequest(message,sender);
    }
    return PointResizeLibraryAPI(desktopLibrary).runtime(message);
  });
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if(sender.id===chrome.runtime.id&&message?.type==="VIDEO_RESOLVE"){
    resolveVideoLink(message.url).then(item=>respond({ok:true,item}),error=>respond({ok:false,error:error.message}));return true;
  }
  const operation = queueRequest(message, sender); if (!operation) return;
  operation.then(respond, error => respond({ ok: false, error: error.message })); return true;
});

// Resolve only public identity pages on supported providers. No signed streams,
// arbitrary proxy requests, cookies, or script execution from the response.
async function resolveVideoLink(input) {
  const value=VQ.candidate(input),season=value.kind==="bilibili-pending";if(!season&&value.kind!=="live-pending")return value;
  const failure=season?"番剧剧集解析失败，请检查网站授权和网络，或打开具体 ep 剧集页再收藏。":"直播间解析失败，请检查网站访问授权和网络，或打开房间页后收藏。";
  const response=await fetch(value.url,{credentials:"omit",redirect:"error",signal:AbortSignal.timeout(12000)}).catch(()=>{throw new Error(failure);});
  const final=new URL(response.url||value.url);
  if(!response.ok||final.protocol!=="https:"||!(season?["www.bilibili.com"]:["www.huya.com","huya.com"]).includes(final.hostname))throw new Error(failure);
  try{const parsed=VQ.parse(final.href);if(parsed.kind==="live")return parsed;}catch{}
  const reader=response.body.getReader(),decoder=new TextDecoder();let html="",size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024)throw new Error(failure);html+=decoder.decode(value,{stream:true});}}finally{await reader.cancel().catch(()=>{});}
  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    const attrs={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4];
    if(!String(attrs.rel||"").toLowerCase().split(/\s+/).includes("canonical")||!attrs.href)continue;
    const url=new URL(attrs.href.replace(/&amp;/g,"&"),final);
    if(url.origin!==final.origin)continue;
    try{const parsed=VQ.parse(url.href);if(season?parsed.kind==="bilibili"&&parsed.category==="bangumi":parsed.kind==="live")return parsed;}catch{}
  }
  throw new Error(season?failure:"未能确认直播房间号，请打开该房间后收藏当前页。");
}
