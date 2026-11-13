from pathlib import Path
p = Path(__file__).resolve().parent.parent / 'src' / 'content.js'
s = p.read_text(encoding='utf-8')
start = s.index('  function renderRules() {')
end = s.index('  function renderEditor() {', start)
s = s[:start] + '''  function renderRules() { $("rule-count").textContent = state.profile.rules.length; }
  function editSaved(id) {
    const item = state.profile.rules.find(rule => rule.id === id);
    if (!item) return { ok: false, error: "这条设置已被删除。" };
    const first = layersOf(item).find(rule => rule.level === 1) || item;
    const element = document.querySelector(first.selector);
    if (!element) return { ok: false, error: "当前页面没有这项内容，请打开保存时的页面再调整。" };
    lock(candidateFor(first, element), item); return { ok: true };
  }
''' + s[end:]
start = s.index('  async function queueThumbnail(session, entry) {')
end = s.index('  $("close").onclick', start)
s = s[:start] + '''  function snapshotGeometry(candidate) {
    const raw = rectFor(candidate);
    const clip = r => {
      const x = Math.max(0, r.left), y = Math.max(0, r.top);
      return { x, y, width: Math.max(0, Math.min(innerWidth, r.right) - x), height: Math.max(0, Math.min(innerHeight, r.bottom) - y) };
    };
    let context = raw, parent = candidate.element.parentElement;
    for (let i = 0; parent && i < 2; i++, parent = parent.parentElement) {
      if (parent === document.body || parent === document.documentElement) break;
      const r = parent.getBoundingClientRect();
      if (r.width >= raw.width && r.height >= raw.height) context = r;
    }
    return { target: clip(raw), rect: clip({ left: context.left - 24, top: context.top - 24, right: context.right + 24, bottom: context.bottom + 24 }) };
  }
  async function queueThumbnail(session, entry) {
    if (entry.thumbnail || entry.capture) return entry.capture;
    const task = async () => {
      if (state.session !== session || !entry.candidate.element.isConnected || !chrome.runtime.id) return;
      const fresh = !session.snapshot;
      if (fresh) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 600 - (Date.now() - lastCapture))));
        if (state.session !== session) return;
        session.snapshotGeometry = new Map([...session.levels].map(([level, candidate]) => [level, snapshotGeometry(candidate)]));
        session.viewport = { width: innerWidth, height: innerHeight };
      }
      const geometry = session.snapshotGeometry?.get(entry.rule.level);
      if (!geometry || geometry.rect.width < 1 || geometry.rect.height < 1 || geometry.target.width < 1 || geometry.target.height < 1) return;
      const before = { x: scrollX, y: scrollY };
      if (fresh) ui.host.style.setProperty("visibility", "hidden", "important");
      try {
        if (fresh) { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); lastCapture = Date.now(); }
        const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_CAPTURE", thumbnail: true, snapshotId: session.snapshot, ...geometry, viewport: session.viewport });
        if (state.session === session && result?.ok) {
          session.snapshot = result.snapshotId;
          if (thumbnailOK(result.dataURL) && (!fresh || (scrollX === before.x && scrollY === before.y))) entry.thumbnail = result.dataURL;
        }
      } catch { /* Preview failure does not prevent saving the settings. */ }
      finally { if (fresh) ui.host.style.removeProperty("visibility"); draw(); }
    };
    entry.capture = captureQueue.then(task).finally(() => { entry.capture = null; });
    captureQueue = entry.capture.catch(() => {});
    return entry.capture;
  }

''' + s[end:]
start = s.index('  $("enabled").onchange')
end = s.index('  const inUI', start)
s = s[:start] + '''  $("manage").onclick = () => {
    if (chrome.runtime.id) chrome.runtime.sendMessage({ type: "POINT_RESIZE_MANAGE" }).catch(error => status(error.message, true));
    else window.open(new URL("manager.html?site=" + encodeURIComponent(location.hostname), location.href), "point-resize-manager");
  };
''' + s[end:]
s = s.replace('    $("count").textContent', '''    const step = d.mode === "font" ? 1 : 5, min = d.mode === "font" ? 8 : 10, max = d.mode === "font" ? 64 : 200;
    const lower = Math.max(min, (Math.ceil(d.value / step) - 1) * step), upper = Math.min(max, (Math.floor(d.value / step) + 1) * step);
    for (const [id, value] of [["round-down", lower], ["round-up", upper]]) {
      const button = $(id); button.textContent = value + (d.mode === "font" ? "px" : "%"); button.dataset.value = value;
      button.setAttribute("aria-label", (id === "round-down" ? "向下取整到 " : "向上取整到 ") + value + (d.mode === "font" ? " 像素" : "%"));
      button.disabled = value === d.value;
    }
    $("count").textContent''')
s = s.replace('  $("name").oninput', '''  for (const id of ["round-down", "round-up"]) $(id).onclick = () => setValue($(id).dataset.value);
  $("name").oninput''')
s = s.replace('layers: entries.map(entry', 'pageURL: location.href, layers: entries.map(entry')
s = s.replace('    if (message.type !== "POINT_RESIZE_SHOW") return;', '''    if (message.type === "POINT_RESIZE_EDIT_SAVED") { open(message).then(() => respond(editSaved(message.id)), error => respond({ ok: false, error: error.message })); return true; }
    if (message.type !== "POINT_RESIZE_SHOW") return;''')
s = s.replace('  globalThis.PointResizeApp =', '''  if (!chrome.runtime.id) window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "POINT_RESIZE_DEMO_EDIT") open().then(() => editSaved(event.data.id));
  });
  globalThis.PointResizeApp =''')
p.write_text(s, encoding='utf-8')
