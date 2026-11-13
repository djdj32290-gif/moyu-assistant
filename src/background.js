importScripts("site-access.js");
importScripts("video-common.js", "backup.js", "video-background.js");
importScripts("video-native.js");
importScripts("connection-icon.js");
const FILES = ["picker.js", "data-client.js", "video-common.js", "backup.js", "video-page.js", "video-player.js", "panel.js", "native-settings.js", "content.js", "panel-bridge.js"];
const contentRegistrations = new Map();
function ensureContentScript(pattern) {
  const id = scriptId(pattern);
  if (contentRegistrations.has(id)) return contentRegistrations.get(id);
  // Navigation, window focus and explicit open can request the same ID together.
  const task = (async () => {
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (registered.length) await chrome.scripting.updateContentScripts([{ id, js: FILES }]);
    else await chrome.scripting.registerContentScripts([{ id, matches: [pattern], js: FILES, runAt: "document_idle", persistAcrossSessions: true }]);
  })().finally(() => { if (contentRegistrations.get(id) === task) contentRegistrations.delete(id); });
  contentRegistrations.set(id, task);
  return task;
}
const snapshots = new Map();
function clearSnapshot(tabId) { snapshots.get(tabId)?.bitmap.close(); snapshots.delete(tabId); }
chrome.tabs.onRemoved.addListener(clearSnapshot);
chrome.tabs.onUpdated.addListener((tabId, info) => { if (info.status === "loading") clearSnapshot(tabId); });

async function openForTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const pattern = PointResizeAccess.patternFor(tab.url);
  const permitted = await chrome.permissions.contains({ origins: [pattern] });
  if (permitted) await ensureContentScript(pattern);
  // Toolbar clicks grant activeTab even if permanent site access was declined.
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
  const result = await chrome.tabs.sendMessage(tab.id, { type: "POINT_RESIZE_SHOW", autoEnabled: permitted, zoomFactor: await chrome.tabs.getZoom(tab.id) });
  if (!result?.ok) throw new Error("页面尚未准备好，请稍后重试。");
  await chrome.action.setBadgeText({ tabId, text: "" });
  await chrome.action.setTitle({ tabId, title: "点选缩放 · 点击打开调整面板" });
  return { ok: true };
}

chrome.action.onClicked.addListener(tab => {
  toolbarClick(tab).catch(error => showError(tab.id, error));
});

async function showError(tabId, error) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b42318" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({ tabId, title: error.message });
  } catch { /* The tab may already have been closed. */ }
}

async function captureRegion(message, sender) {
  if (!sender.tab || sender.frameId !== 0) throw new Error("只能截取当前网页。");
  const tab = await chrome.tabs.get(sender.tab.id);
  const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
  if (active?.id !== tab.id || tab.url !== sender.tab.url) throw new Error("请回到刚才选择的网页再截图。");
  PointResizeAccess.patternFor(tab.url);
  const { rect, viewport } = message;
  if (!rect || !viewport || ![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height].every(Number.isFinite)
    || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1 || viewport.width < 1 || viewport.height < 1
    || rect.x + rect.width > viewport.width + 1 || rect.y + rect.height > viewport.height + 1) throw new Error("截图区域无效，请重新选择。");
  let snapshot = snapshots.get(tab.id);
  if (message.snapshotId) {
    if (!snapshot || snapshot.id !== message.snapshotId || snapshot.url !== tab.url || snapshot.width !== viewport.width || snapshot.height !== viewport.height) throw new Error("原始截图已过期，重新选择后可更新预览。");
  } else {
    let imageURL;
    try { imageURL = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }); }
    catch { throw new Error("请先点击一次工具栏的点选缩放图标，再重试截图。"); }
    const bitmap = await createImageBitmap(await (await fetch(imageURL)).blob());
    clearSnapshot(tab.id);
    snapshot = { bitmap, id: crypto.randomUUID(), url: tab.url, width: viewport.width, height: viewport.height };
    snapshots.set(tab.id, snapshot);
    if (snapshots.size > 8) clearSnapshot(snapshots.keys().next().value);
  }
  const bitmap = snapshot.bitmap;
    const sx = bitmap.width / viewport.width, sy = bitmap.height / viewport.height;
    const x = Math.max(0, Math.round(rect.x * sx)), y = Math.max(0, Math.round(rect.y * sy));
    const width = Math.min(bitmap.width - x, Math.max(1, Math.round(rect.width * sx)));
    const height = Math.min(bitmap.height - y, Math.max(1, Math.round(rect.height * sy)));
    const ratio = message.thumbnail ? Math.min(1, 960 / width, 640 / height) : 1;
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
    canvas.getContext("2d").drawImage(bitmap, x, y, width, height, 0, 0, canvas.width, canvas.height);
    const target = message.target;
    if (target && [target.x, target.y, target.width, target.height].every(Number.isFinite) && target.width > 0 && target.height > 0) {
      const ctx = canvas.getContext("2d"), line = Math.max(2, 3 * ratio);
      const left = Math.max(line / 2, (target.x * sx - x) * ratio), top = Math.max(line / 2, (target.y * sy - y) * ratio);
      const right = Math.min(canvas.width - line / 2, ((target.x + target.width) * sx - x) * ratio), bottom = Math.min(canvas.height - line / 2, ((target.y + target.height) * sy - y) * ratio);
      ctx.strokeStyle = "#ef3340"; ctx.lineWidth = line; ctx.strokeRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
    }
    const type = message.thumbnail ? "image/jpeg" : "image/png";
    let blob = await canvas.convertToBlob({ type, quality: .78 });
    // Keep one larger preview per item, bounded for chrome.storage.local.
    while (message.thumbnail && blob.size > 170000 && canvas.width > 180) {
      const smaller = new OffscreenCanvas(Math.max(1, Math.round(canvas.width * .75)), Math.max(1, Math.round(canvas.height * .75)));
      smaller.getContext("2d").drawImage(canvas, 0, 0, smaller.width, smaller.height);
      canvas.width = smaller.width; canvas.height = smaller.height;
      canvas.getContext("2d").drawImage(smaller, 0, 0); blob = await canvas.convertToBlob({ type, quality: .72 });
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { ok: true, snapshotId: snapshot.id, dataURL: "data:" + type + ";base64," + btoa(binary) };
}

async function editSavedOnPage(message) {
  const key = "point-resize:v1:" + message.site, profile = (await chrome.storage.local.get(key))[key];
  const item = profile?.rules?.find(rule => rule.id === message.id);
  if (!item) throw new Error("这条保存项已被删除。");
  const matches = (await chrome.tabs.query({})).filter(tab => { try { const u = new URL(tab.url); return /^https?:$/.test(u.protocol) && u.hostname === message.site; } catch { return false; } });
  let pageURL;
  try { const u = new URL(item.pageURL); if (/^https?:$/.test(u.protocol) && u.hostname === message.site) pageURL = u.href; } catch { /* Old saved items may lack their page URL. */ }
  let tab = matches.find(tab => tab.url === pageURL) || (!pageURL ? matches.find(tab => tab.active) || matches[0] : null);
  if (!tab) {
    tab = await chrome.tabs.create({ url: pageURL || "https://" + message.site });
    await new Promise((resolve, reject) => {
      const done = () => { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(listener); };
      const listener = (id, info) => { if (id === tab.id && info.status === "complete") { done(); resolve(); } };
      const timer = setTimeout(() => { done(); reject(new Error("页面还没加载好，请回到网页点击扩展图标后再调整。")); }, 20000);
      chrome.tabs.onUpdated.addListener(listener);
      chrome.tabs.get(tab.id).then(t => { if (t.status === "complete") { done(); resolve(); } });
    });
  }
  await chrome.tabs.update(tab.id, { active: true }); await chrome.windows.update(tab.windowId, { focused: true });
  if(typeof desktopReady!=="undefined" && desktopReady && panelVisible) await followPanel(tab,true);
  else await openForTab(tab.id);
  return chrome.tabs.sendMessage(tab.id, { type: "POINT_RESIZE_EDIT_SAVED", id: item.id, zoomFactor: await chrome.tabs.getZoom(tab.id) });
}

function scriptId(pattern) {
  return "point-resize-" + Array.from(new TextEncoder().encode(pattern), b => b.toString(16).padStart(2, "0")).join("");
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  let operation;
  if (message.type === "POINT_RESIZE_CAPTURE" && sender.tab) operation = captureRegion(message, sender);
  else if (message.type === "POINT_RESIZE_RELEASE_SNAPSHOT" && sender.tab) { if (snapshots.get(sender.tab.id)?.id === message.snapshotId) clearSnapshot(sender.tab.id); operation = Promise.resolve({ ok: true }); }
  else if (message.type === "POINT_RESIZE_GET_ZOOM" && sender.tab) operation = chrome.tabs.getZoom(sender.tab.id).then(zoomFactor => ({ ok: true, zoomFactor }));
  else if (message.type === "POINT_RESIZE_EDIT_ON_PAGE" && sender.tab) operation = editSavedOnPage(message);
  // Retain compatibility for an already-open legacy extension page.
  else if (message.type === "POINT_RESIZE_OPEN" && sender.url === chrome.runtime.getURL("popup.html")) operation = chrome.tabs.get(message.tabId).then(openDesktopPanel).then(()=>({ok:true}));
  else return;
  operation.then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});

// Browser zoom still changes the page. Only our controls compensate for it.
chrome.tabs.onZoomChange.addListener(info => {
  chrome.tabs.sendMessage(info.tabId, { type: "POINT_RESIZE_ZOOM", zoomFactor: info.newZoomFactor }).catch(() => {});
});

// Host permissions can be revoked in the browser settings. Remove obsolete registrations.
chrome.permissions.onRemoved.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  for (const script of scripts.filter(s => s.id.startsWith("point-resize-"))) {
    if (!(await chrome.permissions.contains({ origins: script.matches }))) {
      await chrome.scripting.unregisterContentScripts({ ids: [script.id] });
    }
  }
  await registerCachedSites().catch(()=>{});
});

// Keep persistent registrations current when upgrading from a previous version.
chrome.runtime.onInstalled.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  for (const script of scripts.filter(item => item.id.startsWith("point-resize-"))) {
    await chrome.scripting.updateContentScripts([{ id: script.id, js: FILES }]);
  }
});

importScripts("library-api.js", "panel-background.js", "library-background.js");
