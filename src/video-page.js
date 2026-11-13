(() => {
  if (globalThis.PointResizeVideos) return;
  const D = globalThis.PointResizeVideoData;
  const css = `
    .vq-watch{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:var(--button-danger,#b44242);vertical-align:middle}
    .vq-view{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0}.vq-list[data-titles="collapsed"] .vq-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .video-page{padding:14px;min-height:260px}.vq-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}.vq-heading h2{font-size:15px;margin:0}.vq-count{font-size:12px;color:#667873}.vq-note{font-size:12px;line-height:var(--content-line-height,1.6);color:#667873;margin:8px 0 12px}.vq-actions{display:flex;gap:8px;margin:8px 0}.vq-actions button{flex:1}.vq-form{margin:14px 0}.vq-form label{display:block;font-size:12px;color:#476456;margin-bottom:6px}.vq-input-row{display:flex;gap:6px}.vq-input-row input{min-width:0;width:100%;border:1px solid #bccfc5;border-radius:7px;padding:8px;background:white;color:#293c38;font-size:12px}.vq-add{flex:none}.vq-list{padding:0;margin:0;list-style:none}.vq-row{display:flex;gap:10px;padding:12px 0;border-top:1px solid #dce6e1;align-items:flex-start}.vq-art{width:68px;height:44px;object-fit:cover;border-radius:6px;background:#edf4f1;flex:none;display:grid;place-items:center;color:#376859}.vq-copy{min-width:0;flex:1}.vq-title{font-size:12px;font-weight:600;line-height:var(--content-line-height,1.6);overflow-wrap:anywhere;margin:0}.vq-meta{font-size:11px;color:#667873;margin:3px 0}.vq-row-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.vq-row-actions a{color:#376859;font-size:12px;text-decoration:none}.vq-row[aria-current=true]{background:#f0f6f2;border-radius:6px}.vq-empty{padding:22px 12px;text-align:center;background:#f3f7f4;border:1px dashed #bccfc5;border-radius:9px;color:#476456;font-size:12px;line-height:var(--content-line-height,1.6)}.vq-status{font-size:12px;color:#376859;line-height:var(--content-line-height,1.6);overflow-wrap:anywhere;margin:8px 0}.vq-status:empty{display:none}.vq-status.error{color:#b44242}
  `;
  const template = `
    <div class="vq-heading"><h2>视频待看</h2><span class="vq-count" id="vq-count">0 条</span></div>
    <div class="vq-actions"><button class="primary" id="vq-pick" type="button" aria-pressed="false">点选网页视频加入</button></div>
    <div class="vq-actions"><button id="vq-current" type="button">收藏当前页视频／直播</button></div><p class="vq-note">支持 B站视频／番剧影视、虎牙直播；影视小窗播放受来源限制，已看需手动标记</p>
    <details class="disclosure-card vq-add-card" id="vq-add-card"><summary>粘贴链接加入</summary><form class="vq-form" id="vq-form"><label for="vq-url">B站视频／虎牙直播间／视频直链</label><div class="vq-input-row"><input id="vq-url" type="url" required placeholder="B站视频、虎牙房间、MP4 / WebM" autocomplete="off"><button class="vq-add" type="submit">加入</button></div></form></details>
    <p class="vq-status" id="vq-status" role="status" aria-live="polite"></p>
    <div class="vq-actions"><button class="textbutton danger" id="vq-clear-watched" type="button" disabled>清除已看视频</button></div>
    <div class="vq-view" role="group" aria-label="标题显示方式"><span>标题</span><button class="textbutton" id="vq-title-expanded" type="button" aria-pressed="true">展开</button><button class="textbutton" id="vq-title-collapsed" type="button" aria-pressed="false">收起</button></div>
    <div class="provider-tabs" id="vq-platforms" role="tablist" aria-label="按平台筛选"><button class="provider-tab" id="vq-platform-all" type="button" role="tab" aria-selected="true" aria-controls="vq-list" tabindex="0" data-provider="all">全部</button><button class="provider-tab" id="vq-platform-bilibili" type="button" role="tab" aria-selected="false" aria-controls="vq-list" tabindex="-1" data-provider="bilibili">B站</button><button class="provider-tab" id="vq-platform-huya" type="button" role="tab" aria-selected="false" aria-controls="vq-list" tabindex="-1" data-provider="huya">虎牙</button><button class="provider-tab" id="vq-platform-other" type="button" role="tab" aria-selected="false" aria-controls="vq-list" tabindex="-1" data-provider="other">其他</button></div>
    <ul class="vq-list" id="vq-list" aria-label="待看视频列表"></ul>
  `;
  let demoWrites = Promise.resolve();
  async function request(type, args = {}) {
    if (chrome.runtime.id) {
      const result = await chrome.runtime.sendMessage({ type: "VIDEO_QUEUE_" + type, ...args });
      if (!result?.ok) throw new Error(result?.error || "操作失败，请重新加载扩展并刷新网页。");
      return result;
    }
    const result = demoWrites.then(async () => {
      if(type==="VIEW"){const view={titles:D.titleMode(args.mode)};await chrome.storage.local.set({[D.viewKey]:view});return {ok:true,view};}
      const data = await chrome.storage.local.get(D.key), items = D.clean(data[D.key]);
      let duplicate = false;
      if (type === "ADD") {
        const value = D.queueItem(args.item); duplicate = items.some(item => item.id === value.id);
        if (!duplicate) { if (items.length >= 200) throw new Error("待看列表已满。"); items.unshift(value); }
      } else if (type === "REMOVE") { const index = items.findIndex(item => item.id === args.id); if (index >= 0) items.splice(index, 1); }
      else if (type === "WATCH") D.watch(items, args.id, args.watched);
      else if (type === "CLEAR_WATCHED") D.clearWatched(items);
      await chrome.storage.local.set({ [D.key]: items });
      return { ok: true, items, duplicate };
    });
    demoWrites = result.catch(() => {}); return result;
  }
  function currentItem() {
    const canonical=document.querySelector('link[rel="canonical"]')?.href;
    let url=location.href;try{if(canonical&&new URL(canonical).origin===location.origin){const value=D.parse(canonical);if(value.kind==='live'||value.category==='bangumi')url=canonical;}}catch{}
    const parsed = D.candidate(url);
    const title = document.querySelector('meta[property="og:title"]')?.content || document.querySelector("h1")?.textContent || document.title;
    const cover = document.querySelector('meta[property="og:image"]')?.content;
    return { ...parsed, title: title.replace(/[_-]哔哩哔哩.*$/, "").trim(), cover };
  }
  const parentOf = element => element.parentElement || element.getRootNode().host || null;
  function pauseSource(item){
    if(item?.kind!=="live")return;
    try{if(currentItem().id!==item.id)return;for(const root of PointResizePicker.openRoots())for(const video of root.querySelectorAll('video'))video.pause();}catch{}
  }
  function elementVideo(node) {
    try {
      if (node.matches("video")) {
        const value=D.item({ kind: "media", mediaUrl: node.srcObject ? "" : node.currentSrc || node.src || node.querySelector("source[src]")?.src || "",
        sourceUrl: location.href, locator: PointResizePicker.locatorFor(node, false),
        title: node.getAttribute("title") || node.getAttribute("aria-label") || document.querySelector('meta[property="og:title"]')?.content || document.title,
        cover: node.poster });
        if(value.dependent){
          try{const live=currentItem();if(live.kind==='live')return {...D.item(live),link:node};}catch{}
          // An enclosing supported link identifies this preview without guessing
          // that an unrelated neighbouring stream belongs to the same video.
          for(let parent=parentOf(node),depth=0;parent&&depth<6;parent=parentOf(parent),depth++)if(parent.matches('a[href]')){try{return {...D.item({url:new URL(parent.getAttribute('href'),parent.baseURI).href,title:parent.getAttribute('title')||parent.textContent.trim(),cover:node.poster}),link:parent};}catch{}break;}
        }
        return {...value,link:node};
      }
      if (node.matches("a[href],area[href],iframe[src]")) {
        const url = new URL(node.getAttribute(node.matches("iframe") ? "src" : "href"), node.baseURI);
        return { ...D.candidate(url.href), link: node };
      }
    } catch { /* Only actual media sources and supported embedded video IDs qualify. */ }
    return null;
  }
  // Inspect only the nearest matching region, including open web components.
  // Never fall back to collecting every link on the page.
  function regionAt(target, host) {
    const collect = scope => {
      const found = new Map(), stack = [scope];
      let visited = 0, skipped = 0;
      while (stack.length) {
        const node = stack.pop();
        if (node === host) continue;
        if (++visited > 1500) return null;
        const value = elementVideo(node);
        if (value?.dependent) skipped++;
        else if (value && !found.has(value.id)) found.set(value.id, value);
        const children = [...node.children, ...(node.shadowRoot?.children || [])];
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
      }
      return { items: [...found.values()], skipped };
    };
    // A click on a link (or text/image inside it) is an explicit single choice.
    for (let node = target; node && node !== host && !/^(BODY|HTML|MAIN)$/.test(node.tagName); node = parentOf(node)) {
      if (!node.matches("a[href],video,iframe[src]")) continue;
      const result = collect(node);
      if (result && (result.items.length || result.skipped)) return { element: node, ...result };
    }
    for (let node = target; node && node !== host && !/^(BODY|HTML|MAIN)$/.test(node.tagName); node = parentOf(node)) {
      const result = collect(node);
      if (result === null) break;
      // A temporary-only region is still a boundary; do not collect neighbours.
      if (result.items.length || result.skipped) return { element: node, ...result };
    }
    return null;
  }
  function regionItem(value, region) {
    if (value.kind === "media" && value.link.matches("video")) return D.item(value);
    const link = value.link;
    // For a title link beside a cover, use the smallest single-video card.
    let card = link;
    for (let depth = 0; depth < 6 && parentOf(card); depth++) {
      const parent = parentOf(card);
      if (/^(BODY|HTML|MAIN)$/.test(parent.tagName)) break;
      const other = [...parent.querySelectorAll("a[href]")].some(node => {
        try { return D.candidate(new URL(node.getAttribute("href"), node.baseURI).href).id !== value.id; } catch { return false; }
      });
      if (other) break;
      card = parent;
      if (card === region || card.querySelector("img")) break;
    }
    const image = link.querySelector("img") || card.querySelector("img");
    const captions = [...card.querySelectorAll("a[href]")].filter(node => {
      try { return D.candidate(new URL(node.getAttribute("href"), node.baseURI).href).id === value.id && (node.getAttribute("title") || node.textContent.trim()); } catch { return false; }
    });
    const caption = captions.find(node => node.getAttribute("title")) || captions.find(node => node !== link) || captions[0];
    const title = link.getAttribute("title") || link.getAttribute("aria-label") || caption?.getAttribute("title") || caption?.textContent.trim() || link.textContent.trim() || image?.alt || card.querySelector("h1,h2,h3,h4,h5,h6,[title]")?.textContent.trim() || value.code;
    return { ...value, link:undefined, url: value.url, title, cover: image?.currentSrc || image?.src };
  }
  function mount(ui, options = {}) {
    const $ = ui.$, room = !!options.room;
    let items = [], active = "", loading = 0, destroyed = false, titles = "expanded", platform = "all";
    const status = (text = "", error = false) => { $("vq-status").textContent = text; $("vq-status").className = "vq-status" + (error ? " error" : ""); };
    function render() {
      if (destroyed) return;
      const watchedCount = items.filter(item => item.watched).length;
      $("vq-count").textContent = items.length + " 条 · 已看 " + watchedCount;
      $("vq-clear-watched").disabled = !watchedCount;
      const list = $("vq-list"); list.replaceChildren();
      list.dataset.titles=titles;for(const mode of ["expanded","collapsed"])$("vq-title-"+mode).setAttribute("aria-pressed",String(mode===titles));
      for(const button of $("vq-platforms").children){const selected=button.dataset.provider===platform;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;const key=button.dataset.provider;button.textContent=({all:"全部",bilibili:"B站",huya:"虎牙",other:"其他"}[key])+" "+items.filter(item=>key==="all"||D.group(item)===key).length;}
      const visible=items.filter(item=>platform==="all"||D.group(item)===platform);
      if(!visible.length){const empty=document.createElement("li");empty.className="vq-empty";empty.textContent="这个分组还没有收藏。";list.append(empty);}
      for (const item of visible) {
        const row = document.createElement("li"); row.className = "vq-row"; row.dataset.id = item.id; row.dataset.watched = String(item.watched); row.setAttribute("aria-current", String(item.id === active));
        let art;
        if (item.cover) { art = document.createElement("img"); art.src = item.cover; art.alt = ""; art.loading = "lazy"; art.referrerPolicy = "no-referrer"; }
        else { art = document.createElement("span"); art.textContent = "▶"; art.setAttribute("aria-hidden", "true"); }
        art.className = "vq-art";
        const copy = document.createElement("div"); copy.className = "vq-copy";
        const title = document.createElement("p"); title.className = "vq-title"; title.textContent = item.title; title.title=item.title;
        const meta = document.createElement("p"); meta.className = "vq-meta"; meta.textContent = item.kind === "live" ? "虎牙直播 · " + item.room : item.kind === "media" ? "网页视频" + (item.dependent ? " · 需保留原网页" : " · " + new URL(item.sourceUrl || item.url).hostname) : "哔哩哔哩 · " + item.code + (item.page > 1 ? " · P" + item.page : "");
        const actions = document.createElement("div"); actions.className = "vq-row-actions";
        const watchState = document.createElement("span"); watchState.className = "vq-watch"; watchState.hidden = item.watched; watchState.setAttribute("role", "img"); watchState.setAttribute("aria-label", "未看"); watchState.title = "未看"; title.prepend(watchState);
        const watch = document.createElement("button"); watch.type = "button"; watch.className = "textbutton"; watch.textContent = item.watched ? "标为未看" : "标为已看";
        watch.setAttribute("aria-label", watch.textContent + "：" + item.title);
        watch.onclick = async () => { watch.disabled = true; try { await request("WATCH", { id: item.id, watched: !item.watched }); status(item.watched ? "已标为未看。" : "已标为已看。"); } catch (error) { status(error.message, true); watch.disabled = false; } };
        const play = document.createElement("button"); play.type = "button"; play.className = "textbutton"; play.textContent = item.id === active ? "重新播放" : "播放";
        play.onclick = async () => {
          play.disabled = true;
          try {
            if (options.onPlay) await options.onPlay(item);
            else await PointResizeVideoPlayer.open(item, {
              onActive(id) { active = id; render(); },
              onClose() { active = ""; render(); }
            });
            active = item.id; render();
          } catch (error) { status("无法开启小窗：" + error.message, true); }
          finally { play.disabled = false; }
        };
        const original = document.createElement("a"); original.href = item.sourceUrl || item.url; original.target = "_blank"; original.rel = "noopener noreferrer"; original.textContent = "原网页";
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "textbutton danger"; remove.textContent = "移除"; remove.setAttribute("aria-label", "移除 " + item.title);
        remove.onclick = async () => { remove.disabled = true; try { await request("REMOVE", { id: item.id }); status("已移出列表。"); } catch (error) { status(error.message, true); remove.disabled = false; } };
        actions.append(play, watch, original, remove); copy.append(title, meta, actions); row.append(art, copy); list.append(row);
      }
    }
    async function refresh() {
      const token = ++loading;
      try { const data = await chrome.storage.local.get([D.key,D.viewKey]); if (destroyed || token !== loading) return; items = D.clean(data[D.key]); titles=data[D.viewKey]?.titles==="collapsed"?"collapsed":"expanded";render(); } catch (error) { if (!destroyed) status("读取列表失败：" + error.message, true); }
    }
    async function resolve(value){
      if(!["live-pending","bilibili-pending"].includes(value.kind))return value;
      const result=await chrome.runtime.sendMessage({type:"VIDEO_RESOLVE",url:value.url});
      if(!result?.ok)throw new Error(result?.error||"直播间解析失败，请打开房间后收藏当前页。");
      return {...result.item,title:value.title,cover:value.cover};
    }
    async function add(value) {
      value=await resolve(value);
      const result = await request("ADD", { item: D.queueItem(value) });
      status(result.duplicate ? "这个视频已在待看列表中。" : "已加入待看列表。"); await refresh();
    }
    let picking = false, choosing = false, selection = null, point = null, hoverFrame = 0, outline = null;
    const listeners = [];
    function listen(type, handler, options = true) {
      window.addEventListener(type, handler, options); listeners.push(() => window.removeEventListener(type, handler, options));
    }
    function cancelPicking() {
      picking = false; selection = null; point = null;
      cancelAnimationFrame(hoverFrame); hoverFrame = 0;
      if (outline) outline.hidden = true;
      $("vq-pick").textContent = "点选网页视频加入"; $("vq-pick").setAttribute("aria-pressed", "false");
    }
    const outside = event => picking && !$("videos-page").hidden && !$("panel").hidden && !event.composedPath().includes(ui.host);
    function drawSelection() {
      if (!outline) {
        outline = document.createElement("div"); outline.id = "vq-outline"; outline.className = "outline";
        outline.innerHTML = '<span class="tag"></span>'; ui.root.append(outline);
      }
      const rect = selection?.element?.isConnected && selection.element.getBoundingClientRect();
      outline.hidden = !rect || rect.width <= 0 || rect.height <= 0;
      if (outline.hidden) return;
      Object.assign(outline.style, { left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px" });
      outline.classList.toggle("tagbelow", rect.top < 32);
      outline.firstChild.textContent = selection.items.length ? "识别到 " + selection.items.length + " 个视频 · 点击加入" : "临时视频流 · 不加入待看列表";
    }
    async function choose(region) {
      if (!region) { status("这个区域没有识别到可用视频。请点选实际播放器、包含视频的区域、B站视频链接或虎牙房间链接；普通帖子链接不能直接播放。", true); return; }
      if (!region.items.length) { status("这个区域只有临时视频流，已跳过，不会加入待看列表。请选择包含 B站视频、虎牙房间链接或视频直链的区域。"); return; }
      const values = region.items.map(value => regionItem(value, region.element));
      if(choosing)return;choosing=true;$("vq-pick").disabled = true;
      let added = 0, duplicates = 0;
      try {
        for (const value of values) {
          const resolved=await resolve(value);
          const result = await request("ADD", { item: resolved });
          if (result.duplicate) duplicates++; else added++;
        }
        status("已加入 " + added + " 项，可继续点选" + (duplicates ? "，跳过 " + duplicates + " 个已有视频" : "") + (region.skipped ? "，跳过 " + region.skipped + " 个临时视频流" : "") + "。");
      } catch (error) { status("已加入 " + added + " 个视频；" + error.message, true); }
      finally { choosing=false;$("vq-pick").disabled = false;selection=null;if(outline)outline.hidden=true;await refresh(); }
    }
    $("vq-pick").hidden = room;
    $("vq-pick").onclick = () => {
      if (picking) { cancelPicking(); status("已退出点选。"); return; }
      picking = true; $("vq-pick").setAttribute("aria-pressed", "true");
      $("vq-pick").textContent = "正在选取 · 点击取消";
      status("移到视频封面、标题或卡片区域，看到红框后点击加入；临时视频流自动跳过，其他视频去重加入。按 Esc 取消。");
    };
    if (!room) {
      const move = event => {
        if (!outside(event)) { if (outline) outline.hidden = true; selection = null; point = null; return; }
        const target = event.composedPath().find(node => node instanceof Element);
        point = { target, x: event.clientX, y: event.clientY };
        if (hoverFrame) return;
        hoverFrame = requestAnimationFrame(() => {
          hoverFrame = 0; if (!point || !picking) return;
          selection = regionAt(point.target, ui.host); drawSelection();
        });
      };
      for (const type of ["pointermove", "mousemove", "pointerover"]) listen(type, move, { capture: true, passive: true });
      for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup"]) listen(type, event => {
        if (outside(event) && event.button === 0) { event.preventDefault(); event.stopImmediatePropagation(); }
      });
      listen("click", event => {
        if (!outside(event) || event.button !== 0) return;
        event.preventDefault(); event.stopImmediatePropagation();
        const target = event.composedPath().find(node => node instanceof Element);
        choose(regionAt(target, ui.host));
      });
      listen("keydown", event => {
        if (!picking) return;
        if (event.key === "Escape") { cancelPicking(); status("已退出点选。"); event.preventDefault(); event.stopImmediatePropagation(); }
        else if (event.key === "Enter" && selection && !event.composedPath().includes(ui.host)) { event.preventDefault(); event.stopImmediatePropagation(); choose(regionAt(selection.element, ui.host)); }
      });
      const reposition = () => {
        if (!picking || !point) return;
        // Resolve the element now under the pointer after scrolling/resizing.
        let target = document.elementFromPoint(point.x, point.y);
        while (target?.shadowRoot?.elementFromPoint) {
          const inner = target.shadowRoot.elementFromPoint(point.x, point.y);
          if (!inner || inner === target) break; target = inner;
        }
        selection = target && target !== ui.host ? regionAt(target, ui.host) : null; drawSelection();
      };
      listen("scroll", reposition, { capture: true, passive: true });
      listen("resize", reposition, { passive: true });
    }
    $("vq-current").hidden = room;
    $("vq-current").onclick = async () => {
      const button = $("vq-current"); button.disabled = true;
      try {
        let values;
        try { values = [currentItem()]; }
        catch {
          values = PointResizePicker.openRoots(ui.host).flatMap(root => [...root.querySelectorAll("video,iframe[src]")]).map(elementVideo).filter(Boolean).map(value => regionItem(value, value.link));
        }
        if (!values.length) throw new Error("当前页还没有识别到视频。请在视频加载后再点选实际播放器区域。");
        const eligible = values.filter(value => ["live-pending","bilibili-pending"].includes(value.kind)||!D.item(value).dependent), skipped = values.length - eligible.length;
        if (!eligible.length) throw new Error("当前页只有临时视频流，已跳过，不会加入待看列表。");
        for (const value of eligible) await add(value);
        if (skipped) status("已处理 " + eligible.length + " 个视频，跳过 " + skipped + " 个临时视频流（已有视频不会重复加入）。");
      } catch (error) { status(error.message, true); } finally { button.disabled = false; }
    };
    $("vq-form").onsubmit = async event => {
      event.preventDefault(); const button = $("vq-form").querySelector("button"); button.disabled = true;
      try { await add(D.candidate($("vq-url").value)); $("vq-url").value = ""; } catch (error) { status(error.message, true); } finally { button.disabled = false; }
    };
    $("vq-clear-watched").onclick = async () => {
      $("vq-clear-watched").disabled = true;
      try { await request("CLEAR_WATCHED"); status("已清除已看视频，未看视频保留。"); await refresh(); }
      catch (error) { status(error.message, true); await refresh(); }
    };
    for(const mode of ["expanded","collapsed"])$("vq-title-"+mode).onclick=async()=>{const buttons=["expanded","collapsed"].map(value=>$("vq-title-"+value));buttons.forEach(button=>button.disabled=true);try{await request("VIEW",{mode});await refresh();}catch(error){status(error.message,true);}finally{buttons.forEach(button=>button.disabled=false);}};
    for(const button of $("vq-platforms").children){button.onclick=()=>{platform=button.dataset.provider;render();};button.onkeydown=event=>{const keys=["ArrowLeft","ArrowRight","Home","End"];if(!keys.includes(event.key))return;event.preventDefault();const buttons=[...$("vq-platforms").children];let index=buttons.indexOf(button);index=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;buttons[index].click();buttons[index].focus();};}
    const storageChanged = (changes, area) => { if (area === "local" && (changes[D.key]||changes[D.viewKey])) refresh(); };
    const notice = message => { if (message.type === "VIDEO_QUEUE_NOTICE") status(message.text); };
    chrome.storage.onChanged.addListener(storageChanged);
    chrome.runtime.onMessage.addListener(notice);
    refresh();
    return { refresh, status, cancelPicking, destroy() { destroyed = true; ++loading; cancelPicking(); listeners.forEach(remove => remove()); outline?.remove(); chrome.storage.onChanged.removeListener?.(storageChanged); chrome.runtime.onMessage.removeListener?.(notice); }, setActive(id) { active = id; render(); }, get items() { return items; } };
  }
  globalThis.PointResizeVideos = { css, template, mount, request, pauseSource };
})();
