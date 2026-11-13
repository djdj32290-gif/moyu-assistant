// One canonical native library; local keys retain the last acknowledged cache.
const LIBRARY_META="point-resize:library:v1", BROWSER_INSTANCE="point-resize:browser-instance:v1";
let desktopOpening=null, desktopReady=false, librarySync=null, libraryWrites=Promise.resolve(), libraryCacheWrites=Promise.resolve(), desktopRetry=0;
const desktopPending=new Map();
async function desktopConnect() {
  if(desktopOpening) return desktopOpening;
  if(panelPort&&desktopReady){await syncDesktopLibrary();if(!videoNativePairing)await nativeLink({enabled:true,connected:true});panelPost({type:'browser-synced'});return;}
  desktopOpening=(async()=>{
    const epoch=videoNativeEpoch;
    const hello=await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:"hello"});
    if(!hello?.library||hello.desktopProtocol!==2) throw new Error("请先更新并配对新版摸鱼助手软件。");
    let instance=(await chrome.storage.local.get(BROWSER_INSTANCE))[BROWSER_INSTANCE];
    if(!instance) {instance=crypto.randomUUID().replaceAll("-","");await chrome.storage.local.set({[BROWSER_INSTANCE]:instance});}
    const port=chrome.runtime.connectNative(VIDEO_NATIVE_HOST); panelPort=port;
    const started=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("浏览器连接超时。")),15000);
      const done=error=>{clearTimeout(timer);error?reject(error):resolve();};
      port.onMessage.addListener(incoming=>{
        let message=incoming;
        if(message.type==="panel-chunk") {
          if(!Number.isInteger(message.total)||message.total<1||message.total>180||typeof message.text!=="string"||message.text.length>200000)return;
          let parts=panelChunks.get(message.id);if(!parts){if(panelChunks.size>4)panelChunks.clear();parts=[];panelChunks.set(message.id,parts);}
          if(message.index!==parts.length){panelChunks.delete(message.id);return;}parts.push(message.text);if(parts.length!==message.total)return;
          panelChunks.delete(message.id);try{message=JSON.parse(parts.join(""));}catch{return;}
        }
        if(message.type==="desktop-ready") {desktopReady=true;done();}
        else if(message.type==="desktop-result") {const pending=desktopPending.get(message.request);if(pending){clearTimeout(pending.timer);desktopPending.delete(message.request);message.error?pending.reject(new Error(message.error)):pending.resolve(message.result);}}
        else if(message.type==="panel-ready") {
          panelVisible=true;
          panelPost({type:"panel-init",extensionId:chrome.runtime.id,version:chrome.runtime.getManifest().version});
          followPanel(undefined,!!message.replay).catch(panelError);
        } else if(message.type==="panel-rpc") panelRPC(message).then(result=>panelPost({type:"panel-result",request:message.request,result}),error=>panelPost({type:"panel-result",request:message.request,error:error.message}));
        else if(message.type==="panel-pause-source"&&panelTarget)chrome.tabs.sendMessage(panelTarget.tabId,{type:"POINT_RESIZE_PANEL_PAUSE_SOURCE",item:message.item}).catch(()=>{});
        else if(message.type==="panel-browser-inactive"){if(panelTarget)chrome.tabs.sendMessage(panelTarget.tabId,{type:'POINT_RESIZE_PANEL_SUSPEND'}).catch(()=>{});panelTarget=null;panelVisible=false;++panelEpoch;}
        else if(message.type==="panel-unavailable"||message.type==="panel-closed") {if(panelTarget)chrome.tabs.sendMessage(panelTarget.tabId,{type:"POINT_RESIZE_PANEL_DETACH"}).catch(()=>{});panelVisible=false;panelTarget=null;++panelEpoch; }
        else if(message.type==="library-revision"&&!librarySync) syncDesktopLibrary().catch(error=>panelPost({type:'library-error',error:'浏览器规则缓存同步未完成：'+error.message+' 软件资料库和原缓存已保留，请处理后重连。'}));
        else if(message.type==="desktop-disconnect") nativeDisconnect().catch(()=>{});
        else if(message.type==="pairing-cancelled") nativeCancelPairing().catch(()=>{});
        else if(message.type==="library-error") panelPost({type:"library-error",error:message.error});
      });
      port.onDisconnect.addListener(()=>{
        const error=chrome.runtime.lastError?.message;
        if(panelPort!==port)return;panelPort=null;desktopReady=false;panelTarget=null;++panelEpoch;panelChunks.clear();done(new Error(error||"浏览器连接已关闭。"));
        for(const pending of desktopPending.values()){clearTimeout(pending.timer);pending.reject(new Error("浏览器连接已中断，请重试。"));}desktopPending.clear();
        nativeLink().then(link=>nativeLink({enabled:link.enabled,connected:false})).catch(()=>{});
        scheduleDesktopReconnect();
      });
    });
    port.postMessage({type:"desktop-connect",clientId:instance,extensionId:chrome.runtime.id,browser:/Edg\//.test(navigator.userAgent)?"Edge":"Chrome",connectionId:crypto.randomUUID(),syncAcknowledgement:true});
    await started;
    if(panelPort!==port||epoch!==videoNativeEpoch)throw new Error('浏览器连接已取消。');
    try{await syncDesktopLibrary();}catch(error){panelPost({type:"library-error",error:"迁移或规则同步未完成："+error.message+" 原扩展数据未清空。"});throw error;}
    if(panelPort!==port||epoch!==videoNativeEpoch)throw new Error('浏览器连接已取消。');
    if(!videoNativePairing)await nativeLink({enabled:true,connected:true});
    panelPost({type:'browser-synced'});
    await chrome.action.setPopup({popup:""});
  })().finally(()=>desktopOpening=null);
  return desktopOpening;
}
function rawLibrary(args) {
  if(!panelPort||!desktopReady)return Promise.reject(new Error("请打开或连接摸鱼助手软件。"));
  const request=crypto.randomUUID();return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{desktopPending.delete(request);reject(new Error("资料库操作超时，原数据未清空；请重试。"));},45000);
    desktopPending.set(request,{resolve,reject,timer});panelPost({type:"library",request,args});
  });
}
function cacheLibrary(result,authoritative=false) {
  const task=libraryCacheWrites.then(()=>cacheLibraryCore(result,authoritative));libraryCacheWrites=task.catch(()=>{});return task;
}
async function cacheLibraryCore(result,authoritative) {
  if(!result?.ok)throw new Error(result?.error||"资料库操作失败。");
  globalThis.PointResizeNativeCanonical=true;
  const current=(await chrome.storage.local.get(LIBRARY_META))[LIBRARY_META];
  if(current?.libraryId===result.libraryId&&current.revision>result.revision&&authoritative){
    // Confirm an intentional previous-file recovery against the current store.
    // A delayed older response must never roll back a newer committed cache.
    result=await rawLibrary({action:'read',libraryId:current.libraryId});
  }
  if(current?.libraryId===result.libraryId&&(current.revision===result.revision||!authoritative&&current.revision>result.revision))return result;
  try{await chrome.storage.local.set({...result.data,[LIBRARY_META]:{libraryId:result.libraryId,revision:result.revision,migrated:true}});}
  catch(error){throw new Error('资料已提交到软件，但浏览器缓存写入失败；网页暂用上次缓存。请腾出扩展存储空间或缩减资料后重新连接。'+error.message);}
  const stored=await chrome.storage.local.get(null),obsolete=Object.keys(stored).filter(key=>PointResizeBackup.owns(key)&&!Object.hasOwn(result.data,key));
  if(obsolete.length)await chrome.storage.local.remove(obsolete);
  await registerCachedSites();
  return result;
}
function syncDesktopLibrary() {
  if(librarySync)return librarySync;
  librarySync=(async()=>{
    const storage=await chrome.storage.local.get(null),instance=storage[BROWSER_INSTANCE];
    const source=chrome.runtime.id+":"+instance,meta=storage[LIBRARY_META];
    const current=await rawLibrary({action:"read",source,...(meta?.libraryId?{libraryId:meta.libraryId}:{})});
    if(current.migrated||meta?.migrated)return cacheLibrary(current,true);
    const data=Object.fromEntries(Object.entries(storage).filter(([key])=>PointResizeBackup.owns(key)));
    // Never use clean() here: migration must fail visibly instead of truncating.
    const validated=PointResizeBackup.validate(data);
    const result=await rawLibrary({action:"migrate",source,data:validated,raw:JSON.stringify(data)});
    return cacheLibrary(result);
  })().finally(()=>librarySync=null);return librarySync;
}
async function desktopLibrary(args) {
  await desktopConnect();
  const meta=(await chrome.storage.local.get(LIBRARY_META))[LIBRARY_META];
  return cacheLibrary(await rawLibrary({...args,libraryId:meta?.libraryId,operationId:args.operationId||crypto.randomUUID()}));
}
function serialLibrary(action) {const result=libraryWrites.then(action);libraryWrites=result.catch(()=>{});return result;}
function scheduleDesktopReconnect(delay=3000) {
  clearTimeout(desktopRetry);desktopRetry=setTimeout(async()=>{
    if(!(await nativeLink()).enabled)return;
    try{await desktopConnect();}catch{scheduleDesktopReconnect(Math.min(delay*2,60000));}
  },delay);
}
async function registerCachedSites(){
  const broad=await chrome.permissions.contains({origins:["http://*/*","https://*/*"]});
  const patterns=[];
  if(broad)patterns.push("http://*/*","https://*/*");
  else{const granted=await chrome.permissions.getAll();patterns.push(...(granted.origins||[]).filter(pattern=>/^https?:\/\//.test(pattern)));}
  const id="point-resize-cached-sites",existing=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
  if(!patterns.length){if(existing.length)await chrome.scripting.unregisterContentScripts({ids:[id]});}
  else if(existing.length)await chrome.scripting.updateContentScripts([{id,matches:patterns,js:FILES}]);
  else await chrome.scripting.registerContentScripts([{id,matches:patterns,js:FILES,runAt:"document_idle",persistAcrossSessions:true}]).catch(async error=>{if(!(await chrome.scripting.getRegisteredContentScripts({ids:[id]})).length)throw error;});
  await Promise.allSettled((await chrome.tabs.query({})).map(applyCachedTab));
}
async function applyCachedTab(tab){
  let url;try{url=new URL(tab.url);if(!/^https?:$/.test(url.protocol))return;}catch{await chrome.tabs.sendMessage(tab.id,{type:'POINT_RESIZE_PREVIEW_ACCESS',allowed:false}).catch(()=>{});return;}
  const allowed=await chrome.permissions.contains({origins:[PointResizeAccess.patternFor(url.href)]});
  if(!allowed){await chrome.tabs.sendMessage(tab.id,{type:'POINT_RESIZE_PREVIEW_ACCESS',allowed:false}).catch(()=>{});return;}
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:FILES});
  await chrome.tabs.sendMessage(tab.id,{type:'POINT_RESIZE_PREVIEW_ACCESS',allowed:true}).catch(()=>{});
}
chrome.tabs.onUpdated.addListener((id,info,tab)=>{if(info.status==='complete')applyCachedTab(tab).catch(()=>{});});
chrome.permissions.onAdded.addListener(()=>registerCachedSites().catch(()=>{}));
function autoDesktop(){registerCachedSites().catch(()=>{});nativeLink().then(link=>{if(link.enabled)desktopConnect().catch(()=>scheduleDesktopReconnect());});}
chrome.runtime.onStartup.addListener(autoDesktop);
chrome.runtime.onInstalled.addListener(details=>{
  autoDesktop();
  // A first-install preparation page, never a daily management/player tab.
  if(details.reason==='install'){
    const key='point-resize:preparation-shown:v1';
    chrome.storage.local.get(key).then(async data=>{
      if(data[key])return;
      await chrome.storage.local.set({[key]:true});
      await openPreparation();
    }).catch(()=>{});
  }
});
async function profileRequest(m){
  try{return await desktopLibrary({action:"profile",key:m.key,command:m.command,id:m.id,rule:m.rule,updates:m.updates,enabled:m.enabled,...(m.baseRule!==undefined?{baseRule:m.baseRule}:{})});}
  catch(error){
    const meta=(await chrome.storage.local.get(LIBRARY_META))[LIBRARY_META];if(meta?.migrated||desktopReady)throw error;
    const data=await chrome.storage.local.get(m.key),profile=data[m.key]||{enabled:true,rules:[]};
    if(m.command==="upsert"){profile.rules=profile.rules.filter(rule=>rule.id!==m.id);profile.rules.push(m.rule);}
    else if(m.command==="remove")profile.rules=profile.rules.filter(rule=>rule.id!==m.id);
    else if(m.command==="toggle-all"){profile.enabled=true;profile.rules.forEach(rule=>rule.enabled=m.enabled);}
    else if(m.command==="update"){const rule=profile.rules.find(rule=>rule.id===m.id);if(rule)Object.assign(rule,m.updates);}
    else throw error;
    PointResizeBackup.validate({[m.key]:profile});await chrome.storage.local.set({[m.key]:profile});return {ok:true};
  }
}
chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  if(sender.id!==chrome.runtime.id)return;
  let operation;
  if(m.type==="POINT_RESIZE_DATA_PROFILE") operation=serialLibrary(()=>profileRequest(m));
  else if(m.type==="POINT_RESIZE_DESKTOP_OPEN" && sender.url===chrome.runtime.getURL("setup.html")) operation=(async()=>{await openDesktopPanel(m.tabId!=null?await chrome.tabs.get(m.tabId):{});return {ok:true};})();
  else return;
  operation.then(()=>respond({ok:true}),error=>respond({ok:false,error:error.message}));return true;
});
// Worker recovery also reconnects after extension reload; never opens the UI.
chrome.action.setPopup({popup:''}).catch(()=>{});
autoDesktop();
