(() => {
  const $ = id => document.getElementById(id), send = data => chrome.webview.postMessage(data);
  const controlsOnly = location.hash === '#controls';
  document.body.classList.toggle('controls-mode', controlsOnly);
  for (const id of ['screen', 'tools-toggle', 'tools-left', 'video-top', 'resize-grips']) $(id).hidden = controlsOnly;
  $('tools').hidden = !controlsOnly;
  let current = null, items = [], opening = 0, loadingTimer = 0, platform = 'all';
  function status(text, error = false) { $('status').textContent = error ? text : ''; $('status').hidden = !error; }
  function titleMode(mode){const value=mode==='collapsed'?'collapsed':'expanded';$('queue').dataset.titles=value;for(const mode of ['expanded','collapsed'])$('title-'+mode).setAttribute('aria-pressed',String(mode===value));}
  function render() {
    $('queue').replaceChildren();
    const watchedCount = items.filter(item => item.watched).length;
    $('queue-count').textContent = items.length + ' 条 · 已看 ' + watchedCount;
    $('clear-watched').disabled = !watchedCount;
    $('video-next').disabled = !items.length;
    for(const button of $('queue-platforms').children){const key=button.dataset.provider,selected=key===platform;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;button.textContent=({all:'全部',bilibili:'B站',huya:'虎牙',other:'其他'}[key])+' '+items.filter(item=>key==='all'||PointResizeVideoData.group(item)===key).length;}
    const visible=items.filter(item=>platform==='all'||PointResizeVideoData.group(item)===platform);
    if (!visible.length) { const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = '这个分组还没有收藏'; $('queue').append(empty); }
    for (const item of visible) {
      const row = document.createElement('li'); row.className = 'row'; row.dataset.id = item.id; row.dataset.watched = String(item.watched); row.setAttribute('aria-current', String(item.id === current?.id));
      const placeholder = () => { const art = document.createElement('span'); art.className = 'art'; art.textContent = '▶'; art.setAttribute('aria-hidden', 'true'); return art; };
      let art;
      if (item.cover) { art = document.createElement('img'); art.className = 'art'; art.src = item.cover; art.alt = ''; art.loading = 'lazy'; art.referrerPolicy = 'no-referrer'; art.addEventListener('error', () => art.replaceWith(placeholder()), { once: true }); }
      else art = placeholder();
      const copy = document.createElement('div'); copy.className = 'copy';
      const title = document.createElement('p'); title.className = 'row-title'; title.textContent = item.title; title.title=item.title;
      const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = item.kind === 'live' ? '虎牙直播 · '+item.room : item.kind === 'bilibili' ? '哔哩哔哩 · ' + item.code + (item.page > 1 ? ' · P' + item.page : '') : '网页视频 · ' + new URL(item.sourceUrl || item.url).hostname;
      const actions = document.createElement('div'); actions.className = 'row-actions';
      const watchState = document.createElement('span'); watchState.className = 'watch-state'; watchState.hidden = item.watched; watchState.setAttribute('role', 'img'); watchState.setAttribute('aria-label', '未看'); watchState.title = '未看'; title.prepend(watchState);
      const watch = document.createElement('button'); watch.className = 'textbutton'; watch.textContent = item.watched ? '标为未看' : '标为已看';
      watch.setAttribute('aria-label', watch.textContent + '：' + item.title); watch.onclick = () => send({ type: 'watched', id: item.id, watched: !item.watched });
      const play = document.createElement('button'); play.className = 'textbutton'; play.textContent = item.id === current?.id ? '重新播放' : '播放'; play.onclick = () => send({ type: 'select', id: item.id });
      actions.append(play, watch); copy.append(title, meta, actions); row.append(art, copy); $('queue').append(row);
    }
  }
  function play(input) {
    const item = PointResizeVideoData.queueItem(input); current = item; ++opening;
    render(); status('');
    if (controlsOnly) return;
    globalThis.__pointResizeMedia?.reset(item.id);
    quiet(false);
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => status('尚未检测到视频播放；来源可能要求登录、验证或限制外部播放，可换一条视频。',true), 15000);
    $('screen').replaceChildren(); status('正在加载视频…');
    if (item.kind === 'bilibili' || item.kind === 'live') {
      const frame = document.createElement('iframe'); frame.title = item.title; frame.allow = 'autoplay; fullscreen; encrypted-media'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';frame.style.visibility='hidden';frame.addEventListener('load',()=>{frame.style.visibility='';},{once:true}); frame.src = item.embed; $('screen').append(frame);
    } else {
      const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.autoplay = true; video.src = item.mediaUrl; $('screen').append(video);
      const token = opening;
      video.play().catch(async () => { if (token !== opening) return; video.muted = true; try { await video.play(); } catch { status('视频尚未开始，可使用播放控件；来源可能限制外部播放。',true); } });
      video.addEventListener('error', () => status('视频来源失效或限制外部播放，请换一条视频。',true));
    }
    render();
  }
  chrome.webview.addEventListener('message', e => {
    const data = e.data;
    if (data.type === 'play') { items = PointResizeVideoData.clean(data.items).filter(i => !i.dependent); play(data.item); }
    else if (data.type === 'queue') { items = PointResizeVideoData.clean(data.items).filter(i => !i.dependent); render(); }
    else if (data.type === 'media') {
      if (data.width > 0 && data.ready >= 2 && data.time > 0) { clearTimeout(loadingTimer); status(''); }
    } else if (data.type === 'hint') status(data.text,true);
    else if (data.type === 'view') titleMode(data.titles);
    else if (data.type === 'tools') { for (const id of ['tools-toggle', 'tools-left']) $(id).setAttribute('aria-expanded', String(data.open)); if (data.open) quiet(false); }
    else if (data.type === 'preferences') { $('hover').checked = data.hover; $('pin').checked = data.pin; }
  });
  for (const id of ['tools-toggle', 'tools-left']) {
    const button = $(id);
    button.onpointerenter = () => send({ type: 'tools', open: true, side: button.dataset.side });
    button.onpointermove = () => {
      if (button.getAttribute('aria-expanded') !== 'true') send({ type: 'tools', open: true, side: button.dataset.side });
    };
    button.onclick = e => send({ type: 'tools', open: true, keyboard: e.detail === 0, side: button.dataset.side });
  }
  let quietAt = null;
  function quiet(enabled, event) {
    if (controlsOnly) return;
    quietAt = enabled ? { x: event?.clientX ?? innerWidth / 2, y: event?.clientY ?? innerHeight / 2 } : null;
    document.body.classList.toggle('quiet', enabled); $('quiet-screen').hidden = !enabled;
    const video = $('screen').querySelector('video'); if (video) video.controls = !enabled;
    if (enabled) { send({ type: 'tools', open: false }); $('quiet').blur(); }
  }
  $('quiet').onpointerenter = e => quiet(true, e);
  $('quiet').onclick = e => quiet(true, e.detail ? e : null);
  $('quiet-screen').onpointermove = e => { if (quietAt && Math.hypot(e.clientX - quietAt.x, e.clientY - quietAt.y) > 10) quiet(false); };
  $('quiet-screen').onpointerleave = () => quiet(false);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { quiet(false); send({ type: 'tools', open: false }); } });
  $('video-close').onclick = () => send({ type: 'close' });
  $('video-next').onclick = () => { if (items.length) send({ type: 'select', id: items[(items.findIndex(i => i.id === current?.id) + 1) % items.length].id }); };
  for(const mode of ['expanded','collapsed'])$('title-'+mode).onclick=()=>send({type:'view',mode});
  for(const button of $('queue-platforms').children){button.onclick=()=>{platform=button.dataset.provider;render();};button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...$('queue-platforms').children];let index=buttons.indexOf(button);index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[index].click();buttons[index].focus();};}
  $('hover').onchange = () => send({ type: 'hover', enabled: $('hover').checked });
  $('pin').onchange = () => send({ type: 'pin', enabled: $('pin').checked });
  $('clear-watched').onclick = () => send({ type: 'clear-watched' });
  let resizing = null;
  for (const grip of $('resize-grips').children) {
    grip.onpointerdown = e => {
      if (e.button !== 0 || resizing) return;
      e.preventDefault(); quiet(false); grip.setPointerCapture(e.pointerId);
      resizing = { id:e.pointerId, x:e.screenX, y:e.screenY, ratio:devicePixelRatio };
      send({ type:'resize', phase:'start', edge:Number(grip.dataset.resize) });
    };
    grip.onpointermove = e => {
      if (!resizing || e.pointerId !== resizing.id) return;
      send({ type:'resize', phase:'move', x:(e.screenX-resizing.x)*resizing.ratio, y:(e.screenY-resizing.y)*resizing.ratio });
    };
    const finish = e => { if (!resizing || e.pointerId !== resizing.id) return; resizing = null; send({ type:'resize', phase:'end' }); };
    grip.onpointerup = grip.onpointercancel = grip.onlostpointercapture = finish;
  }
  for (const id of ['move']) {
  $(id).onpointerdown = e => { if (e.button === 0) { e.preventDefault(); send({ type: 'drag' }); } };
  $(id).onkeydown = e => {
    const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (delta) { e.preventDefault(); send({ type: 'move', x: delta[0], y: delta[1] }); }
  };
  }
  send({ type: 'ready' });
})();
