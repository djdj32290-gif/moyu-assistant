(() => {
  if (globalThis.PointResizeVideoPlayer) return;
  const css = `
    :root{color-scheme:light;--ink:#293c38;--muted:#667873;--accent:#376859;font-family:"Segoe UI","Microsoft YaHei",sans-serif;font-size:14px;color:var(--ink);background:#fff}
    *{box-sizing:border-box}[hidden]{display:none!important}body{margin:0}
    .vp-window{display:flex;flex-direction:column;height:100vh;overflow:hidden}
    .vp-screen{display:flex;flex-direction:column;min-height:0;flex:1}
    .vp-frame{display:block;width:100%;flex:1;min-height:0;border:0;background:#14231e}
    video.vp-frame{height:100%;object-fit:contain}
    .vp-bar{flex:none;padding:8px 10px;border-bottom:1px solid #dce6e1}
    .vp-title{font-size:12px;line-height:1.5;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:6px}
    .vp-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.vp-controls>button{width:auto}
    .vp-controls a{color:#376859;font-size:12px;text-decoration:none;margin-left:auto}
    .vp-hint{font-size:11px;color:#667873;line-height:1.5;margin:6px 0 0}.vp-hint:empty{display:none}
    .vp-window .video-page{min-height:0;flex:1;overflow:auto;padding:10px 12px}
    .vp-window.list-open .vp-screen{flex:none;height:56vh;min-height:160px}
    .vp-window .vq-note,.vp-window .vq-form{display:none}
    a:focus-visible{outline:2px solid #538775;outline-offset:3px}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;
  let player = null, pending = null;
  let nativeCallbacks = null;
  if (globalThis.chrome?.runtime?.id) chrome.runtime.onMessage.addListener(message => {
    if (message?.type !== "VIDEO_NATIVE_STATE" || !nativeCallbacks) return;
    if (message.id) nativeCallbacks.onActive?.(message.id);
    else nativeCallbacks.onClose?.();
  });
  function originalVideo(item) {
    if (!item.sourceUrl || !item.locator) return null;
    const source = new URL(item.sourceUrl), here = new URL(location.href);
    source.hash = ""; here.hash = "";
    if (source.href !== here.href) return null;
    try { return PointResizePicker.queryRule(item.locator).find(node => node.matches("video")) || null; }
    catch { return null; }
  }
  const missingSource = () => new Error("这是依附原网页的临时视频流。请保留原网页，并从该网页的待看列表点击播放；无需另开播放器页面。");
  function create(win, options) {
    let callbacks = options;
    const doc = win.document;
    doc.title = "视频待看";
    const style = doc.createElement("style");
    style.textContent = css + PointResizeVideos.css + PointResizePanel.buttonCSS.replaceAll(":host", ":root");
    doc.head.append(style);
    const root = doc.createElement("main"); root.className = "vp-window";
    root.innerHTML = `<section class="vp-screen" aria-label="视频播放器"><div id="vp-media" style="display:contents"></div><div class="vp-bar"><strong class="vp-title" id="vp-title"></strong><div class="vp-controls"><button class="textbutton" id="vp-list" type="button" aria-expanded="false">展开列表</button><button class="textbutton" id="vp-next" type="button">下一条</button><button class="textbutton" id="vp-close" type="button">关闭</button><a id="vp-source" target="_blank" rel="noopener noreferrer">原网页 ↗</a></div><p class="vp-hint" id="vp-hint" role="status"></p></div></section><section class="video-page" id="vp-queue" hidden aria-label="待看视频列表">${PointResizeVideos.template}</section>`;
    doc.body.replaceChildren(root);
    const $ = id => doc.getElementById(id);
    let current = null, timer = 0, disposed = false, releaseMedia = () => {}, borrowed = null;
    const queue = PointResizeVideos.mount({ $ }, { room: true, onPlay: play });
    function hint(text) { if (!disposed) $("vp-hint").textContent = text; }
    function play(input) {
      if (disposed) return;
      const item = PointResizeVideoData.item(input);
      // Check availability before releasing an already playing item.
      let original = item.kind === "media" ? (current?.id === item.id ? borrowed : null) || originalVideo(item) : null;
      if (item.dependent && !original) throw missingSource();
      clearTimeout(timer); releaseMedia(); borrowed = null; current = item;
      if (original) original = originalVideo(item);
      $("vp-title").textContent = item.title; $("vp-source").href = item.sourceUrl || item.url;
      hint("正在加载…");
      timer = setTimeout(() => hint("若无法播放，请回到原网页重新选取已加载的视频，或换一条视频。"), 15000);
      if (item.kind === "media") {
        const video = original || document.createElement("video");
        const marker = original ? document.createComment("point-resize:video-position") : null;
        const attributes = new Map(["class", "style", "controls", "playsinline"].map(name => [name, video.getAttribute(name)]));
        const previousMuted = video.muted;
        let forcedMute = false, watchedSent = false, watchedStart = -1;
        const trackWatch = () => {
          if (watchedSent || video.paused || !video.videoWidth || video.readyState < 2) return;
          if (watchedStart < 0) { watchedStart = video.currentTime; return; }
          if (video.currentTime - watchedStart < .3) return;
          watchedSent = true;
          PointResizeVideos.request("WATCH", { id: item.id, watched: true }).catch(error => hint("已看状态保存失败：" + error.message));
        };
        if (original) { original.before(marker); borrowed = original; }
        video.className = "vp-frame";
        // A borrowed player keeps its source/MediaSource and event listeners.
        video.style.cssText = "display:block;width:100%;height:100%;min-height:0;flex:1;object-fit:contain;margin:0;border:0;";
        video.controls = true; video.playsInline = true;
        const playing = () => { clearTimeout(timer); hint("正在播放" + (forcedMute ? " · 浏览器限制，已静音，可用控件开启声音" : "") + (item.dependent ? " · 请保留原网页" : "")); };
        const failed = () => { clearTimeout(timer); hint("视频源无法播放或已失效，请回到原网页重新选取已加载的视频。"); };
        video.addEventListener("playing", playing); video.addEventListener("error", failed); video.addEventListener("timeupdate", trackWatch);
        releaseMedia = () => {
          video.removeEventListener("playing", playing); video.removeEventListener("error", failed); video.removeEventListener("timeupdate", trackWatch); video.pause();
          if (marker) {
            video.muted = previousMuted;
            for (const [name, value] of attributes) { if (value === null) video.removeAttribute(name); else video.setAttribute(name, value); }
            if (marker.isConnected) marker.replaceWith(video);
            else { marker.remove(); video.remove(); }
          } else { video.removeAttribute("src"); video.load(); video.remove(); }
          releaseMedia = () => {};
        };
        // Begin loading in the opener document before adoption. A media element
        // first loaded in the fresh PiP document may leave its request pending.
        if (!original) { video.src = item.mediaUrl; video.preload = "auto"; video.load(); }
        $("vp-media").replaceChildren(video);
        video.play().catch(async error => {
          if (disposed || current?.id !== item.id) return;
          // New PiP documents may block unmuted autoplay despite the opener's
          // click. Start muted in that case; opening/starting needs no second click.
          if (error.name === "NotAllowedError" && !video.muted) {
            forcedMute = true; video.muted = true;
            try { await video.play(); return; } catch { /* Fall through to a truthful hint. */ }
          }
          if (!disposed && current?.id === item.id) hint("视频暂未开始播放，可使用小窗内的原生播放控件；网站可能要求先在原网页加载视频。");
        });
      } else {
        const frame = doc.createElement("iframe"); frame.className = "vp-frame";
        frame.title = item.title + " · B 站播放器";
        frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
        frame.allowFullscreen = true;
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.onload = () => hint("未登录画质由 B 站提供。");
        frame.src = item.embed;
        $("vp-media").replaceChildren(frame);
        releaseMedia = () => { frame.onload = null; frame.remove(); releaseMedia = () => {}; };
      }
      queue.setActive(item.id); callbacks.onActive?.(item.id);
    }
    $("vp-list").onclick = () => {
      const open = $("vp-queue").hidden;
      $("vp-queue").hidden = !open; root.classList.toggle("list-open", open);
      $("vp-list").textContent = open ? "收起列表" : "展开列表";
      $("vp-list").setAttribute("aria-expanded", String(open));
      // Resizing is optional; the list also works in browsers that keep the size.
      try { win.resizeTo(win.outerWidth, open ? 620 : 370); } catch { /* User can resize manually. */ }
    };
    $("vp-next").onclick = () => {
      const items = queue.items;
      if (!items.length) { hint("待看列表为空。"); return; }
      const index = items.findIndex(item => item.id === current?.id);
      try { play(items[(index + 1) % items.length]); } catch (error) { hint(error.message); }
    };
    $("vp-close").onclick = () => win.close();
    const api = { win, play, setOptions(value) { callbacks = value; } };
    win.addEventListener("pagehide", () => {
      disposed = true; clearTimeout(timer); queue.destroy(); releaseMedia(); borrowed = null;
      // Remove the embedded player to release audio/network resources on close.
      $("vp-media")?.replaceChildren();
      if (player === api) player = null;
      callbacks.onClose?.();
    }, { once: true });
    return api;
  }
  function open(item, options = {}) {
    try {
      item = PointResizeVideoData.item(item);
      if (item.dependent && !originalVideo(item) && !(player && !player.win.closed)) throw missingSource();
    } catch (error) { return Promise.reject(error); }
    // Persistent sources use the independent Windows player. The old browser
    // path remains for the local demo and already-saved page-dependent media.
    if (globalThis.chrome?.runtime?.id && !item.dependent) {
      nativeCallbacks = options;
      return chrome.runtime.sendMessage({ type: "VIDEO_NATIVE_PLAY", item }).then(result => {
        if (!result?.ok) throw new Error(result?.error || "桌面视频助手未连接。");
        originalVideo(item)?.pause();
        PointResizeVideos.pauseSource(item);
        options.onActive?.(item.id);
      });
    }
    if (player && !player.win.closed) {
      try { player.setOptions(options); player.win.focus(); player.play(item); return Promise.resolve(); }
      catch (error) { return Promise.reject(error); }
    }
    if (pending) return pending.then(() => { if (player) { player.setOptions(options); player.play(item); } });
    if (!globalThis.documentPictureInPicture?.requestWindow) return Promise.reject(new Error("当前页面无法开启小窗，请使用桌面版 Chrome / Edge，并在 HTTPS 普通网页上重试。"));
    // This call runs in the list's original click handler, BEFORE any async work.
    // No tab, landing page, or second activation is needed.
    let opening;
    try { opening = documentPictureInPicture.requestWindow({ width: 480, height: 370, disallowReturnToOpener: true }); }
    catch (error) { return Promise.reject(error); }
    pending = opening.then(win => {
      try { player = create(win, options); player.play(item); }
      catch (error) { win.close(); throw error; }
    }).finally(() => { pending = null; });
    return pending;
  }
  globalThis.PointResizeVideoPlayer = { open };
})();
