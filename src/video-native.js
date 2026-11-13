// Imported by the worker. The video player starts only on Play; the desktop panel has its own connection.
const VIDEO_NATIVE_HOST = "com.pointresize.video";
const VIDEO_NATIVE_PROTOCOL = "pointresize-video";
const VIDEO_NATIVE_LINK_KEY = "point-resize:desktop-link:v1";
const VIDEO_NATIVE_INSTALL_KEY = "point-resize:desktop-install:v1";
let videoNativePort = null;
let videoNativeSuspended = false, videoNativeEpoch = 0;
let videoNativePairing=false;
let videoNativeControls = Promise.resolve();
const videoNativePending = new Map();
async function nativeLink(value) {
  if (value) { globalThis.PointResizeConnectionIcon?.update(value.enabled && value.connected); if(!value.connected&&typeof panelPost==='function')panelPost({type:'browser-unsynced'}); await chrome.storage.local.set({ [VIDEO_NATIVE_LINK_KEY]: value }); }
  const data = await chrome.storage.local.get(VIDEO_NATIVE_LINK_KEY);
  return data[VIDEO_NATIVE_LINK_KEY] || { enabled: true, connected: false };
}
function nativeSetupURL() {
  return VIDEO_NATIVE_PROTOCOL + "://connect?extension=" + chrome.runtime.id;
}
async function nativePair(epoch=videoNativeEpoch) {
  if(epoch!==videoNativeEpoch)throw new Error('配对已取消，请重新操作。');
  const hello=await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'hello'}).catch(()=>null);
  if(desktopReady&&(await nativeLink()).connected){if(hello?.pairingAttemptId)await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'pair-complete',attemptId:hello.pairingAttemptId});return {ok:true,connected:true};}
  if(hello&&hello.version!==chrome.runtime.getManifest().version){videoNativeSuspended=true;await nativeLink({enabled:false,connected:false});return {ok:true,connected:false,connectUrl:nativeSetupURL()};}
  if(hello&&!hello.pairingWaiting)throw new Error('请先打开 EXE，点击“配对浏览器插件”，进入配对状态后再点这里。');
  videoNativePairing=true;
  try{const result=await nativeConnect(epoch,true);
    if(result.connected){await requestPanelOpen('pairing-check',{attemptId:hello?.pairingAttemptId||''});if(epoch!==videoNativeEpoch||videoNativeSuspended)throw new Error('配对已取消，请重新操作。');await nativeLink({enabled:true,connected:true});await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'pair-complete',attemptId:hello?.pairingAttemptId||''});}
    return result;
  }catch(error){if(epoch===videoNativeEpoch){await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'pair-failed',attemptId:hello?.pairingAttemptId||'',error:error.message}).catch(()=>{});videoNativeSuspended=true;await nativeLink({enabled:false,connected:false});}throw error;}
  finally{videoNativePairing=false;}
}
async function nativeCancelPairing(){if(videoNativePairing){++videoNativeEpoch;videoNativeSuspended=true;await nativeLink({enabled:false,connected:false});}chrome.runtime.sendMessage({type:'VIDEO_NATIVE_PAIR_CANCELLED'}).catch(()=>{});}
async function nativeConnect(epoch = videoNativeEpoch, allowSetup = true, requiredVersion = "") {
  let available=false;
  try {
    const reply = await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST, { type: "hello" });
    if (!reply?.ok || reply.protocol !== 1) throw new Error("请使用新版桌面助手。");
    if (requiredVersion && reply.version !== requiredVersion) throw new Error("正在等待本次安装的新版桌面助手。");
    if (epoch !== videoNativeEpoch) return { ok: true, connected: false };
    available=true;
    videoNativeSuspended = false;
    await nativeLink({ enabled: true, connected: false });
    if(typeof desktopConnect === "function") await desktopConnect();
    await chrome.storage.local.remove(VIDEO_NATIVE_INSTALL_KEY);
    return { ok: true, connected: true };
  } catch(error) {
    if(available){await nativeLink({enabled:epoch===videoNativeEpoch,connected:false});throw error;}
    if (!allowSetup) return { ok: true, connected: false };
    await nativeLink({ enabled: false, connected: false });
    return { ok: true, connected: false, connectUrl: nativeSetupURL() };
  }
}
async function nativeInstaller() {
  const response = await fetch(chrome.runtime.getURL("installer/PointResizeVideo.msi"));
  if (!response.ok) throw new Error("安装包缺失，请使用完整的一体包更新扩展。");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (bytes.length > 8 * 1024 * 1024 || signature.some((value, index) => bytes[index] !== value)) throw new Error("安装包无效，请重新解压完整的一体包。");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  const pendingUntil = Date.now() + 15 * 60 * 1000;
  await chrome.storage.local.set({ [VIDEO_NATIVE_INSTALL_KEY]: pendingUntil });
  return { ok: true, filename: "PointResizeVideo-" + chrome.runtime.id + ".msi", base64: btoa(binary), pendingUntil };
}
async function nativeUninstall() {
  const hello = await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST, { type: "hello" }).catch(() => null);
  if (!hello?.canUninstall) {
    videoNativeSuspended = !(await nativeLink()).enabled;
    throw new Error("未找到可从扩展卸载的新版安装助手。可先更新助手，或从 Windows“设置 → 应用”卸载。");
  }
  await nativeDisconnect();
  const result = await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST, { type: "uninstall" });
  if (!result?.ok || !result.uninstallStarted) throw new Error(result?.error || "无法打开卸载窗口，请从 Windows“设置 → 应用”卸载助手。");
  return { ok: true, connected: false, uninstallStarted: true };
}
async function nativeRelease() {
  try{const result=await chrome.runtime.sendNativeMessage(VIDEO_NATIVE_HOST,{type:'release'});
    if(!result?.ok)throw new Error(result?.error||'未能解除本目录登记。');
    await nativeDisconnect();return result;
  }catch(error){videoNativeSuspended=!(await nativeLink()).enabled;throw error;}
}
async function nativeDisconnect() {
  videoNativeSuspended=true;
  await nativeLink({enabled:false,connected:false});
  await chrome.storage.local.remove(VIDEO_NATIVE_INSTALL_KEY);
  clearTimeout(desktopRetry);
  const old=panelTarget;panelTarget=null;panelVisible=false;++panelEpoch;
  if(old) await chrome.tabs.sendMessage(old.tabId,{type:'POINT_RESIZE_PANEL_SUSPEND'}).catch(()=>{});
  const port=panelPort;panelPort=null;desktopReady=false;
  for(const pending of desktopPending.values()){clearTimeout(pending.timer);pending.reject(new Error('浏览器连接已断开。'));}desktopPending.clear();panelChunks.clear();
  if(port)port.disconnect();
  return {ok:true,connected:false};
}

function nativeState(id) {
  if (typeof panelPost === "function") panelPost({ type: "runtime-message", message: { type: "VIDEO_NATIVE_STATE", id } });
  chrome.tabs.query({}).then(tabs => {
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: "VIDEO_NATIVE_STATE", id }).catch(() => {});
  }).catch(() => {});
}
function nativeFailure() {
  return new Error("请在扩展左侧“设置”点击“连接桌面助手”。首次请先安装桌面助手，无须输入 ID；更换安装目录后请重新连接。");
}
function nativeConnection() {
  if (videoNativePort) return videoNativePort;
  const port = chrome.runtime.connectNative(VIDEO_NATIVE_HOST);
  videoNativePort = port;
  port.onMessage.addListener(message => {
    if (message.type === "watched" && !globalThis.PointResizeNativeCanonical) videoMutate(items => VQ.watch(items, message.id, message.watched)).catch(error => {
      try { port.postMessage({ type: "hint", text: "已看状态保存失败：" + error.message }); } catch {}
    });
    if (message.type === "clear-watched" && !globalThis.PointResizeNativeCanonical) videoMutate(VQ.clearWatched).catch(error => {
      try { port.postMessage({ type: "hint", text: "清除已看视频失败：" + error.message }); } catch {}
    });
    if (message.type === "opened") {
      nativeState(message.id);
      if (!videoNativeSuspended) nativeLink({ enabled: true, connected: true }).catch(() => {});
    }
    if (message.type === "closed") nativeState("");
    const pending = videoNativePending.get(message.request);
    if (pending && ["opened", "error"].includes(message.type)) {
      clearTimeout(pending.timer); videoNativePending.delete(message.request);
      if (message.type === "opened") pending.resolve({ ok: true, id: message.id });
      else pending.reject(new Error(message.error || "桌面播放器无法启动。"));
    }
  });
  port.onDisconnect.addListener(() => {
    // Read lastError to acknowledge browser-provided disconnect failures.
    const reason = chrome.runtime.lastError?.message;
    if (videoNativePort === port) videoNativePort = null;
    nativeState("");
    for (const [id, pending] of videoNativePending) {
      clearTimeout(pending.timer); pending.reject(reason ? nativeFailure() : new Error("视频小窗已关闭，请重新点击播放。")); videoNativePending.delete(id);
    }
  });
  return port;
}
async function nativePlay(input) {
  const epoch = videoNativeEpoch;
  const item = PointResizeVideoData.queueItem(input);
  let link = await nativeLink();
  const pending = (await chrome.storage.local.get(VIDEO_NATIVE_INSTALL_KEY))[VIDEO_NATIVE_INSTALL_KEY];
  if (!link.enabled && pending > Date.now() && epoch === videoNativeEpoch) {
    await nativeConnect(epoch, false, chrome.runtime.getManifest().version);
    link = await nativeLink();
  }
  if (!link.enabled || videoNativeSuspended || epoch !== videoNativeEpoch) throw new Error("桌面助手已断开，请在扩展“设置”点击“连接桌面助手”。");
  await desktopConnect();
  if(epoch!==videoNativeEpoch||videoNativeSuspended)throw new Error("浏览器连接已断开，请重新连接。");
  const data = await chrome.storage.local.get(PointResizeVideoData.key);
  const items = PointResizeVideoData.clean(data[PointResizeVideoData.key]).filter(entry => !entry.dependent);
  const request = crypto.randomUUID(), payload = { type: "play", request, item, items, canonical:globalThis.PointResizeNativeCanonical===true };
  if (videoNativeSuspended || epoch !== videoNativeEpoch) throw new Error("桌面助手已断开，请在扩展“设置”重新连接。");
  if (new TextEncoder().encode(JSON.stringify(payload)).length > 1000000) throw new Error("视频列表过大，请减少超长视频地址后重试。");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { videoNativePending.delete(request); reject(new Error("桌面播放器启动超时，请检查助手目录中的 data/last-error.txt 后重试。")); }, 20000);
    videoNativePending.set(request, { resolve, reject, timer });
    try { nativeConnection().postMessage(payload); }
    catch { clearTimeout(timer); videoNativePending.delete(request); reject(nativeFailure()); }
  });
}
function nativeRequest(message, sender) {
  if (sender.id !== chrome.runtime.id) return;
  let operation;
  if(message?.type==='VIDEO_NATIVE_PAIR'){const epoch=videoNativeEpoch;operation=videoNativeControls.then(()=>nativePair(epoch));videoNativeControls=operation.catch(()=>{});}
  else if (message?.type === "VIDEO_NATIVE_PLAY") operation = nativePlay(message.item);
  else if (message?.type === "VIDEO_NATIVE_LINK_STATUS") operation = Promise.all([nativeLink(), chrome.storage.local.get(VIDEO_NATIVE_INSTALL_KEY)])
    .then(([link, data]) => ({ ok: true, connected: link.enabled && link.connected && desktopReady, pendingUntil: data[VIDEO_NATIVE_INSTALL_KEY] || 0 }));
  else if (message?.type === "VIDEO_NATIVE_INSTALLER") operation = nativeInstaller();
  else if (message?.type === "VIDEO_NATIVE_CANCEL_INSTALL") operation = chrome.storage.local.remove(VIDEO_NATIVE_INSTALL_KEY).then(() => ({ ok: true }));
  else if(message?.type==='VIDEO_NATIVE_RELEASE'){++videoNativeEpoch;videoNativeSuspended=true;operation=videoNativeControls.then(()=>nativeRelease());videoNativeControls=operation.catch(()=>{});}
  else if (["VIDEO_NATIVE_CONNECT", "VIDEO_NATIVE_DISCONNECT", "VIDEO_NATIVE_PROBE", "VIDEO_NATIVE_UNINSTALL"].includes(message?.type)) {
    if (["VIDEO_NATIVE_DISCONNECT", "VIDEO_NATIVE_UNINSTALL"].includes(message.type)) { ++videoNativeEpoch; videoNativeSuspended = true; }
    const epoch = videoNativeEpoch;
    operation = videoNativeControls.then(() => {
      if (message.type === "VIDEO_NATIVE_CONNECT") return nativeConnect(epoch);
      if (message.type === "VIDEO_NATIVE_PROBE") return nativeConnect(epoch, false, chrome.runtime.getManifest().version);
      if (message.type === "VIDEO_NATIVE_UNINSTALL") return nativeUninstall();
      return nativeDisconnect();
    });
    videoNativeControls = operation.catch(() => {});
  } else return;
  return operation;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const operation = nativeRequest(message, sender); if (!operation) return;
  operation.then(respond, error => respond({ ok: false, error: error.message })); return true;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !videoNativePort || !changes[PointResizeVideoData.key]) return;
  const items = PointResizeVideoData.clean(changes[PointResizeVideoData.key].newValue).filter(item => !item.dependent);
  try { videoNativePort.postMessage({ type: "queue", items }); } catch { /* The next Play reconnects. */ }
});
