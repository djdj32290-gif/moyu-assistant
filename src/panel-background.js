// The browser relay remains connected independently of the native UI.
let panelPort=null,panelTarget=null,panelEpoch=0,panelWindowId=null,panelVisible=false;
let panelOpening=null;
const panelChunks=new Map();
function panelPost(message) {if(panelPort)try{panelPort.postMessage(message);}catch{}}
let preparationOpening=null;
function openPreparation() {
  if(preparationOpening)return preparationOpening;
  preparationOpening=(async()=>{
    await chrome.action.setPopup({popup:''});
    const url=chrome.runtime.getURL('setup.html'),tabs=await chrome.tabs.query({});
    const existing=tabs.find(tab=>tab.url===url);
    if(existing){await chrome.tabs.update(existing.id,{active:true});await chrome.windows.update(existing.windowId,{focused:true});}
    else await chrome.tabs.create({url});
  })().finally(()=>preparationOpening=null);return preparationOpening;
}
async function toolbarClick(tab={}) {
  const link=await nativeLink();
  if(!link.connected||!desktopReady||!panelPort)return openPreparation();
  return openDesktopPanel(tab);
}
function requestPanelOpen(type='panel-open',fields={}) {
  const request=crypto.randomUUID();return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{desktopPending.delete(request);reject(new Error(type==='pairing-check'?'EXE 主面板未确认配对。请关闭旧版本窗口，再从与插件相同的软件目录打开新版。':'唤出软件超时；连接未主动断开，请从软件目录打开 EXE。'));},10000);
    desktopPending.set(request,{resolve,reject,timer});panelPost({type,request,...fields});
  });
}
function openDesktopPanel(tab={}) {
  if(panelOpening)return panelOpening;
  panelOpening=(async()=>{
    if(tab.windowId!=null)panelWindowId=tab.windowId;
    try {
      await desktopConnect();
      await requestPanelOpen();
      await chrome.action.setPopup({popup:''});
      if(tab.id!=null){await chrome.action.setBadgeText({tabId:tab.id,text:''});}
    } catch(error) {
      if(!desktopReady)await openPreparation();
      throw error;
    }
  })().finally(()=>panelOpening=null);return panelOpening;
}
function panelError(error) { panelPost({ type: "panel-target", available: false, reason: error.message }); }
async function followPanel(explicit, force = false) {
  if (!panelPort || !panelVisible) return;
  const tab = explicit || (await chrome.tabs.query({ active: true, ...(panelWindowId != null ? { windowId: panelWindowId } : { lastFocusedWindow: true }) }))[0];
  if(tab?.windowId!=null)panelWindowId=tab.windowId;
  // Returning focus from our desktop window must not cancel page picking or a draft.
  if (!force && tab && panelTarget?.documentId && panelTarget.tabId === tab.id && panelTarget.url === tab.url) return;
  const epoch = ++panelEpoch, old = panelTarget; panelTarget = null;
  try {
  panelPost({ type: "panel-target", available: false, reason: "正在连接当前网页…" });
  if (old && (old.tabId!==tab?.id || old.url!==tab?.url)) await chrome.tabs.sendMessage(old.tabId, { type: "POINT_RESIZE_PANEL_SUSPEND" }).catch(() => {});
  if (epoch !== panelEpoch || !panelPort) return;
  if (!tab) throw new Error("当前没有可调整的网页。视频待看和设置仍可使用。");
  try { PointResizeAccess.patternFor(tab.url); }
  catch { throw new Error("这个浏览器页面不能选取内容。请切换到普通网页。"); }
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES }); }
  catch { throw new Error("尚未获得这个网站的访问权限。请在该网页点击一次扩展图标授权。"); }
  if (epoch !== panelEpoch || !panelPort) return;
  const pattern = PointResizeAccess.patternFor(tab.url);
  const permitted = await chrome.permissions.contains({ origins: [pattern] });
  if (permitted) await ensureContentScript(pattern);
  if (epoch !== panelEpoch || !panelPort) return;
  panelTarget = { tabId: tab.id, url: tab.url, documentId: "" };
  const result = await chrome.tabs.sendMessage(tab.id, { type: "POINT_RESIZE_PANEL_ATTACH", autoEnabled: permitted, zoomFactor: await chrome.tabs.getZoom(tab.id) });
  if (!result?.ok) throw new Error(result?.error || "网页连接失败，请刷新网页。");
  if (epoch !== panelEpoch) return;
  panelTarget.documentId = result.documentId;
  } catch (error) { if (epoch === panelEpoch) throw error; }
}
async function panelRPC(message) {
  const sender = { id: chrome.runtime.id };
  if (message.method === "storage-get") return chrome.storage.local.get(message.args);
  if (message.method === "edit-saved") return editSavedOnPage(message.args);
  if (message.method === "runtime") {
    const m = message.args;
    if(m.type==='VIDEO_RESOLVE')return {ok:true,item:await resolveVideoLink(m.url)};
    const operation = queueRequest(m, sender) || nativeRequest(m, sender);
    if (!operation) throw new Error("不支持的面板操作。");
    const result = await operation;
    if (m.type === "VIDEO_NATIVE_PLAY" && panelTarget) {
      chrome.tabs.sendMessage(panelTarget.tabId, { type: "POINT_RESIZE_PANEL_PAUSE_SOURCE", item: m.item }).catch(() => {});
    }
    return result;
  }
  if (message.method === "page-event") {
    const m = message.args, target = panelTarget;
    if (!target || m.documentId !== target.documentId || m.url !== target.url) throw new Error("网页已切换，请在当前页面重新操作。");
    const tab = await chrome.tabs.get(target.tabId);
    if (!tab.active || tab.url !== target.url) throw new Error("网页已切换，请重新操作。");
    return chrome.tabs.sendMessage(target.tabId, { type: "POINT_RESIZE_PANEL_EVENT", ...m });
  }
  if (message.method === "open-url") {
    const url = new URL(message.args); if (!/^https?:$/.test(url.protocol)) throw new Error("链接无效。");
    await chrome.tabs.create({ url: url.href }); return { ok: true };
  }
  throw new Error("不支持的面板请求。");
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0) return;
  if (message.type === "POINT_RESIZE_PANEL_CLOSE" && sender.tab?.id === panelTarget?.tabId && message.documentId === panelTarget?.documentId) {
    panelPost({ type: "panel-close" }); respond({ ok: true }); return;
  }
  if (message.type !== "POINT_RESIZE_PANEL_SNAPSHOT" || !panelPort || sender.tab?.id !== panelTarget?.tabId) return;
  if (message.snapshot.url !== sender.url) return;
  panelTarget.documentId = message.snapshot.documentId; panelTarget.url = sender.url;
  panelPost({ type: "panel-snapshot", snapshot: message.snapshot }); respond({ ok: true });
});
chrome.tabs.onActivated.addListener(info => { if (panelPort) { panelWindowId = info.windowId; followPanel().catch(panelError); } });
chrome.windows.onFocusChanged.addListener(id => {
  if (!panelPort || id === chrome.windows.WINDOW_ID_NONE) return;
  chrome.windows.get(id).then(win => { if (win.type === "normal") { panelWindowId = id; panelPost({type:"browser-active",browser:/Edg\//.test(navigator.userAgent)?"Edge":"Chrome"});followPanel().catch(panelError); } }).catch(() => {});
});
chrome.tabs.onUpdated.addListener((id, info, tab) => {
  if (panelPort && tab.active && tab.windowId === panelWindowId && (info.status === "loading" || info.status === "complete" || info.url)) followPanel(tab, true).catch(panelError);
});
chrome.tabs.onRemoved.addListener(id => { if (panelPort && id === panelTarget?.tabId) followPanel().catch(panelError); });
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local") panelPost({ type: "storage-changed", changes }); });
