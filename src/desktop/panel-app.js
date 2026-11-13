(() => {
  const bridge = PointResizeDesktop;
  let ui, target = null, tab = "resize", video, lastVideoStatus = "", connected=false,pairing=false,installing=false,pairingError='';
  let setupStep=1,setSetupStep=()=>{},syncSetup=()=>{},pairBusy=false;
  function note(text, error = false) { ui.$("status").textContent = text; ui.$("status").className = "status" + (error ? " error" : ""); }
  async function request(type, args = {}) { const result = await chrome.runtime.sendMessage({ type, ...args }); if (!result?.ok) throw new Error(result?.error || "操作失败。"); return result; }
  async function pageEvent(args) {
    const failure = text => { if (tab === "videos") { ui.$("vq-status").textContent = text; ui.$("vq-status").className = "vq-status error"; } else note(text, true); };
    if (!target) { failure("请切换到已授权的普通网页，或在网页点击扩展图标授权。"); return; }
    try { const result = await bridge.rpc("page-event", { ...args, documentId: target.documentId, url: target.url, browserSession: target.browserSession }); if (!result?.ok) throw new Error(result?.error || "网页尚未准备好。"); }
    catch (error) { failure(error.message); }
  }
  function chooseTab(value) {
    if(value!=='settings'&&!connected)return;
    tab = value;
    for (const name of ["resize", "videos", "settings"]) {
      ui.$(name === "videos" ? "videos-page" : name + "-page").hidden = name !== value;
      ui.$("tab-" + name).setAttribute("aria-selected", String(name === value)); ui.$("tab-" + name).tabIndex = name === value ? 0 : -1;
    }
    ui.$("brand-title").textContent = { resize: "点选缩放", videos: "视频待看", settings: "设置" }[value];
    ui.$("brand-mark").dataset.icon=value;ui.$("brand-mark").innerHTML = ui.icon({resize:"pointer",videos:"video",settings:"settings"}[value]);
    ui.$("site").hidden = value !== "resize";
    ui.$("level-rail").hidden = value !== "resize" || !target || !!ui.$("editor")?.hidden;
    if (value === "videos") video.refresh();
    if (target) pageEvent({ command: "set-tab", tab: value });
    ui.syncControls();
  }
  // Preserve existing nodes/focus while applying snapshots. No event handlers or
  // page scripts are evaluated in the desktop window.
  function morph(current, next) {
    for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    for (const attr of [...next.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
    const focused = ui.root.activeElement === current;
    if (current instanceof HTMLInputElement) {
      if (!focused || current.type === "range" || current.type === "checkbox") current.value = next.getAttribute("value") || "";
      current.checked = next.hasAttribute("checked");
    }
    let index = 0;
    for (const child of [...next.childNodes]) {
      let existing = current.childNodes[index];
      if (child.nodeType === 1) {
        const key = child.getAttribute("data-pr-node");
        const found = key && [...current.children].find(node => node.getAttribute("data-pr-node") === key);
        if (found) { if (existing !== found) current.insertBefore(found, existing || null); existing = found; }
        if (existing?.nodeType === 1 && existing.tagName === child.tagName && (!key || existing.getAttribute("data-pr-node") === key)) morph(existing, child);
        else current.insertBefore(child.cloneNode(true), existing || null);
      } else if (existing?.nodeType === 3 && child.nodeType === 3) { if (existing.data !== child.data) existing.data = child.data; }
      else current.insertBefore(child.cloneNode(true), existing || null);
      index++;
    }
    while (current.childNodes.length > index) current.lastChild.remove();
  }
  function snapshot(data) {
    const changedDocument = target?.documentId !== data.documentId;
    const previewWasHidden = ui.$("image-viewer").hidden;
    target = data; ui.$("site").textContent = data.site;
    ui.$("vq-pick").disabled = ui.$("vq-current").disabled = false;
    const videoStatus = data.documentId + JSON.stringify(data.videoStatus);
    if (data.videoStatus && videoStatus !== lastVideoStatus) {
      lastVideoStatus = videoStatus;
      ui.$("vq-pick").textContent = data.videoStatus.picking ? "正在选取 · 点击取消" : "点选网页视频加入";
      ui.$("vq-pick").setAttribute("aria-pressed", String(data.videoStatus.picking));
      if (data.videoStatus.text) { ui.$("vq-status").textContent = data.videoStatus.text; ui.$("vq-status").className = "vq-status" + (data.videoStatus.error ? " error" : ""); }
    }
    for (const [id, html] of [["resize-page", data.resize], ["level-rail", data.rail], ["image-viewer", data.preview]]) {
      const template = document.createElement("template"); template.innerHTML = html;
      const next = template.content.firstElementChild;
      if (!next || next.id !== id || next.querySelector("script,iframe,object,embed")) continue;
      for (const node of [next, ...next.querySelectorAll("*")]) for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      morph(ui.$(id), next);
    }
    ui.$("resize-page").hidden = tab !== "resize";
    for (const input of ui.$("resize-page").querySelectorAll('input[type="checkbox"]')) input.indeterminate = input.dataset.prIndeterminate === "true";
    ui.$("level-rail").hidden = tab !== "resize" || !!ui.$("editor")?.hidden;
    ui.$("panel").inert = ui.$("level-rail").inert = !ui.$("image-viewer").hidden;
    if (previewWasHidden && !ui.$("image-viewer").hidden) ui.$("preview-close").focus();
    ui.syncControls();
    if (changedDocument && tab !== "resize") pageEvent({ command: "set-tab", tab });
  }
  let offlineLoad=0;
  async function renderOffline() {
    if(!ui||target)return;
    const token=++offlineLoad;
    for(const id of ['choose','library','edit-heading','editor','all-view'])ui.$(id).hidden=true;
    let box=ui.$('desktop-records');if(!box){box=document.createElement('div');box.id='desktop-records';box.className='offline-records';ui.$('resize-page').append(box);}
    try {
      const data=await chrome.storage.local.get(null);if(target||token!==offlineLoad)return;
      box.replaceChildren();const title=document.createElement('strong');title.textContent='全部网站保存项';box.append(title);
      const sites=Object.entries(data).filter(([key])=>key.startsWith('point-resize:v1:'));
      if(!sites.length){const empty=document.createElement('p');empty.className='all-note';empty.textContent='暂无保存项。连接浏览器后可选择网页内容。';box.append(empty);}
      for(const [key,profile] of sites){
        const group=document.createElement('details');group.className='site-group';group.open=sites.length===1;
        const heading=document.createElement('summary');heading.textContent=key.slice(16)+' · '+profile.rules.length+' 项';group.append(heading);
        for(const item of profile.rules){
          const row=document.createElement('article');row.className='rule';
          const check=document.createElement('input');check.type='checkbox';check.checked=profile.enabled!==false&&item.enabled!==false;check.setAttribute('aria-label','启用 '+(item.label||'保存项'));
          const save=async(command,args)=>{try{await bridge.rpc('library',{action:'profile',key,command,id:item.id,...args,operationId:crypto.randomUUID()});renderOffline();}catch(error){note(error.message,true);}};
          check.onchange=()=>save('update',{updates:{enabled:check.checked}});
          const copy=document.createElement('div');copy.className='rule-copy';
          const name=document.createElement('input');name.value=item.name||'';name.placeholder=item.defaultLabel||item.label||'保存项';name.maxLength=60;name.setAttribute('aria-label','保存项名称');name.onchange=()=>save('update',{updates:{name:name.value.trim(),label:name.value.trim()||item.defaultLabel||'内容区域'}});
          const actions=document.createElement('div');actions.className='rule-actions';
          if(item.thumbnail){const preview=document.createElement('button');preview.className='thumb-button';preview.setAttribute('aria-label','查看截图');const image=document.createElement('img');image.className='rule-thumb';image.src=item.thumbnail;image.alt=item.label||'保存项截图';preview.append(image);preview.onclick=()=>ui.showPreview(item.thumbnail,item.label,preview);actions.append(preview);}
          const edit=document.createElement('button');edit.className='textbutton';edit.textContent='到网页调整';edit.onclick=()=>{if(!connected){note('请先打开已配对的浏览器，再调整网页内容。',true);return;}bridge.rpc('edit-saved',{site:key.slice(16),id:item.id}).catch(error=>note(error.message,true));};
          const remove=document.createElement('button');remove.className='textbutton danger';remove.textContent='删除';remove.onclick=()=>save('remove',{});
          const summary=document.createElement('div');summary.className='ruleval';
          const layers=item.layers||[item];const changed=layers.filter(layer=>layer.hidden||layer.value!==(layer.defaultValue??(layer.mode==='scale'?100:layer.value)));
          if(!changed.length)summary.textContent='原始大小';
          changed.forEach((layer,index)=>{if(index)summary.append(' · ');const effect=document.createElement('span');effect.className='rule-effect '+(layer.hidden?'hidden-effect':'resize-effect');effect.textContent='第'+(layer.level||1)+'层 '+(layer.hidden?'隐藏':(layer.mode==='font'?'字号 ':'缩放 ')+layer.value+(layer.mode==='font'?'px':'%'));summary.append(effect);});
          actions.append(edit,remove);copy.append(name,summary,actions);row.append(check,copy);group.append(row);
        }box.append(group);
      }
      ui.syncControls();
    }catch(error){note('读取资料库失败：'+error.message,true);}
  }
  function start(init) {
    if (ui) return;
    chrome.runtime.id = init.extensionId; chrome.runtime.getManifest = () => ({ version: init.version });
    ui = PointResizePanel.create(); ui.host.dataset.desktop="true";
    const style = document.createElement("style");
    // Layout only. All button appearance is still owned by panel.js BUTTON_CSS.
    style.textContent = ':host{--ui-scale:1;--ui-vw:100vw;--ui-vh:100vh}.panel{left:128px!important;top:8px!important;right:8px!important;width:auto!important;max-width:none!important;max-height:calc(var(--ui-vh,100vh) - 16px)!important;box-shadow:none}:host([data-tab-side="right"]) .panel{left:8px!important;right:128px!important}.panel-tabs{top:8px!important}.top{padding:12px;gap:6px}.top .drag-handle{flex:1;min-width:0}.brand-line{display:flex;align-items:center;gap:8px}.setup-step{border:2px solid #e4e9e6;border-radius:12px;padding:12px;margin:12px 0;background:#f4f6f5}.setup-step:last-child{margin-bottom:0}.setup-step[aria-current="step"]{border-color:#75a28d;background:#fff}.setup-step h3{margin:0 0 8px;font-size:13px;line-height:var(--content-line-height,1.6)}.setup-step p{margin:8px 0 0}.setup-step p:empty{display:none}.setup-step a{color:#376859;overflow-wrap:anywhere}.setup-step:not([aria-current="step"]){color:#667873}.step-note{font-size:11px}:host([data-moving="true"]) .panel{height:var(--moving-panel-height)!important;overflow:hidden!important}.paired-browsers{display:grid;gap:8px;margin:12px 0}.paired-browser{display:flex;align-items:center;gap:8px}.browser-logo{width:20px;height:20px;flex:none}.level-rail{width:112px!important;box-shadow:none}#outline,#related-outlines,#tip{display:none!important}.image-viewer{background:transparent!important}.connection-status{font-size:11px;line-height:var(--content-line-height,1.6);color:var(--muted);padding:0}.pairing-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.connection-light{display:inline-block;width:10px;height:10px;border-radius:50%;background:#d34545;margin-right:6px}.connection-light[data-connected="true"]{background:#239c52}.offline-records{margin-top:12px}.offline-records .rule-actions{flex-wrap:wrap}';
    ui.root.append(style); ui.$("panel").hidden = false; ui.show();
    document.documentElement.style.cssText = "margin:0;background:transparent;overflow:hidden";
    const title=ui.$('brand-title'),line=document.createElement('span');line.className='brand-line';title.before(line);line.append(title);
    const light=document.createElement('span');light.id='connection-light';light.className='connection-light';light.setAttribute('role','img');light.setAttribute('aria-label','未连接，红灯');light.dataset.connected='false';line.append(light);
    const backups=document.createElement('section');backups.id='settings-backup';backups.hidden=true;
    for(const node of [...ui.$('settings-page').children])if(!['native-settings','hover-settings'].includes(node.id))backups.append(node);
    ui.$('settings-page').prepend(backups);
    const setup=document.createElement('section');setup.id='browser-setup';setup.className='connection-status';
    setup.innerHTML=`<details class="disclosure-card" id="setup-card" open><summary id="setup-summary">浏览器连接</summary><section id="setup-step-1" class="setup-step" aria-current="step"><h3>① 选择浏览器</h3><div id="browser-choices"><div class="rule-actions"><button id="browser-chrome" class="primary" type="button" aria-pressed="false">谷歌浏览器</button><button id="browser-edge" type="button" aria-pressed="false">Edge</button></div></div><p id="browser-address" hidden></p><p id="browser-setup-status" role="status"></p></section>
      <section id="setup-step-2" class="setup-step"><h3>② 配对插件</h3><div class="rule-actions pairing-actions"><button id="browser-pair" type="button" disabled>配对浏览器插件</button></div><p id="pairing-status" role="status"></p></section></details><div id="paired-browsers" class="paired-browsers" aria-label="已配对浏览器"></div>`;
    ui.$('settings-page').prepend(setup);
    setSetupStep=value=>{setupStep=value;for(let step=1;step<=2;step++){const card=ui.$('setup-step-'+step);if(step===value)card.setAttribute('aria-current','step');else card.removeAttribute('aria-current');}syncSetup();};
    syncSetup=()=>{ui.$('browser-chrome').disabled=ui.$('browser-edge').disabled=installing||pairing||pairBusy;const button=ui.$('browser-pair');button.disabled=installing||pairBusy||(!pairing&&setupStep!==2);button.textContent=pairing?'配对中 · 点击取消':'配对浏览器插件';button.setAttribute('aria-busy',String(pairing));};
    async function beginPairing(){
      ui.$('setup-card').open=true;pairBusy=true;pairing=true;pairingError='';setSetupStep(2);
      try{await bridge.rpc('browser-pairing');ui.$('portable-status')?.setAttribute('hidden','');ui.$('pairing-status').textContent='已进入配对状态（10 分钟），请到插件网页完成配对。';}
      catch(error){pairing=false;pairingError=error.message;ui.$('pairing-status').textContent='未能进入配对状态：'+error.message;setSetupStep(1);}
      finally{pairBusy=false;syncSetup();}
    }
    async function cancelPairing(){
      if(pairBusy||!pairing)return;pairBusy=true;syncSetup();
      try{await bridge.rpc('browser-pairing-cancel');pairing=false;pairingError='';ui.$('pairing-status').textContent='已取消配对。';setSetupStep(1);ui.$('setup-card').open=true;}
      catch(error){ui.$('pairing-status').textContent='取消未完成：'+error.message;}
      finally{pairBusy=false;syncSetup();}
    }
    async function selectBrowser(browser){
      if(installing||pairing||pairBusy)return;installing=true;pairingError='';syncSetup();
      ui.$('browser-address').hidden=false;ui.$('browser-address').textContent=browser==='edge'?'edge://extensions/':'chrome://extensions/';for(const name of ['chrome','edge'])ui.$('browser-'+name).setAttribute('aria-pressed',String(name===browser));
      try{const result=await bridge.rpc('browser-setup',{browser});ui.$('browser-setup-status').textContent=!result.simulated&&!result.browserOpened?'浏览器未能启动。':!result.simulated&&!result.clipboardCopied?'地址复制失败。':'';if(result.simulated||result.browserOpened)await beginPairing();}
      catch(error){ui.$('browser-setup-status').textContent=error.message;setSetupStep(1);}
      finally{installing=false;syncSetup();}
    }
    ui.$('browser-pair').onclick=()=>pairing?cancelPairing():beginPairing();
    for(const browser of ['chrome','edge'])ui.$('browser-'+browser).onclick=()=>selectBrowser(browser);
    syncSetup();
    ui.syncGeometry=PointResizePanelShape(ui,bridge);
    ui.root.addEventListener("pointerdown", event => { if (event.isTrusted) bridge.send({ type: "panel-focus-ui" }); }, true);
    ui.$("close").onclick = () => bridge.send({ type: "panel-close" });
    ui.$("dock").classList.add("desktop-pin");ui.$("dock").innerHTML=ui.icon("pin");ui.$("dock").title = "取消窗口置顶"; ui.$("dock").setAttribute("aria-label", "切换窗口置顶");
    ui.$("dock").onclick = () => bridge.send({ type: "panel-pin" });
    const handle = ui.$("drag-handle"); handle.replaceWith(handle.cloneNode(true));
    ui.$("drag-handle").addEventListener("pointerdown", event => { if (event.button === 0) bridge.send({ type: "panel-drag" }); });
    ui.$("drag-handle").addEventListener("keydown", event => { if (/^Arrow/.test(event.key)) bridge.send({ type: "panel-move", key: event.key }); });
    for (const name of ["resize", "videos", "settings"]) {
      ui.$("tab-" + name).onclick = () => chooseTab(name);
      ui.$("tab-" + name).onkeydown = event => {
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); const order = ["resize", "videos", "settings"].filter(name=>!ui.$('tab-'+name).disabled);
        const value = event.key === "Home" ? order[0] : event.key === "End" ? order[order.length-1] : order[(order.indexOf(name) + (event.key === "ArrowUp" ? order.length-1 : 1)) % order.length];
        chooseTab(value); ui.$("tab-" + value).focus();
      };
    }
    for (const type of ["click", "input", "change", "keydown"]) ui.root.addEventListener(type, event => {
      const node = event.target.closest?.(type === "click" ? "button[data-pr-node],a[data-pr-node],summary[data-pr-node]" : "[data-pr-node]");
      if (!node || !node.closest("#resize-page,#level-rail,#image-viewer")) return;
      if (type === "click" && !node.matches("button,a,summary")) return;
      if (type === "keydown" && !["Enter", "Escape", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.stopImmediatePropagation(); if (type === "click" || type === "keydown") event.preventDefault();
      pageEvent({ node: node.dataset.prNode, event: type, key: event.key, value: node.value, checked: node.checked });
    }, true);
    video = PointResizeVideos.mount(ui, { onPlay: async item => { await request("VIDEO_NATIVE_PLAY", { item }); } });
    ui.$("vq-pick").onclick = () => pageEvent({ command: "video-pick" });
    ui.$("vq-current").onclick = () => pageEvent({ command: "video-current" });
    chrome.runtime.onMessage.addListener(message => { if (message.type === "VIDEO_NATIVE_STATE") video.setActive(message.id || ""); });
    PointResizeNativeSettings.saveInstaller = async payload => {
      const result = await bridge.rpc("save-installer", { filename: payload.filename, base64: payload.base64 });
      if (result.cancelled) throw new Error("已取消保存安装包。");
    };
    ui.$('native-settings').hidden=false;
    ui.$('native-settings').querySelector('strong').textContent='连接维护';
    ui.$('native-settings').querySelector('p').textContent='移动后保留整个软件文件夹及资料库，在新位置运行后重新加载插件并配对。';
    ui.$('settings-backup').before(ui.$('native-settings'));
    ui.$('native-install').remove();ui.$('native-toggle').remove();
    ui.$('native-settings').querySelector('strong').textContent='连接记录';
    ui.$('native-settings').querySelector('p').textContent='清除浏览器连接登记，保留软件资料和浏览器插件。删除软件前先清理，再关闭所有窗口并删除软件文件夹。';
    ui.$('native-status').textContent='';
    const status=document.createElement('p');status.id='portable-status';status.setAttribute('role','status');status.hidden=true;ui.$('browser-pair').parentElement.after(status);
    if(init.portable){const prepare=async()=>{try{await bridge.rpc('portable-prepare');}catch(error){status.hidden=false;status.textContent='连接入口准备失败：'+error.message+' 请点击“配对浏览器插件”重试。';}};prepare();}
    ui.$('native-uninstall').textContent='清除注册表记录';
    ui.$('native-uninstall').onclick=async()=>{const button=ui.$('native-uninstall');button.disabled=true;try{const result=await bridge.rpc('registration-clear');ui.$('native-status').textContent=result.simulated?'测试模式已记录清理目标，连接已断开，资料未删除。':'已清除指向本目录的浏览器连接记录。可关闭软件并删除文件夹；再次使用请重新配对。';}catch(error){ui.$('native-status').textContent='清理未完成：'+error.message;}finally{button.disabled=false;}};
    ui.$('preview-close').onclick=()=>{if(target)pageEvent({node:ui.$('preview-close').dataset.prNode,event:'click'});else ui.closePreview();};
    async function backup(action) {
      ui.$("backup-export").disabled = ui.$("backup-import").disabled = true;
      try { await action(); } catch (error) { ui.$("backup-status").textContent = error.message; }
      finally { ui.$("backup-export").disabled = ui.$("backup-import").disabled = false; }
    }
    ui.$("backup-export").onclick = () => backup(async () => {
      const { backup } = await request("POINT_RESIZE_BACKUP_EXPORT");
      const result = await bridge.rpc("save-backup", { text: JSON.stringify(backup, null, 2) });
      ui.$("backup-status").textContent = result.cancelled ? "已取消导出。" : "已保存备份。";
    });
    ui.$("backup-import").onclick = () => { ui.$("backup-file").value = ""; ui.$("backup-file").click(); };
    ui.$("backup-file").onchange = () => backup(async () => {
      const file = ui.$("backup-file").files[0]; if (!file) return;
      if (file.size > PointResizeBackup.maxBytes) throw new Error("备份文件不能超过 16 MB。");
      const text = await file.text(); PointResizeBackup.parse(text);
      const result = await request("POINT_RESIZE_BACKUP_IMPORT", { text }); ui.$("backup-status").textContent = "已导入合并：" + result.summary;
    });
    ui.root.addEventListener("click", event => {
      const anchor = event.target.closest?.("a[href]"); if (!anchor || !/^https?:/.test(anchor.href)) return;
      event.preventDefault(); bridge.rpc("open-url", anchor.href).catch(error => note(error.message, true));
    });
    window.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!ui.$("image-viewer").hidden) { ui.$("preview-close").click(); return; }
      if (tab === "videos" && ui.$("vq-pick").getAttribute("aria-pressed") === "true") { pageEvent({ command: "video-pick" }); return; }
      if (tab !== "resize") { if(connected)chooseTab("resize");else bridge.send({type:"panel-close"}); return; }
      if (target && (!ui.$("editor").hidden || !ui.$("all-view").hidden || ui.$("choose-label").textContent.includes("正在选取"))) {
        pageEvent({ node: ui.$("choose").dataset.prNode, event: "keydown", key: "Escape" });
      } else bridge.send({ type: "panel-close" });
    }, true);
    ui.$('tab-resize').disabled=ui.$('tab-videos').disabled=true;
    chooseTab("settings"); renderOffline();
    globalThis.PointResizeDesktopUI = { ui, get target() { return target; } };
  }
  bridge.on(message => {
    if (message.type === "panel-init") start(message);
    if (!ui) return;
    if(message.type==='panel-side'){ui.host.dataset.tabSide=message.side;ui.syncControls();}
    if(message.type==='panel-move-state'){if(message.moving){const scale=parseFloat(getComputedStyle(ui.$('panel')).zoom)||1;ui.host.style.setProperty('--moving-panel-height',ui.$('panel').getBoundingClientRect().height/scale+'px');ui.host.dataset.moving='true';}else{delete ui.host.dataset.moving;ui.syncGeometry?.();}}
    if(message.type==='panel-zoom')ui.setPageZoom(message.factor);
    if (message.type === "panel-snapshot") snapshot(message.snapshot);
    else if (message.type === "panel-target" && !message.available) {
      target = null; ui.$("resize-page").querySelectorAll("button,input").forEach(node => node.disabled = true);
      ui.$("vq-pick").disabled = ui.$("vq-current").disabled = true;
      ui.$("vq-pick").textContent = "点选网页视频加入"; ui.$("vq-pick").setAttribute("aria-pressed", "false");
      ui.$("level-rail").hidden = true; ui.$("image-viewer").hidden = true; note(message.reason);
      ui.$("panel").inert = ui.$("level-rail").inert = false; renderOffline();
    }
    else if(message.type==='browser-state') {
      const wasConnected=connected,wasPairing=pairing;connected=message.connected;if(!pairBusy)pairing=!!message.pairing;ui.$('connection-light').title=message.reason;if(pairing)setSetupStep(2);else if(wasPairing&&!pairBusy)setSetupStep(1);
      ui.$('connection-light').dataset.connected=String(connected);ui.$('connection-light').setAttribute('aria-label',connected?'已连接，绿灯':'未连接，红灯');
      ui.$('browser-setup').hidden=false;syncSetup();
      const setupCard=ui.$('setup-card');if(!connected||pairing)setupCard.open=true;else if(!wasConnected||wasPairing)setupCard.open=false;
      ui.$('setup-summary').textContent=connected?'浏览器连接 · 已连接':'浏览器连接';
      if(connected&&!pairing&&!pairingError){ui.$('pairing-status').textContent='';ui.$('portable-status')?.setAttribute('hidden','');}
      ui.$('tab-resize').disabled=ui.$('tab-videos').disabled=!connected;ui.$('settings-backup').hidden=!connected;
      const browsers=ui.$('paired-browsers');browsers.replaceChildren();
      const counts={};for(const browser of message.browsers||[]){
        const row=document.createElement('div');row.className='paired-browser';
        const kind=browser.browser==='Edge'?'Edge':'谷歌浏览器',number=counts[kind]=(counts[kind]||0)+1;
        const logo=document.createElement('span');logo.className='browser-logo';logo.setAttribute('aria-hidden','true');
        logo.innerHTML=browser.browser==='Edge'?'<svg viewBox="0 0 24 24"><path fill="#168ac5" d="M21 15a9 9 0 1 1-1-9c-8-5-15 2-13 8 3-5 8-5 14-2Z"/><path fill="#24bba1" d="M21 15c-3 8-14 8-17 0 4 3 9 3 12 0-6 1-6-5-2-5 3 0 5 2 7 5Z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e9b735"/><path d="M12 12 2.5 6.5A11 11 0 0 1 22 7H12Z" fill="#e75a4a"/><path d="M12 12 6.5 21.5A11 11 0 0 1 2.5 6.5Z" fill="#4da66a"/><circle cx="12" cy="12" r="5" fill="#fff"/><circle cx="12" cy="12" r="3.7" fill="#3e91d8"/></svg>';
        const name=document.createElement('span');name.textContent=kind+(number>1?' '+number:'');
        const light=document.createElement('span');light.className='connection-light';light.dataset.connected=String(browser.connected);light.setAttribute('role','img');light.setAttribute('aria-label',browser.connected?'已连接，绿灯':'未连接，红灯');light.title=browser.connected?'已连接':'未连接';row.append(logo,name,light);browsers.append(row);
      }
      if(!connected){target=null;ui.$('level-rail').hidden=true;chooseTab('settings');renderOffline();}
      else if(!wasConnected){chooseTab('settings');if(!pairing)setSetupStep(1);}
    }
    else if(message.type==='pairing-feedback'){
      pairingError=message.error||'';
      if(message.error)ui.$('setup-card').open=true;
      ui.$('pairing-status').textContent=message.error?'配对未完成：'+message.error:message.text;
    }
    else if(message.type==='library-changed'&&!target) renderOffline();
    else if(message.type==='library-error') {note(message.error,true);ui.$('backup-status').textContent=message.error;}
    else if (message.type === "panel-preferences") {
      ui.$("dock").setAttribute("aria-pressed", String(message.pin));
      ui.$("dock").title = message.pin ? "取消窗口置顶" : "窗口置顶";ui.$("dock").setAttribute("aria-label",ui.$("dock").title);
    }
  });
  bridge.send({ type: "panel-ui-ready" });
})();
