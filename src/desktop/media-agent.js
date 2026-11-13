// Runs in each WebView2 document, including the public embedded player.
(() => {
  if (globalThis.__pointResizeMedia) return;
  let held = false, playId = '';
  const resume = new Set();
  function videos(root = document) {
    return [...root.querySelectorAll('video'), ...[...root.querySelectorAll('*')].flatMap(el => el.shadowRoot ? videos(el.shadowRoot) : [])];
  }
  function report() {
    for (const v of videos()) chrome.webview.postMessage({ type: 'media', playId, time: v.currentTime, paused: v.paused, width: v.videoWidth, height: v.videoHeight, ready: v.readyState, ended: v.ended });
  }
  globalThis.__pointResizeMedia = {
    reset(id) { held = false; playId = id || ''; resume.clear(); },
    pause() {
      held = true;
      for (const v of videos()) { if (!v.paused && !v.ended) resume.add(v); v.pause(); }
      report(); return true;
    },
    async resume() {
      held = false;
      const pending = [...resume]; resume.clear();
      for (const v of pending) if (v.isConnected && !v.ended) { try { await v.play(); } catch { /* Playback restrictions remain visible. */ } }
      report(); return true;
    }
  };
  document.addEventListener('play', e => {
    if (!(e.target instanceof HTMLVideoElement)) return;
    if (held) { resume.add(e.target); e.target.pause(); }
    report();
  }, true);
  document.addEventListener('playing', report, true);
  document.addEventListener('pause', report, true);
  setInterval(report, 700);
})();
