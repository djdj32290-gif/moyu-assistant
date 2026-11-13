(() => {
  if (globalThis.PointResizeApp) return;
  const P = globalThis.PointResizePicker, ui = globalThis.PointResizePanel.create(), $ = ui.$;
  const videoPage = globalThis.PointResizeVideos?.mount(ui);
  globalThis.PointResizeNativeSettings?.mount(ui);
  const site = location.hostname || "local-demo", key = "point-resize:v1:" + site;
  const style = document.createElement("style");
  style.dataset.pointResize = "styles"; document.documentElement.append(style);
  const rootStyles = new Map([[document, style]]);
  let observedRoots = [document];
  const state = { tab: "resize", view: "current", allProfiles: {}, allLoad: 0, profile: { enabled: true, rules: [] }, session: null, draft: null, selected: null, candidates: [], picking: false, visible: false, dirty: false, point: null, frame: 0, autoEnabled: true };
  let previewAccess=true;
  const hoverPreview=PointResizePanel.hoverPreview(ui,()=>previewAccess&&!document.hidden&&!state.picking&&$("vq-pick")?.getAttribute('aria-pressed')!=='true');
  const measured = new Map(), textWrappers = new Set(), relatedOutlines = [];
  const sizeVars = ["--point-resize-width", "--point-resize-height", "--point-resize-original-zoom"];
  let refreshTimer = 0, forceMeasure = false, captureQueue = Promise.resolve(), lastCapture = 0, profileWrites = Promise.resolve();
  const uid = () => crypto.randomUUID?.() || Date.now().toString(36) + "-" + [...crypto.getRandomValues(new Uint32Array(2))].join("-");
  const layersOf = item => Array.isArray(item.layers) ? item.layers : [item];
  const allEntries = session => [...session.allEntries.values()];
  function peerGroup(session, candidate, level) {
    const parent = P.siblingParent(candidate);
    let group = session.peerGroups.find(group => group.parent === parent && group.level === level);
    const peers = P.siblingsOf(candidate, ui.host);
    if (!group) {
      const index = peers.findIndex(peer => P.sameCandidate(peer, candidate));
      group = { parent, level, options: index < 0 ? [candidate, ...peers] : [candidate, ...peers.slice(index + 1), ...peers.slice(0, index)] };
      session.peerGroups.push(group);
    } else {
      group.options = group.options.filter(peer => peer.element.isConnected);
      for (const peer of peers) if (!group.options.some(option => P.sameCandidate(option, peer))) group.options.push(peer);
    }
    return group;
  }
  function entryFor(session, candidate, level, saved) {
    let entry = allEntries(session).find(entry => entry.rule.level === level && P.sameCandidate(entry.candidate, candidate));
    if (!entry) {
      entry = makeEntry(candidate, level, saved);
      const alias = !saved && allEntries(session).find(other => signature(other.rule) === signature(entry.rule));
      if (alias) { entry.rule.value = alias.rule.value; entry.rule.defaultValue = alias.rule.defaultValue; entry.rule.hidden = !!alias.rule.hidden; }
      session.allEntries.set(entry.rule.id, entry);
    }
    entry.group = peerGroup(session, candidate, level);
    entry.rule.sibling = entry.group.options.findIndex(peer => P.sameCandidate(peer, candidate)) + 1;
    return entry;
  }
  const signature = rule => JSON.stringify(rule.shadowPath || []) + "|" + rule.selector + "|" + rule.mode + "|" + (rule.textAnchor ? rule.textAnchor.index : "");
  const thumbnailOK = value => typeof value === "string" && value.length <= 240000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
  function pageGroup(item, site) {
    try {
      const url = new URL(item.pageURL);
      if (url.hostname !== site || !/^(https?:|file:)$/.test(url.protocol)) throw new Error();
      const route = url.hash.startsWith("#/") ? url.hash.slice(1).split("?")[0] : url.pathname;
      const key = route.split("/").map(segment => /^(?:\d+|[a-f\d]{16,}|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12})$/i.test(segment) ? "*" : segment).join("/").replace(/\/+$/, "") || "/";
      let label = key; try { label = decodeURIComponent(key); } catch { /* Keep an encoded path readable even if it contains malformed escapes. */ }
      return { key, label };
    } catch { return { key: "", label: "未分类（旧版记录）" }; }
  }
  // List groups may combine post IDs; applying or editing a rule must not.
  function pageIdentity(input) {
    try {
      const url = new URL(input);
      if (!/^(https?:|file:)$/.test(url.protocol)) return "";
      if (!/^#!?\//.test(url.hash)) url.hash = "";
      return url.href;
    } catch { return ""; }
  }
  const localItem = (item, targetSite) => targetSite === site && (!item.pageURL || pageIdentity(item.pageURL) === pageIdentity(location.href));
  let activePage = pageIdentity(location.href);
  function updatePage() {
    const next = pageIdentity(location.href);
    if (next === activePage) return false;
    activePage = next;
    const hadDraft = !!state.session || state.picking;
    hoverPreview.close();videoPage?.cancelPicking(); setPicking(false); clearSelection(); ui.closePreview();
    if (state.view === "edit") state.view = "current";
    forceMeasure = true;
    if (state.visible) {
      renderRules(true); if (state.view === "all") renderAll();
      status(hadDraft ? "页面已切换，已撤销上一页未保存的调整。" : "");
    }
    return true;
  }
  function syncPage() {
    if (!updatePage()) return false;
    apply(); return true;
  }
  function status(message = "", error = false) { $("status").textContent = message; $("status").className = "status" + (error ? " error" : ""); }
  function sanitizeProfile(profile) {
    return { enabled: true, rules: (Array.isArray(profile.rules) ? profile.rules : []).filter(P.validRule).slice(0, 100).map(item => ({
      ...item, enabled: profile.enabled !== false && item.enabled !== false,
      thumbnail: thumbnailOK(item.thumbnail) ? item.thumbnail : "",
      ...(Array.isArray(item.layers) ? { layers: item.layers.filter(P.validRule).slice(0, 100) } : {})
    })) };
  }
  const observer = new MutationObserver(records => {
    ui.syncLayer();
    if (!state.profile.rules.length && !state.session) return;
    const ownStyle = node => node?.nodeType === Node.ELEMENT_NODE && node.dataset.pointResize === "styles";
    if (records.every(record => record.target === ui.host || ownStyle(record.target) || ownStyle(record.target.parentNode))) return;
    for (const record of records) {
      let element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.host || record.target.parentElement;
      while (element && !measured.has(element)) element = P.parentOf(element);
      if (!element) continue;
      if (record.attributeName === "style") {
        const previous = document.createElement("div").style; previous.cssText = record.oldValue || "";
        const current = record.target.style;
        // Virtualized lists change translate/top while scrolling. Those are not
        // size changes and must not trigger a full unscaled measurement pass.
        if (["width", "height", "min-width", "max-width", "min-height", "max-height", "padding", "font-size", "display", "flex-basis", "aspect-ratio"].some(name => previous.getPropertyValue(name) !== current.getPropertyValue(name))) forceMeasure = true;
      } else forceMeasure = true;
    }
    scheduleRefresh();
  });
  function watch() {
    for (const root of observedRoots) observer.observe(root === document ? document.documentElement : root, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["class", "style", "src", "width", "height", "open", "popover"] });
  }
  // attachShadow on an already connected element produces no document mutation.
  // Discover these lazy components only while an active rule needs shadow roots.
  setInterval(() => {
    if (!activeRules().some(rule => rule.shadowPath?.length)) return;
    const roots = P.openRoots(ui.host);
    if (roots.length !== observedRoots.length || roots.some(root => !observedRoots.includes(root))) scheduleRefresh();
  }, 1500);
  function scheduleRefresh(force = false) {
    forceMeasure ||= force;
    if (!refreshTimer) refreshTimer = setTimeout(() => { refreshTimer = 0; apply(); }, 120);
  }
  const ready = chrome.storage.local.get(key).then(data => {
    if (data[key]) state.profile = sanitizeProfile(data[key]);
    apply();
  }).catch(error => status("无法读取本机设置：" + error.message, true));
  async function persist(item, baseRule) {
    if (chrome.runtime.id && globalThis.PointResizeData) await PointResizeData.profile(key, 'upsert', {id:item.id,rule:item,...(baseRule ? {baseRule} : {})});
    else await chrome.storage.local.set({ [key]: state.profile });
  }

  function activeRules() {
    const saved = state.profile.rules.filter(item => item.enabled !== false && item.id !== state.session?.id && localItem(item, site)).flatMap(layersOf);
    const previews = state.session && pageIdentity(state.session.pageURL) === pageIdentity(location.href) ? allEntries(state.session).map(entry => entry.rule) : [];
    // A layer selected again replaces its saved target, instead of applying twice.
    const overrides = new Set(previews.map(signature));
    return [...saved.filter(rule => !overrides.has(signature(rule))), ...previews].filter(P.validRule);
  }
  function release(element, original) {
    sizeVars.forEach((name, i) => original[i].value ? element.style.setProperty(name, original[i].value, original[i].priority) : element.style.removeProperty(name));
  }
  function apply() {
    observer.disconnect();
    updatePage();
    const active = activeRules();
    observedRoots = active.some(rule => rule.shadowPath?.length) ? P.openRoots(ui.host) : [document];
    const cssByRoot = new Map([[document, []]]);
    for (const rule of active) for (const root of P.rootsFor(rule)) {
      if (!cssByRoot.has(root)) cssByRoot.set(root, []);
      cssByRoot.get(root).push(P.ruleCSS(rule));
    }
    for (const [root, sheet] of rootStyles) {
      if (root !== document && !cssByRoot.has(root)) { sheet.remove(); rootStyles.delete(root); }
    }
    for (const root of cssByRoot.keys()) if (!rootStyles.has(root)) {
      const sheet = document.createElement("style"); sheet.dataset.pointResize = "styles"; root.append(sheet); rootStyles.set(root, sheet);
    }
    for (const [root, sheet] of rootStyles) {
      if (!sheet.isConnected) (root === document ? document.documentElement : root).append(sheet);
    }
    // Reuse healthy text wrappers; remove only stale / disabled anchors.
    const fontRules = active.filter(rule => rule.mode === "font" && rule.textAnchor && changed(rule));
    const fontIds = new Set(fontRules.map(rule => rule.id));
    for (const wrapper of textWrappers) {
      const rule = fontRules.find(rule => rule.id === wrapper.getAttribute(P.textAttribute));
      if (!wrapper.isConnected || !fontIds.has(wrapper.getAttribute(P.textAttribute)) || !rule || !P.queryRule(rule).includes(wrapper.parentElement)) {
        if (wrapper.isConnected) wrapper.replaceWith(...wrapper.childNodes);
        textWrappers.delete(wrapper);
      }
    }
    for (const rule of fontRules) {
      for (const container of P.queryRule(rule)) {
        const node = P.resolveText(container, rule.textAnchor, rule.similar);
        if (!node?.isConnected) continue;
        const existing = node.parentElement;
        if (existing.hasAttribute(P.textAttribute)) {
          if (existing.getAttribute(P.textAttribute) !== rule.id) existing.setAttribute(P.textAttribute, rule.id);
          textWrappers.add(existing); continue;
        }
        const wrapper = document.createElement("span");
        wrapper.setAttribute(P.textAttribute, rule.id);
        node.replaceWith(wrapper); wrapper.append(node); textWrappers.add(wrapper);
      }
    }
    const targets = new Set();
    for (const rule of active.filter(rule => !rule.hidden && rule.mode === "scale" && rule.value !== 100)) {
      for (const element of P.queryRule(rule)) {
        if (element !== ui.host && element !== document.body && element !== document.documentElement) targets.add(element);
      }
    }
    const needsMeasure = forceMeasure || [...targets].some(element => !measured.has(element));
    const scroll = { x: scrollX, y: scrollY };
    const root = document.documentElement;
    const anchor = { value: root.style.getPropertyValue("overflow-anchor"), priority: root.style.getPropertyPriority("overflow-anchor") };
    if (needsMeasure) root.style.setProperty("overflow-anchor", "none", "important");
    for (const [element, original] of measured) {
      if (!targets.has(element)) { release(element, original); measured.delete(element); }
    }
    if (needsMeasure) {
      // Temporarily removing zoom to measure must never move the scroll anchor.
      for (const sheet of rootStyles.values()) sheet.textContent = "";
      const boxes = [...targets].map(element => {
        const css = getComputedStyle(element), r = element.getBoundingClientRect();
        return { element, width: element.offsetWidth || parseFloat(css.width) || r.width, height: element.offsetHeight || parseFloat(css.height) || r.height, zoom: Number.parseFloat(css.zoom) || 1 };
      });
      for (const box of boxes) {
        if (!measured.has(box.element)) measured.set(box.element, sizeVars.map(name => ({ value: box.element.style.getPropertyValue(name), priority: box.element.style.getPropertyPriority(name) })));
        [box.width + "px", box.height + "px", String(box.zoom)].forEach((value, i) => {
          if (box.element.style.getPropertyValue(sizeVars[i]) !== value) box.element.style.setProperty(sizeVars[i], value);
        });
      }
    }
    for (const [root, rules] of cssByRoot) {
      const sheet = rootStyles.get(root), css = rules.join("\n");
      if (sheet.textContent !== css) sheet.textContent = css;
    }
    if (needsMeasure) {
      // Flush the final layout while anchoring is suspended, then restore the viewport.
      root.getBoundingClientRect();
      if (scrollX !== scroll.x || scrollY !== scroll.y) window.scrollTo(scroll.x, scroll.y);
      if (anchor.value) root.style.setProperty("overflow-anchor", anchor.value, anchor.priority);
      else root.style.removeProperty("overflow-anchor");
    }
    forceMeasure = false; watch();
    if (state.session && state.visible) refreshSiblingControls();
    if (state.visible) requestAnimationFrame(draw);
  }

  function rectFor(candidate) { return P.rectFor(candidate); }
  function visibleRect(candidate) {
    const r = rectFor(candidate);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  }
  function positionOutline(outline, r) {
    outline.hidden = false;
    outline.style.left = r.left + "px"; outline.style.top = r.top + "px"; outline.style.width = r.width + "px"; outline.style.height = r.height + "px";
  }
  function candidateFor(rule, element) {
    return { element, label: rule.defaultLabel || rule.label || "内容区域", kind: rule.kind, reason: "已读取保存的设置", ...(rule.textAnchor ? { textAnchor: rule.textAnchor, textNode: P.resolveText(element, rule.textAnchor, rule.similar) } : {}) };
  }
  function draw() {
    relatedOutlines.forEach(outline => { outline.hidden = true; });
    const candidate = state.selected;
    if (!state.visible || state.tab !== "resize" || !candidate?.element?.isConnected) { $("outline").hidden = true; return; }
    const similar = state.draft ? !!state.draft.similar : true;
    if (similar) {
      const locator = state.draft || P.locatorFor(candidate.element, true);
      let count = 0;
      for (const element of P.queryRule(locator)) {
        if (element === candidate.element || element === ui.host || element === document.documentElement || element === document.body) continue;
        const other = candidate.textAnchor ? { element, textNode: P.resolveText(element, candidate.textAnchor, true) } : { element };
        if (candidate.textAnchor && !other.textNode) continue;
        const r = visibleRect(other); if (!r) continue;
        if (!relatedOutlines[count]) {
          const outline = document.createElement("div"); outline.className = "outline related"; $("related-outlines").append(outline); relatedOutlines.push(outline);
        }
        positionOutline(relatedOutlines[count++], r); if (count >= 150) break;
      }
    }
    const r = visibleRect(candidate);
    if (!r) { $("outline").hidden = true; return; }
    positionOutline($("outline"), r);
    $("outline").className = "outline" + (state.picking ? "" : " locked") + (r.top < 32 ? " tagbelow" : "");
    $("tag").textContent = candidate.label + (state.picking ? " · 点击选中" : " · 第 " + state.session.current + " 层 · " + state.draft.sibling);
  }
  function changed(rule) { return rule.hidden === true || (rule.mode === "scale" ? rule.value !== 100 : rule.value !== rule.defaultValue); }
  function renderLevels() {
    const s = state.session; if (!s) { $("levels").replaceChildren(); return; }
    const explored = [...s.entries.keys()].sort((a, b) => b - a), rows = [...$("levels").children];
    // Keep buttons in place while a number input commits on blur. Replacing
    // the pressed reset button between pointerdown and click loses that click.
    const reuse = rows.length === explored.length && rows.every((row, index) => Number(row.querySelector(".level").dataset.level) === explored[index]);
    if (!reuse) $("levels").replaceChildren();
    for (const [index, level] of explored.entries()) {
      const row = reuse ? rows[index] : document.createElement("div"); row.className = "level-row";
      const entry = s.entries.get(level), button = reuse ? row.querySelector(".level") : document.createElement("button");
      button.className = "level" + (level === s.current ? " active" : "") + (entry && changed(entry.rule) ? " changed" : "");
      button.textContent = String(level); button.dataset.level = level; button.setAttribute("aria-label", "第 " + level + " 层");
      button.setAttribute("aria-current", level === s.current ? "true" : "false");
      button.title = "第 " + level + " 层 · " + (entry ? (entry.rule.hidden ? "已隐藏" : changed(entry.rule) ? entry.rule.value + (entry.rule.mode === "font" ? "px" : "%") : "原始大小") : "未调整");
      button.onclick = () => switchLevel(level);
      const peer = reuse ? row.querySelector(".level-peer") : document.createElement("button");
      peer.className = "level-peer" + (level === s.current ? " active" : ""); peer.textContent = String(entry.rule.sibling || 1);
      peer.setAttribute("aria-label", "第 " + level + " 层第 " + (entry.rule.sibling || 1) + " 个元素");
      peer.title = "第 " + level + " 层 · 第 " + (entry.rule.sibling || 1) + " 个元素";
      peer.onclick = () => switchLevel(level);
      const reset = reuse ? row.querySelector(".level-reset") : document.createElement("button"); reset.className = "level-reset"; reset.textContent = "↺";
      reset.setAttribute("aria-label", "复原第 " + level + " 层"); reset.title = "复原第 " + level + " 层，其他层保持不变"; reset.disabled = !changed(entry.rule);
      reset.onclick = () => resetLevel(level);
      if (!reuse) { row.append(button, peer, reset); $("levels").append(row); }
    }
    const current = $("levels").querySelector(".active");
    if (current) $("levels").scrollTop = current.offsetTop - $("levels").offsetTop - $("levels").clientHeight / 2;
    const order = [...s.levels.keys()].sort((a, b) => b - a), index = order.indexOf(s.current);
    $("scope-up").disabled = index === 0; $("scope-down").disabled = index === order.length - 1;
    refreshSiblingControls();
    ui.syncControls();
  }
  function refreshSiblingControls() {
    const s = state.session; if (!s) return;
    const entry = s.entries.get(s.current); if (!entry) return;
    const group = peerGroup(s, entry.candidate, s.current);
    const peerIndex = group.options.findIndex(peer => P.sameCandidate(peer, entry.candidate));
    $("sibling-prev").disabled = peerIndex <= 0; $("sibling-next").disabled = peerIndex === group.options.length - 1;
    $("sibling-count").textContent = (peerIndex + 1) + " / " + group.options.length;
  }
  function layout() {
    const all = state.view === "all", editing = state.view === "edit";
    const headings = { resize: ["点选缩放", "pointer"], settings: ["设置", "settings"], videos: ["视频待看", "video"] };
    const [heading, mark] = headings[state.tab];
    $("brand-title").textContent = heading;
    if ($("brand-mark").dataset.icon !== mark) { $("brand-mark").innerHTML = ui.icon(mark); $("brand-mark").dataset.icon = mark; }
    $("site").hidden = state.tab !== "resize";
    $("panel").setAttribute("aria-label", heading + "面板");
    $("resize-page").hidden = state.tab !== "resize";
    $("settings-page").hidden = state.tab !== "settings";
    $("videos-page").hidden = state.tab !== "videos";
    for (const tab of ["resize", "videos", "settings"]) {
      $("tab-" + tab).setAttribute("aria-selected", String(state.tab === tab));
      $("tab-" + tab).tabIndex = state.tab === tab ? 0 : -1;
    }
    $("choose").hidden = all || (editing && !!state.draft);
    $("library").hidden = all || editing;
    $("edit-heading").hidden = !editing || !state.draft;
    $("editor").hidden = !editing || !state.draft;
    $("choose-label").textContent = state.picking ? "正在选取 · 点击取消" : !editing && !state.profile.rules.length ? "还没有保存项，点击开始调整" : "选择网页内容";
    $("all-view").hidden = !all;
    ui.syncControls();
  }
  function finishEdit(message = "已取消。") {
    setPicking(false); clearSelection(); state.view = "current";
    apply(); renderRules(true); status(message);
  }
  function bulkToggle(input, profile, site) {
    const count = profile.rules.filter(item => item.enabled !== false).length;
    input.checked = !!profile.rules.length && count === profile.rules.length;
    input.indeterminate = count > 0 && count < profile.rules.length; input.disabled = !profile.rules.length;
    input.onchange = () => { const enabled = input.checked; updateProfile(site, data => data.rules.forEach(item => { item.enabled = enabled; }), {command:'toggle-all',enabled}); };
  }
  function updateProfile(site, mutate, operation) {
    const storageKey = "point-resize:v1:" + site;
    profileWrites = profileWrites.then(async () => {
      const data = await chrome.storage.local.get(storageKey), profile = sanitizeProfile(data[storageKey] || {});
      mutate(profile);
      if (chrome.runtime.id && globalThis.PointResizeData && operation) await PointResizeData.profile(storageKey,operation.command,operation);
      else await chrome.storage.local.set({ [storageKey]: profile }); status("已保存。");
    }).catch(error => { renderRules(); if (state.view === "all") loadAll(); status("保存失败：" + error.message, true); });
    return profileWrites;
  }
  function ruleRow(item, site) {
    const row = document.createElement("article"); row.className = "rule" + (item.enabled === false ? " disabled" : "");
    row.setAttribute("aria-label", item.label || item.defaultLabel || "内容区域");
    const check = document.createElement("input"); check.type = "checkbox"; check.className = "rule-check"; check.checked = item.enabled !== false;
    check.setAttribute("aria-label", "启用 " + (item.label || "内容区域"));
    check.onchange = () => { const enabled = check.checked; updateProfile(site, profile => { const target = profile.rules.find(rule => rule.id === item.id); if (target) target.enabled = enabled; }, {command:'update',id:item.id,updates:{enabled}}); };
    const thumb = document.createElement(item.thumbnail ? "button" : "span");
    if (item.thumbnail) {
      thumb.type = "button"; thumb.className = "thumb-button"; thumb.setAttribute("aria-label", "查看 " + item.label + " 的截图"); thumb.title = "点击查看大图";
      const image = document.createElement("img"); image.className = "rule-thumb"; image.src = item.thumbnail; image.alt = item.label + " 区域截图"; thumb.append(image);
      thumb.onclick = () => ui.showPreview(item.thumbnail, item.label);
    } else { thumb.className = "rule-thumb empty-thumb"; thumb.textContent = "无预览"; }
    const copy = document.createElement("div"); copy.className = "rule-copy";
    const name = document.createElement("label"); name.className = "rule-name";
    const input = document.createElement("input"); input.value = item.name || ""; input.placeholder = item.defaultLabel || item.label; input.maxLength = 60; input.setAttribute("aria-label", "保存项名称");
    input.onchange = () => { const value = input.value.trim(); updateProfile(site, profile => { const target = profile.rules.find(rule => rule.id === item.id); if (target) { target.name = value; target.label = value || target.defaultLabel || "内容区域"; } }, {command:"update",id:item.id,updates:{name:value,label:value || item.defaultLabel || "内容区域"}}); };
    name.append(input);
    const value = document.createElement("span"); value.className = "ruleval";
    const modified = [...new Map(layersOf(item).filter(changed).map(rule => [signature(rule), rule])).values()];
    if (!modified.length) value.textContent = "原始大小";
    for (const [index, rule] of modified.entries()) {
      if (index) value.append(document.createTextNode(" · "));
      const effect = document.createElement("span"); effect.className = "rule-effect " + (rule.hidden ? "hidden-effect" : "resize-effect");
      effect.textContent = "第" + (rule.level || 1) + "层" + (rule.sibling > 1 ? "·" + rule.sibling : "") + " " + (rule.hidden ? "隐藏" : (rule.mode === "font" ? "字号 " : "缩放 ") + rule.value + (rule.mode === "font" ? "px" : "%"));
      value.append(effect);
    }
    const actions = document.createElement("div"); actions.className = "rule-actions";
    const edit = document.createElement("button"); edit.className = "textbutton"; edit.textContent = localItem(item, site) ? "调整" : "到网页调整";
    edit.onclick = async () => {
      await profileWrites;
      if (localItem(item, site)) { const result = editSaved(item.id); if (!result.ok) status(result.error, true); }
      else if (chrome.runtime.id) {
        try { const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_EDIT_ON_PAGE", site, id: item.id }); if (!result?.ok) status(result?.error || "打开网页失败。", true); }
        catch (error) { status(error.message, true); }
      } else status("体验页仅支持调整当前网站；跨网站调整请使用真实扩展。", true);
    };
    const remove = document.createElement("button"); remove.className = "textbutton danger"; remove.textContent = "删除";
    remove.onclick = () => updateProfile(site, profile => { profile.rules = profile.rules.filter(rule => rule.id !== item.id); }, {command:"remove",id:item.id});
    actions.append(edit, remove); copy.append(name, value, actions); row.append(check, thumb, copy); return row;
  }
  function renderRules(resetPages = false) {
    $("rule-count").textContent = state.profile.rules.length;
    bulkToggle($("enabled"), state.profile, location.hostname || "local-demo");
    renderPageGroups($("rules"), state.profile.rules, site, resetPages ? new Map() : pageStates($("rules")));
    if (!state.profile.rules.length) $("rules").append(emptySkeleton("暂无保存项"));
    layout();
  }
  function emptySkeleton(label) {
    const box = document.createElement("div"); box.className = "empty-skeleton"; box.setAttribute("role", "img"); box.setAttribute("aria-label", label);
    box.innerHTML = '<span class="skeleton-thumb" aria-hidden="true"></span><span class="skeleton-copy" aria-hidden="true"><i></i><i></i><i></i></span>';
    return box;
  }
  async function loadAll() {
    const revision = ++state.allLoad;
    try {
      const data = await chrome.storage.local.get(null); if (revision !== state.allLoad || state.view !== "all") return;
      state.allProfiles = Object.fromEntries(Object.entries(data).filter(([name]) => name.startsWith("point-resize:v1:")).map(([name, profile]) => [name.slice("point-resize:v1:".length), sanitizeProfile(profile || {})]));
      renderAll();
    } catch (error) { status("读取保存项失败：" + error.message, true); }
  }
  function pageStates(container) {
    return new Map([...container.querySelectorAll(".page-group")].map(node => [JSON.stringify([node.dataset.site, node.dataset.page]), node.open]));
  }
  function renderPageGroups(container, items, site, previous = pageStates(container)) {
    const grouped = new Map(), current = site === location.hostname ? pageGroup({ pageURL: location.href }, site).key : null;
    for (const item of items) {
      const page = pageGroup(item, site);
      if (!grouped.has(page.key)) grouped.set(page.key, { ...page, items: [] });
      grouped.get(page.key).items.push(item);
    }
    const groups = [...grouped.values()].sort((a, b) => a.key === current ? -1 : b.key === current ? 1 : a.label.localeCompare(b.label));
    container.replaceChildren(...groups.map((page, index) => {
      const group = document.createElement("details"); group.className = "page-group"; group.dataset.site = site; group.dataset.page = page.key;
      const identity = JSON.stringify([site, page.key]);
      group.open = state.view === "all" && !!$("site-search").value.trim() ? true : previous.has(identity) ? previous.get(identity) : page.key === current || !page.key || (site !== location.hostname && index === 0);
      const summary = document.createElement("summary"); summary.append(document.createTextNode(page.label));
      const count = document.createElement("span"); count.textContent = page.items.length + " 项"; summary.append(count);
      const records = document.createElement("div"); records.className = "page-records"; records.append(...page.items.map(item => ruleRow(item, site)));
      group.append(summary, records); return group;
    }));
  }
  function renderAll() {
    const opened = new Set([...$("all-records").querySelectorAll(".site-group[open]")].map(node => node.dataset.site));
    const pages = pageStates($("all-records"));
    const query = $("site-search").value.trim().toLowerCase(), groups = [];
    const profiles = Object.entries(state.allProfiles).filter(([, profile]) => profile.rules.length).sort(([a], [b]) => a === location.hostname ? -1 : b === location.hostname ? 1 : a.localeCompare(b));
    for (const [site, profile] of profiles) {
      const items = profile.rules.filter(item => !query || site.toLowerCase().includes(query) || (item.label || "").toLowerCase().includes(query) || pageGroup(item, site).label.toLowerCase().includes(query));
      if (!items.length) continue;
      const group = document.createElement("details"); group.className = "site-group"; group.dataset.site = site;
      group.open = !!query || opened.has(site) || (site === location.hostname && !$("all-records").children.length);
      const summary = document.createElement("summary"); summary.append(document.createTextNode(site));
      const count = document.createElement("span"); count.textContent = items.length + " 项"; summary.append(count);
      const records = document.createElement("div"); records.className = "site-records";
      const head = document.createElement("div"); head.className = "libraryhead";
      const label = document.createElement("label"); label.className = "toggle";
      const input = document.createElement("input"); input.type = "checkbox"; input.setAttribute("aria-label", "全部启用 " + site);
      bulkToggle(input, profile, site); label.append(input, document.createTextNode("全部启用")); head.append(label);
      const pageRecords = document.createElement("div"); renderPageGroups(pageRecords, items, site, pages);
      records.append(head, pageRecords); group.append(summary, records); groups.push(group);
    }
    $("all-records").replaceChildren(...groups);
    if (!groups.length) $("all-records").append(emptySkeleton(query ? "没有匹配的保存记录" : "暂无网站记录"));
    ui.syncControls();
  }
  function editSaved(id) {
    syncPage();
    const item = state.profile.rules.find(rule => rule.id === id);
    if (!item) return { ok: false, error: "这条设置已被删除。" };
    if (!localItem(item, site)) return { ok: false, error: "这条设置属于其他页面，请到保存时的网页调整。" };
    const first = layersOf(item).find(rule => rule.level === 1) || item;
    const element = P.queryRule(first)[0];
    if (!element) return { ok: false, error: "当前页面没有这项内容，请打开保存时的页面再调整。" };
    lock(candidateFor(first, element), item); return { ok: true };
  }
  function renderEditor() {
    const d = state.draft; layout();
    renderThumbnail();
    if (!d) { ui.syncControls(); return; }
    const font = d.mode === "font";
    $("selection-title").textContent = state.selected.label;
    $("name").value = state.session.name; $("name").placeholder = state.session.defaultLabel;
    $("size-label").textContent = font ? "文字字号" : "整体缩放"; $("unit").textContent = font ? "px" : "%";
    $("mode-scale").setAttribute("aria-pressed", !font); $("mode-font").setAttribute("aria-pressed", font);
    for (const input of [$("range"), $("number")]) { input.min = font ? "8" : "10"; input.max = font ? "64" : "200"; input.value = d.value; }
    $("min-label").textContent = font ? "8px" : "10%"; $("max-label").textContent = font ? "64px" : "200%"; $("similar").checked = !!d.similar;
    $("presets").replaceChildren(...(font ? [14, 18, 22, 28, 36] : [25, 50, 75, 100, 150]).map(value => {
      const button = document.createElement("button"); button.textContent = value + (font ? "px" : "%"); button.dataset.value = value; button.onclick = () => setValue(value); return button;
    }));
    renderLevels(); updateEditorValue();
  }
  function renderThumbnail() {
    const session = state.session, source = session?.entries.get(session.current)?.thumbnail || "";
    $("editor-thumbnail-button").hidden = !source;
    if (source) $("editor-thumbnail").src = source;
    else $("editor-thumbnail").removeAttribute("src");
  }
  function updateEditorValue() {
    const d = state.draft; if (!d) return;
    $("delete-content").textContent = d.hidden ? "恢复选中内容" : "删除选中内容";
    $("delete-content").setAttribute("aria-pressed", !!d.hidden);
    $("range").value = d.value; $("number").value = d.value; $("range").setAttribute("aria-valuetext", d.value + (d.mode === "font" ? " 像素" : "%"));
    for (const button of $("presets").children) { const active = Number(button.dataset.value) === d.value; button.classList.toggle("active", active); button.setAttribute("aria-pressed", active); }
    const step = d.mode === "font" ? 1 : 5, min = d.mode === "font" ? 8 : 10, max = d.mode === "font" ? 64 : 200;
    const lower = Math.max(min, (Math.ceil(d.value / step) - 1) * step), upper = Math.min(max, (Math.floor(d.value / step) + 1) * step);
    for (const [id, value] of [["round-down", lower], ["round-up", upper]]) {
      const button = $(id); button.textContent = value + (d.mode === "font" ? "px" : "%"); button.dataset.value = value;
      button.setAttribute("aria-label", (id === "round-down" ? "向下取整到 " : "向上取整到 ") + value + (d.mode === "font" ? " 像素" : "%"));
      button.disabled = value === d.value;
    }
    $("count").textContent = P.queryRule(d).length + " 处";
  }
  function clearSelection() {
    if (chrome.runtime.id && state.session?.snapshot) chrome.runtime.sendMessage({ type: "POINT_RESIZE_RELEASE_SNAPSHOT", snapshotId: state.session.snapshot }).catch(() => {});
    state.session = null; state.draft = null; state.selected = null; state.dirty = false;
    $("outline").hidden = true; relatedOutlines.forEach(outline => { outline.hidden = true; }); renderEditor();
  }
  function setValue(value) {
    if (!state.draft) return;
    const font = state.draft.mode === "font";
    state.draft.value = Math.round(Math.max(font ? 8 : 10, Math.min(font ? 64 : 200, Number(value) || (font ? 8 : 10))));
    syncAliases(state.draft);
    state.dirty = true; updateEditorValue(); renderLevels(); apply(); status();
  }
  function syncAliases(rule) {
    if (!state.session) return;
    for (const entry of allEntries(state.session)) if (signature(entry.rule) === signature(rule)) {
      entry.rule.value = rule.value; entry.rule.defaultValue = rule.defaultValue;
      entry.rule.hidden = !!rule.hidden;
    }
  }
  function setMode(mode) {
    const s = state.session; if (!s || !state.draft || !["scale", "font"].includes(mode)) return;
    // A text-node selection has no layout box. Whole-region scaling targets its
    // containing element, leaving the text layer's independent draft intact.
    if (mode === "scale" && state.selected.textAnchor) {
      const previous = state.draft;
      stepLevel(-1);
      if (state.draft === previous || state.selected.textAnchor) return;
    }
    const entry = s.entries.get(s.current), rule = entry.rule;
    if (rule.mode === mode) { renderEditor(); return; }
    const oldSignature = signature(rule);
    const aliases = allEntries(s).filter(other => signature(other.rule) === oldSignature);
    const fontSize = Math.max(8, Math.min(64, Math.round(parseFloat(getComputedStyle(entry.candidate.element).fontSize)) || 16));
    const nextSignature = signature({ ...rule, mode });
    const target = allEntries(s).find(other => signature(other.rule) === nextSignature)?.rule;
    const restored = target || entry.modeValues?.[mode] || { value: mode === "scale" ? 100 : fontSize, defaultValue: mode === "scale" ? 100 : fontSize };
    for (const other of aliases) {
      other.modeValues ||= {};
      other.modeValues[other.rule.mode] = { value: other.rule.value, defaultValue: other.rule.defaultValue };
      other.rule.mode = mode; other.rule.value = restored.value; other.rule.defaultValue = restored.defaultValue;
    }
    syncAliases(rule);
    state.dirty = true; forceMeasure = true; renderEditor(); apply(); status();
  }
  function resetLevel(level) {
    const entry = state.session?.entries.get(level); if (!entry) return;
    entry.rule.value = entry.rule.mode === "scale" ? 100 : entry.rule.defaultValue;
    entry.rule.hidden = false;
    syncAliases(entry.rule);
    state.dirty = true; updateEditorValue(); renderLevels(); apply();
    status();
  }
  function setPicking(picking) {
    hoverPreview.close();
    if (picking) syncPage();
    state.picking = picking; $("choose").classList.toggle("choosing", picking); $("tip").hidden = !picking;
    $("choose-label").textContent = picking ? "正在选取 · 点击取消" : "选择网页内容";
    if (picking) { state.view = "edit"; clearSelection(); apply(); state.candidates = []; state.point = null; status(); }
    else { if (!state.session) state.selected = null; draw(); }
    layout();
  }
  function makeEntry(candidate, level, saved) {
    const font = candidate.kind === "text";
    const value = font ? Math.max(8, Math.min(64, Math.round(parseFloat(getComputedStyle(candidate.textNode?.parentElement || candidate.element).fontSize)) || 16)) : 100;
    return { candidate, thumbnail: "", capture: null, rule: saved ? { defaultValue: value, ...saved, level } : {
      id: uid(), level, ...P.locatorFor(candidate.element, true), kind: candidate.kind, label: candidate.label,
      mode: font ? "font" : "scale", value, defaultValue: value, similar: true, ...(candidate.textAnchor ? { textAnchor: candidate.textAnchor } : {})
    } };
  }
  function switchLevel(level) {
    const s = state.session, candidate = s?.levels.get(level);
    if (!candidate?.element?.isConnected) { status("这个层级已经变化，请重新选取。", true); return; }
    if (s.allEntries.size >= 100 && !allEntries(s).some(entry => entry.rule.level === level && P.sameCandidate(entry.candidate, candidate))) { status("这一项已暂存 100 个元素，请先保存。", true); return; }
    if (!s.entries.has(level) || !P.sameCandidate(s.entries.get(level).candidate, candidate)) s.entries.set(level, entryFor(s, candidate, level));
    s.current = level; const entry = s.entries.get(level); state.selected = entry.candidate; state.draft = entry.rule;
    renderEditor(); apply(); queueThumbnail(s, entry); status();
  }
  function lock(candidate, saved) {
    syncPage();
    if (!candidate?.element?.isConnected) return;
    clearSelection();
    const targetSignature = signature({ ...P.locatorFor(candidate.element, true), mode: candidate.kind === "text" ? "font" : "scale", textAnchor: candidate.textAnchor });
    const existing = saved || state.profile.rules.find(item => localItem(item, site) && layersOf(item).some(rule => signature(rule) === targetSignature));
    const s = { baseRule: existing ? structuredClone(existing) : null, id: existing?.id || uid(), pageURL: location.href, name: existing?.name || "", defaultLabel: existing?.defaultLabel || candidate.label, thumbnail: existing?.thumbnail || "", levels: P.hierarchy(candidate, state.point, ui.host), entries: new Map(), allEntries: new Map(), peerGroups: [], current: 1 };
    if (existing) {
      for (const rule of layersOf(existing)) {
        const element = P.queryRule(rule)[0]; if (!element) continue;
        const level = rule.level || 1, target = candidateFor(rule, element);
        const entry = entryFor(s, target, level, rule); entry.thumbnail = s.thumbnail;
        if (!s.entries.has(level) || existing.branchSelection?.[level] === rule.id) { s.levels.set(level, target); s.entries.set(level, entry); }
      }
    }
    if (!s.entries.has(1)) s.entries.set(1, entryFor(s, candidate, 1));
    s.origin = allEntries(s).find(entry => entry.rule.level === 1);
    if (!P.sameCandidate(s.entries.get(1).candidate, candidate)) {
      const target = s.entries.get(1).candidate, r = rectFor(target);
      s.levels = P.hierarchy(target, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, ui.host);
      for (const [level, entry] of s.entries) s.levels.set(level, entry.candidate);
    }
    state.view = "edit"; state.session = s; state.dirty = !existing; state.picking = false; setPicking(false); switchLevel(1);
  }
  function stepLevel(direction) {
    const s = state.session; if (!s) return;
    const order = [...s.levels.keys()].sort((a, b) => b - a), index = order.indexOf(s.current), target = order[index + direction];
    if (target !== undefined) switchLevel(target);
  }
  const shiftLevel = (level, shift) => { const rank = (level > 0 ? level - 1 : level) + shift; return rank >= 0 ? rank + 1 : rank; };
  function stepSibling(direction) {
    const s = state.session; if (!s) return;
    const previous = s.entries.get(s.current), group = peerGroup(s, previous.candidate, s.current);
    const index = group.options.findIndex(peer => P.sameCandidate(peer, previous.candidate));
    const candidate = group.options[index + direction]; if (!candidate?.element.isConnected) return;
    const existing = allEntries(s).find(entry => entry.rule.level === s.current && P.sameCandidate(entry.candidate, candidate));
    const reserve = (existing ? 0 : 1) + [...s.entries.keys()].filter(level => level < s.current && !s.allEntries.has(existing?.rule.childSelection?.[level])).length;
    if (s.allEntries.size + reserve > 100) { status("这一项暂存的元素较多，请先保存后继续。", true); return; }
    previous.rule.childSelection = Object.fromEntries([...s.entries].filter(([level]) => level < s.current).map(([level, entry]) => [level, entry.rule.id]));
    const entry = entryFor(s, candidate, s.current);
    if (!existing) {
      entry.rule.similar = previous.rule.similar;
      delete entry.rule.shadowPath; Object.assign(entry.rule, P.locatorFor(candidate.element, entry.rule.similar));
      const alias = allEntries(s).find(other => other !== entry && signature(other.rule) === signature(entry.rule));
      if (alias) { entry.rule.value = alias.rule.value; entry.rule.defaultValue = alias.rule.defaultValue; entry.rule.hidden = !!alias.rule.hidden; }
    }
    const lower = [...s.entries.keys()].filter(level => level < s.current);
    for (const level of [...s.levels.keys()]) if (level < s.current) s.levels.delete(level);
    s.levels.set(s.current, candidate); s.entries.set(s.current, entry);
    const r = rectFor(candidate), point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    for (const [relative, child] of P.hierarchy(candidate, point, ui.host)) if (relative < 1) {
      const level = shiftLevel(s.current, relative);
      if (level >= -12) s.levels.set(level, child);
    }
    for (const level of lower) {
      const remembered = s.allEntries.get(entry.rule.childSelection?.[level]);
      if (remembered?.candidate.element.isConnected) { s.levels.set(level, remembered.candidate); s.entries.set(level, remembered); continue; }
      if (s.levels.has(level)) {
        const child = entryFor(s, s.levels.get(level), level); s.entries.set(level, child);
      }
      else s.entries.delete(level);
    }
    state.selected = entry.candidate; state.draft = entry.rule; state.dirty = true;
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) candidate.element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    renderEditor(); apply(); queueThumbnail(s, entry); status();
  }
  async function open(options = {}) {
    videoPage?.cancelPicking();
    await ready; state.autoEnabled = options.autoEnabled !== false; state.visible = true; state.tab = "resize";
    if (options.zoomFactor) ui.setPageZoom(options.zoomFactor);
    $("panel").hidden = false; ui.show(); $("site").textContent = location.hostname || "本地体验页";
    setPicking(false); clearSelection(); state.view = "current"; apply(); renderRules(true); status();
  }
  function close() {
    hoverPreview.close();
    if (state.desktopPanel) chrome.runtime.sendMessage({ type: "POINT_RESIZE_PANEL_CLOSE", documentId: globalThis.PointResizePanelBridge?.documentId }).catch(() => {});
    videoPage?.cancelPicking(); state.visible = false; setPicking(false); clearSelection(); apply(); $("panel").hidden = true; ui.hide();
  }

  function snapshotGeometry(candidate) {
    const raw = rectFor(candidate);
    const clip = r => {
      const x = Math.max(0, r.left), y = Math.max(0, r.top);
      return { x, y, width: Math.max(0, Math.min(innerWidth, r.right) - x), height: Math.max(0, Math.min(innerHeight, r.bottom) - y) };
    };
    let context = raw, parent = P.parentOf(candidate.element);
    for (let i = 0; parent && i < 2; i++, parent = P.parentOf(parent)) {
      if (parent === document.body || parent === document.documentElement) break;
      const r = parent.getBoundingClientRect();
      if (r.width >= raw.width && r.height >= raw.height) context = r;
    }
    return { target: clip(raw), rect: clip({ left: context.left - 24, top: context.top - 24, right: context.right + 24, bottom: context.bottom + 24 }) };
  }
  async function queueThumbnail(session, entry, saving = false) {
    if (entry.thumbnail || entry.capture) return entry.capture;
    // An edited record already has its preview. Newly explored layers wait for
    // Save before taking a new base image, so changing scope never hides the UI.
    if (session.thumbnail && !session.snapshot && !saving) return;
    const task = async () => {
      if (state.session !== session || !entry.candidate.element.isConnected || !chrome.runtime.id) return;
      const geometryKey = candidate => candidate.textAnchor ? "text:" + candidate.textAnchor.index : "element";
      const cached = () => session.snapshotGeometry?.get(entry.candidate.element)?.get(geometryKey(entry.candidate));
      // New branches that were not present in the original snapshot wait until
      // Save rather than flashing the panel or showing another element's image.
      if (session.snapshot && !cached()) {
        if (!saving) return;
        if (session.snapshot !== "unavailable") await chrome.runtime.sendMessage({ type: "POINT_RESIZE_RELEASE_SNAPSHOT", snapshotId: session.snapshot }).catch(() => {});
        session.snapshot = null;
      }
      const fresh = !session.snapshot;
      if (fresh) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 600 - (Date.now() - lastCapture))));
        if (state.session !== session) return;
        session.snapshotGeometry = new WeakMap();
        const seeds = [...session.levels.values(), ...allEntries(session).map(entry => entry.candidate)];
        for (const candidate of seeds.flatMap(candidate => [candidate, ...P.siblingsOf(candidate, ui.host)])) {
          if (!session.snapshotGeometry.has(candidate.element)) session.snapshotGeometry.set(candidate.element, new Map());
          const geometries = session.snapshotGeometry.get(candidate.element), key = geometryKey(candidate);
          if (!geometries.has(key)) geometries.set(key, snapshotGeometry(candidate));
        }
        session.viewport = { width: innerWidth, height: innerHeight };
      }
      const geometry = cached();
      if (!geometry || geometry.rect.width < 1 || geometry.rect.height < 1 || geometry.target.width < 1 || geometry.target.height < 1) return;
      const before = { x: scrollX, y: scrollY };
      if (fresh) ui.host.style.setProperty("visibility", "hidden", "important");
      try {
        if (fresh) { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); lastCapture = Date.now(); }
        const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_CAPTURE", thumbnail: true, snapshotId: session.snapshot, ...geometry, viewport: session.viewport });
        if (state.session === session && result?.ok) {
          session.snapshot = result.snapshotId;
          if (thumbnailOK(result.dataURL) && (!fresh || (scrollX === before.x && scrollY === before.y))) entry.thumbnail = result.dataURL;
        } else if (fresh) session.snapshot = "unavailable";
      } catch { if (fresh) session.snapshot = "unavailable"; /* Preview failure does not prevent saving the settings. */ }
      finally { if (fresh) ui.host.style.removeProperty("visibility"); if (state.session === session) renderThumbnail(); draw(); }
    };
    entry.capture = captureQueue.then(task).finally(() => { entry.capture = null; });
    captureQueue = entry.capture.catch(() => {});
    return entry.capture;
  }

  $("close").onclick = close; $("choose").onclick = () => state.picking ? finishEdit("已退出选取。") : setPicking(true);
  function selectTab(tab) {
    if (tab === state.tab) return;
    hoverPreview.close();
    videoPage?.cancelPicking();
    state.tab = tab;
    if (state.picking) setPicking(false);
    if (tab === "videos") videoPage?.refresh();
    layout(); draw();
  }
  for (const tab of ["resize", "videos", "settings"]) {
    $("tab-" + tab).onclick = () => selectTab(tab);
    $("tab-" + tab).onkeydown = event => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const tabs = ["resize", "videos", "settings"];
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === "ArrowUp" ? 2 : 1)) % tabs.length];
      selectTab(next); $("tab-" + next).focus();
    };
  }
  $("cancel-edit").onclick = () => finishEdit();
  $("delete-content").onclick = async () => {
    const s = state.session, entry = s?.entries.get(s.current);
    if (!entry) return;
    const hidden = !entry.rule.hidden;
    $("delete-content").disabled = true;
    try {
      // Keep the selected content in its preview before removing it from layout.
      if (hidden) await queueThumbnail(s, entry, true).catch(() => {});
      if (state.session !== s || state.draft !== entry.rule) return;
      entry.rule.hidden = hidden; syncAliases(entry.rule);
      state.dirty = true; updateEditorValue(); renderLevels(); apply(); status();
    } finally { $("delete-content").disabled = false; }
  };
  const showEditorPreview = () => { const source = $("editor-thumbnail").getAttribute("src"); if (source) ui.showPreview(source, state.session?.name.trim() || state.session?.defaultLabel || "区域截图", $("editor-thumbnail-button")); };
  $("editor-thumbnail-button").onclick = showEditorPreview;
  $("all-back").onclick = () => { state.view = state.session || state.picking ? "edit" : "current"; renderRules(); status(); };
  function backupStatus(message, error = false) {
    $("backup-status").textContent = message; $("backup-status").className = "status" + (error ? " error" : ""); ui.syncControls();
  }
  async function backupRequest(type, text) {
    await profileWrites;
    if (chrome.runtime.id) {
      const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_BACKUP_" + type, text });
      if (!result?.ok) throw new Error(result?.error || "操作失败，请重新加载扩展并刷新网页。");
      return result;
    }
    const current = await chrome.storage.local.get(null);
    if (type === "EXPORT") return { backup: PointResizeBackup.create(current) };
    const incoming = PointResizeBackup.parse(text);
    await chrome.storage.local.set(PointResizeBackup.merge(current, incoming));
    return { summary: PointResizeBackup.counts(incoming) };
  }
  async function backupTask(action) {
    $("backup-export").disabled = $("backup-import").disabled = true; $("all-records").inert = true;
    try { await action(); }
    catch (error) { backupStatus("操作失败：" + error.message, true); }
    finally { $("backup-export").disabled = $("backup-import").disabled = false; $("all-records").inert = false; }
  }
  $("backup-export").onclick = () => backupTask(async () => {
    backupStatus("正在生成备份…");
    const { backup } = await backupRequest("EXPORT");
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url;
    const now = new Date(), pad = value => String(value).padStart(2, "0");
    anchor.download = "点选缩放-设置备份-" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + ".json";
    ui.root.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    backupStatus("已生成备份：" + PointResizeBackup.counts(backup.data) + "。请保存下载文件。");
  });
  $("backup-import").onclick = () => { $("backup-file").value = ""; $("backup-file").click(); };
  $("backup-file").onchange = () => {
    const file = $("backup-file").files[0]; if (!file) return;
    backupTask(async () => {
      backupStatus("正在检查并导入备份…");
      if (file.size > PointResizeBackup.maxBytes) throw new Error("备份文件不能超过 16 MB。");
      const text = await file.text(); PointResizeBackup.parse(text);
      const result = await backupRequest("IMPORT", text);
      await loadAll(); backupStatus("已导入合并：" + result.summary + "。其他记录已保留。");
    });
  };
  $("site-search").oninput = renderAll;
  $("range").oninput = event => setValue(event.target.value); $("number").onchange = event => setValue(event.target.value);
  $("scope-up").onclick = () => stepLevel(-1); $("scope-down").onclick = () => stepLevel(1);
  $("mode-scale").onclick = () => setMode("scale"); $("mode-font").onclick = () => setMode("font");
  $("sibling-prev").onclick = () => stepSibling(-1); $("sibling-next").onclick = () => stepSibling(1);
  for (const id of ["round-down", "round-up"]) $(id).onclick = () => setValue($(id).dataset.value);
  $("name").oninput = event => { if (state.session) { state.session.name = event.target.value.slice(0, 60); state.dirty = true; } };
  $("similar").onchange = event => {
    if (!state.draft) return;
    const old = signature(state.draft), enabled = event.target.checked;
    const locator = P.locatorFor(state.selected.element, enabled);
    const targetSignature = signature({ ...state.draft, shadowPath: undefined, ...locator });
    for (const entry of allEntries(state.session)) {
      const reusable = signature({ ...entry.rule, shadowPath: undefined, ...P.locatorFor(entry.candidate.element, true) });
      if ((!enabled && signature(entry.rule) === old) || (enabled && reusable === targetSignature)) {
        entry.rule.similar = enabled; delete entry.rule.shadowPath;
        Object.assign(entry.rule, P.locatorFor(entry.candidate.element, enabled));
        if (enabled) { entry.rule.value = state.draft.value; entry.rule.defaultValue = state.draft.defaultValue; entry.rule.hidden = !!state.draft.hidden; }
      }
    }
    state.dirty = true; updateEditorValue(); apply();
  };
  $("save").onclick = async () => {
    if (syncPage()) return;
    const s = state.session; if (!s || !state.draft) return;
    $("save").disabled = true; $("editor").inert = true; $("level-rail").inert = true; status("正在保存…");
    const previous = structuredClone(state.profile);
    try {
      const entries = allEntries(s), preferred = entries.filter(entry => changed(entry.rule)).sort((a, b) => b.rule.level - a.rule.level)[0] || s.entries.get(s.current);
      for (const [level, entry] of s.entries) entry.rule.childSelection = Object.fromEntries([...s.entries].filter(([child]) => child < level).map(([child, childEntry]) => [child, childEntry.rule.id]));
      if (entries.length > 100) throw new Error("每项最多保存 100 个元素，请分开保存。");
      await queueThumbnail(s, preferred, true);
      syncPage();
      if (state.session !== s) return;
      const first = s.origin.rule;
      const defaultLabel = preferred.candidate.label || s.defaultLabel;
      const item = { ...first, id: s.id, label: s.name.trim() || defaultLabel, name: s.name, defaultLabel, enabled: true,
        pageURL: s.pageURL, layers: entries.map(entry => ({ ...entry.rule })), branchSelection: Object.fromEntries([...s.entries].map(([level, entry]) => [level, entry.rule.id])), thumbnail: preferred.thumbnail || entries.find(entry => entry.thumbnail)?.thumbnail || s.thumbnail || "" };
      state.profile.rules = state.profile.rules.filter(rule => rule.id !== s.id); state.profile.rules.push(item);
      if (state.profile.rules.length > 100) throw new Error("最多保存 100 项，请先删除不用的设置。");
      await persist(item, s.baseRule); finishEdit("");
      status(state.autoEnabled ? "已保存。" : "已保存。允许此网站权限后可自动应用。");
    } catch (error) { state.profile = previous; apply(); renderRules(); status("保存失败：" + error.message, true); }
    finally { $("save").disabled = false; $("editor").inert = false; $("level-rail").inert = false; }
  };
  $("manage").onclick = () => {
    if (state.picking) setPicking(false);
    state.view = "all"; $("site-search").value = ""; $("all-records").replaceChildren();
    layout(); status(); loadAll();
  };
  const inUI = event => event.composedPath().includes(ui.host);
  function inspectPoint() {
    state.frame = 0; if (!state.picking || !state.point) return;
    state.candidates = P.inspectAt(state.point.x, state.point.y, ui.host); state.selected = state.candidates[0] || null; draw();
  }
  function move(event) {
    if (!state.picking || inUI(event)) return;
    state.point = { x: event.clientX, y: event.clientY }; if (!state.frame) state.frame = requestAnimationFrame(inspectPoint);
  }
  for (const type of ["pointermove", "mousemove", "pointerover", "mouseover"]) window.addEventListener(type, move, { capture: true, passive: true });
  window.addEventListener("pointerdown", event => {
    if (!state.picking || inUI(event) || event.button !== 0) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  window.addEventListener("click", event => {
    if (!state.picking || inUI(event)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (state.frame) cancelAnimationFrame(state.frame);
    state.point = { x: event.clientX, y: event.clientY }; inspectPoint();
    if (state.selected) lock(state.selected); else status("这里没有可调整的内容，请换个位置。", true);
  }, true);
  window.addEventListener("keydown", event => {
    if (!state.visible) return;
    if (event.key === "Enter" && state.picking && state.selected && !inUI(event)) { event.preventDefault(); event.stopImmediatePropagation(); lock(state.selected); return; }
    if (event.key !== "Escape") return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (ui.closePreview()) return;
    if (state.tab !== "resize") { selectTab("resize"); return; }
    if (state.view === "all") $("all-back").click();
    else if (state.view === "edit") finishEdit(); else close();
  }, true);
  window.addEventListener("scroll", () => { if (state.visible) draw(); }, { capture: true, passive: true });
  window.addEventListener("resize", () => { draw(); scheduleRefresh(true); }, { passive: true });
  for (const type of ["popstate", "hashchange", "pageshow"]) window.addEventListener(type, syncPage);
  window.navigation?.addEventListener("navigatesuccess", syncPage);
  // pushState in a page's main world cannot be patched from an isolated script.
  // Also detect silent history changes without injecting scripts or permissions.
  setInterval(syncPage, 250);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[key]) {
      const editingSaved = state.profile.rules.some(item => item.id === state.session?.id);
      state.profile = sanitizeProfile(changes[key].newValue || {});
      if (editingSaved && !state.profile.rules.some(item => item.id === state.session?.id && item.enabled !== false)) {
        const all = state.view === "all"; clearSelection(); if (!all) state.view = "current";
      }
      apply(); if (state.visible) renderRules();
    }
    if (state.visible && state.view === "all" && Object.keys(changes).some(name => name.startsWith("point-resize:v1:"))) loadAll();
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if(message.type==='POINT_RESIZE_PREVIEW_ACCESS'){previewAccess=message.allowed===true;if(!previewAccess)hoverPreview.close();respond({ok:true});return;}
    if (message.type === "POINT_RESIZE_ZOOM") { ui.setPageZoom(message.zoomFactor); draw(); return; }
    if (message.type === "POINT_RESIZE_EDIT_SAVED") { open(message).then(() => respond(editSaved(message.id)), error => respond({ ok: false, error: error.message })); return true; }
    if (message.type !== "POINT_RESIZE_SHOW") return;
    open(message).then(() => respond({ ok: true }), error => respond({ ok: false, error: error.message })); return true;
  });
  if (chrome.runtime.id) chrome.runtime.sendMessage({ type: "POINT_RESIZE_GET_ZOOM" }).then(result => { if (result?.ok) ui.setPageZoom(result.zoomFactor); }).catch(() => {});
  if (!chrome.runtime.id) window.addEventListener("message", event => {
    if (event.origin === location.origin && event.data?.type === "POINT_RESIZE_DEMO_EDIT") open().then(() => editSaved(event.data.id));
  });
  // The page owns DOM selections and drafts; the desktop panel only sends UI events.
  globalThis.PointResizeApp = { open, close, ready, ui, state, selectTab,
    resume() { state.visible = true; $("panel").hidden = false; ui.show(); layout(); draw(); },
    suspend() { hoverPreview.close();videoPage?.cancelPicking(); setPicking(false); state.visible = false; draw(); },
    importBackup(text) { return backupTask(async () => {
      PointResizeBackup.parse(text); const result = await backupRequest("IMPORT", text);
      await loadAll(); backupStatus("已导入合并：" + result.summary + "。其他记录已保留。");
    }); }
  };
})();
