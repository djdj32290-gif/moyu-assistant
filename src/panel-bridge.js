(() => {
  if (globalThis.PointResizePanelBridge || !chrome.runtime.id) return;
  const app = PointResizeApp, ui = app.ui;
  const documentId = crypto.randomUUID(), nodes = new Map(), ids = new WeakMap();
  let serial = 0, enabled = false, last = "", lastURL = "", timer;
  const conceal = document.createElement("style");
  conceal.textContent = '#panel,#panel-tabs,#level-rail,#image-viewer{visibility:hidden!important;pointer-events:none!important}';
  function copy(id) {
    const source = ui.$(id), clone = source.cloneNode(true), originals = [source, ...source.querySelectorAll("*")], copies = [clone, ...clone.querySelectorAll("*")];
    originals.forEach((node, index) => {
      if (!ids.has(node)) ids.set(node, String(++serial));
      const key = ids.get(node); nodes.set(key, node); copies[index].setAttribute("data-pr-node", key);
      if (node instanceof HTMLInputElement) {
        copies[index].setAttribute("value", node.value);
        copies[index].toggleAttribute("checked", node.checked);
        copies[index].setAttribute("data-pr-indeterminate", String(node.indeterminate));
      }
      for (const attr of [...copies[index].attributes]) if (/^on/i.test(attr.name)) copies[index].removeAttribute(attr.name);
    });
    clone.querySelectorAll("script,iframe,object,embed").forEach(node => node.remove());
    return clone.outerHTML;
  }
  function publish() {
    timer = null; if (!enabled) return;
    nodes.clear();
    const snapshot = { documentId, url: location.href, site: location.hostname, resize: copy("resize-page"), rail: copy("level-rail"), preview: copy("image-viewer"),
      videoStatus: { picking: ui.$("vq-pick").getAttribute("aria-pressed") === "true", text: ui.$("vq-status").textContent, error: ui.$("vq-status").classList.contains("error") } };
    const json = JSON.stringify(snapshot); lastURL = location.href; if (json === last) return; last = json;
    chrome.runtime.sendMessage({ type: "POINT_RESIZE_PANEL_SNAPSHOT", snapshot }).catch(() => {});
  }
  const schedule = () => { if (enabled && !timer) timer = setTimeout(publish, 45); };
  const observer = new MutationObserver(schedule);
  for (const id of ["resize-page", "level-rail", "image-viewer", "videos-page"]) observer.observe(ui.$(id), {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["hidden", "class", "disabled", "checked", "aria-pressed", "aria-selected", "inert", "src", "open", "value", "data-value"]
  });
  ui.root.addEventListener("input", schedule); ui.root.addEventListener("change", schedule);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === "POINT_RESIZE_PANEL_UPGRADE") {
      app.selectTab("settings"); ui.$("native-status").textContent = "独立悬浮面板需要新版桌面助手。请先断开连接，再点安装助手更新；更新后再次点击扩展图标。";
      respond({ ok: true }); return;
    }
    if (message.type === "POINT_RESIZE_PANEL_PAUSE_SOURCE") {
      try {
        const item = message.item;
        PointResizeVideos.pauseSource(item);
        if (item?.locator && new URL(item.sourceUrl).href === location.href) PointResizePicker.queryRule(item.locator).filter(node => node.matches("video")).forEach(node => node.pause());
      } catch { /* The source may have been removed or navigated away. */ }
      respond({ ok: true }); return;
    }
    if (message.type === "POINT_RESIZE_PANEL_ATTACH") {
      enabled = true; app.state.desktopPanel = true; app.state.autoEnabled = message.autoEnabled !== false; last = ""; if (!conceal.isConnected) ui.root.append(conceal);
      (async () => { await app.ready; if (!app.state.visible) {
        if (app.state.session) app.resume(); else await app.open(message);
      } app.selectTab("resize"); publish(); return { ok: true, documentId }; })().then(respond, error => respond({ ok: false, error: error.message })); return true;
    }
    if (message.type === "POINT_RESIZE_PANEL_SUSPEND") {
      enabled = false; app.suspend(); respond({ ok: true }); return;
    }
    if (message.type === "POINT_RESIZE_PANEL_DETACH") {
      enabled = false; app.state.desktopPanel = false; conceal.remove(); app.close(); respond({ ok: true }); return;
    }
    if (message.type !== "POINT_RESIZE_PANEL_EVENT" || !enabled || message.documentId !== documentId || message.url !== location.href) return;
    if (["video-pick","video-current","video-live"].includes(message.command)) {
      app.selectTab("videos"); ui.$({"video-pick":"vq-pick","video-current":"vq-current","video-live":"vq-current"}[message.command]).click();
    } else if (message.command === "resize") { app.selectTab("resize"); }
    else if (message.command === "set-tab" && ["resize", "videos", "settings"].includes(message.tab)) app.selectTab(message.tab);
    else {
      const node = nodes.get(message.node);
      if (!node?.isConnected || node.disabled || node.closest("[inert]")) { respond({ ok: false, error: "这个操作已过期，请重新点击。" }); return; }
      if (message.event === "click") node.click();
      else if (["input", "change"].includes(message.event) && node instanceof HTMLInputElement) {
        node.value = String(message.value ?? "").slice(0, 10000); node.checked = !!message.checked;
        node.dispatchEvent(new Event(message.event, { bubbles: true }));
      } else if (message.event === "keydown" && ["Escape", "Enter", " ", "ArrowUp", "ArrowDown", "Home", "End"].includes(message.key)) node.dispatchEvent(new KeyboardEvent("keydown", { key: message.key, bubbles: true }));
    }
    schedule(); respond({ ok: true });
  });
  // SPA URL changes are also published even when the UI did not otherwise mutate.
  setInterval(() => { if (enabled && lastURL !== location.href) schedule(); }, 500);
  globalThis.PointResizePanelBridge = { documentId };
})();
