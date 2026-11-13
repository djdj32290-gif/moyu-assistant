exec((__import__('pathlib').Path(__file__).with_name('update-0185.py')).read_text(encoding='utf-8').split('# Storage remains')[0])
edit('src/video-page.js','    <button class="secondary" id="vq-current" type="button">收藏当前页视频</button>\n    <div class="vq-actions"><button id="vq-live" type="button">收藏当前页直播</button></div>', '    <div class="vq-actions"><button id="vq-current" type="button">收藏当前页视频／直播</button></div><p class="vq-note">支持 B站视频页、虎牙直播间页</p>')
edit('src/video-page.js','    <form class="vq-form"', '    <details class="disclosure-card vq-add-card" id="vq-add-card"><summary>粘贴链接加入</summary><form class="vq-form"')
edit('src/video-page.js','粘贴 B 站链接或视频直链','B站视频／虎牙直播间／视频直链')
edit('src/video-page.js','B 站完整链接 / MP4 / WebM 地址','B站视频、虎牙房间、MP4 / WebM')
edit('src/video-page.js','</div></form>','</div></form></details>')
edit('src/video-page.js','    <ul class="vq-list"', '    <div class="provider-tabs" id="vq-platforms" role="tablist" aria-label="按平台筛选">'+''.join(f'<button class="provider-tab" id="vq-platform-{key}" type="button" role="tab" aria-selected="{str(key=="all").lower()}" aria-controls="vq-list" tabindex="{0 if key=="all" else -1}" data-provider="{key}">{label}</button>' for key,label in [('all','全部'),('bilibili','B站'),('huya','虎牙'),('other','其他')])+'</div>\n    <ul class="vq-list"')
edit('src/video-page.js','titles = "expanded";', 'titles = "expanded", platform = "all";')
edit('src/video-page.js','      for (const item of items) {', '''      for(const button of $("vq-platforms").children){const selected=button.dataset.provider===platform;button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;const key=button.dataset.provider;button.textContent=({all:"全部",bilibili:"B站",huya:"虎牙",other:"其他"}[key])+" "+items.filter(item=>key==="all"||D.group(item)===key).length;}
      const visible=items.filter(item=>platform==="all"||D.group(item)===platform);
      if(!visible.length){const empty=document.createElement("li");empty.className="vq-empty";empty.textContent="这个分组还没有收藏。";list.append(empty);}
      for (const item of visible) {''')
# Update tabs even when the complete library is empty.
edit('src/video-page.js','      if (!items.length) { const empty', '      if (false) { const empty')
edit('src/video-page.js','    let picking = false,','    let picking = false, choosing = false,')
edit('src/video-page.js','      cancelPicking(); $("vq-pick").disabled = true;', '      if(choosing)return;choosing=true;$("vq-pick").disabled = true;')
edit('src/video-page.js','const result = await request("ADD", { item: value });','const resolved=await resolve(value);\n          const result = await request("ADD", { item: resolved });')
edit('src/video-page.js','finally { $("vq-pick").disabled = false; await refresh(); }','finally { choosing=false;$("vq-pick").disabled = false;selection=null;if(outline)outline.hidden=true;await refresh(); }')
edit('src/video-page.js','    async function add(value) {','''    async function resolve(value){
      if(value.kind!=="live-pending")return value;
      const result=await chrome.runtime.sendMessage({type:"VIDEO_RESOLVE",url:value.url});
      if(!result?.ok)throw new Error(result?.error||"直播间解析失败，请打开房间后收藏当前页。");
      return {...result.item,title:value.title,cover:value.cover};
    }
    async function add(value) {
      value=await resolve(value);''')
edit('src/video-page.js','return { ...D.parse(url.href), link: node };','return { ...D.candidate(url.href), link: node };')
edit('src/video-page.js','D.parse(new URL(node.getAttribute("href"), node.baseURI).href)','D.candidate(new URL(node.getAttribute("href"), node.baseURI).href)')
edit('src/video-page.js','return { url: value.url, title, cover:', 'return { ...value, link:undefined, url: value.url, title, cover:')
edit('src/video-page.js','已加入 " + added + " 个视频"', '已加入 " + added + " 项，可继续点选"')
edit('src/video-page.js','await add({ url: $("vq-url").value });','await add(D.candidate($("vq-url").value));')
# One visible current-page action; the bridge accepts its former command too.
p=root/'src/video-page.js';s=p.read_text(encoding='utf-8');a=s.index('    $("vq-live").hidden');b=s.index('    $("vq-clear-watched")',a);s=s[:a]+s[b:];p.write_text(s,encoding='utf-8')
edit('src/video-page.js','    const storageChanged =', '''    for(const button of $("vq-platforms").children){button.onclick=()=>{platform=button.dataset.provider;render();};button.onkeydown=event=>{const keys=["ArrowLeft","ArrowRight","Home","End"];if(!keys.includes(event.key))return;event.preventDefault();const buttons=[...$("vq-platforms").children];let index=buttons.indexOf(button);index=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;buttons[index].click();buttons[index].focus();};}
    const storageChanged =''')
edit('src/panel-bridge.js','"video-live":"vq-live"','"video-live":"vq-current"')
edit('src/desktop/panel-app.js','    ui.$("vq-live").onclick = () => pageEvent({ command: "video-live" });\n','')
edit('src/desktop/panel-app.js','ui.$("vq-current").disabled = ui.$("vq-live").disabled','ui.$("vq-current").disabled')

# Shared button additions belong here, before the closing BUTTON_CSS literal.
edit('src/panel.js','    .thumb-button,.editor-thumbnail', '''    .provider-tab{flex:1;min-width:0}
    .provider-tab[aria-selected="true"]{border-color:var(--button-selected-border);box-shadow:inset 0 0 0 1px var(--button-selected-border)}
    .thumb-button,.editor-thumbnail''')
edit('src/panel.js','    .settings-page{min-height:240px}', '''    .settings-page{min-height:240px;display:flex;flex-direction:column;gap:20px}
    .settings-page strong,.settings-page h3{display:block;line-height:1.6}.settings-page p{line-height:1.6;margin:8px 0 12px}
    .settings-page>.library{margin:0;padding:0;border:0}.settings-page>section{min-width:0}
    .settings-page label{display:flex;align-items:center;gap:8px;line-height:1.6}.settings-page input[type="checkbox"]{accent-color:#376859}
    .provider-tabs{display:flex;gap:6px;padding:5px;background:#f3f7f5;border:1px solid #dce6e1;border-radius:12px;margin:14px 0 6px}
    .disclosure-card{border:1px solid #dce6e1;border-radius:12px;padding:12px;background:#fff;margin:12px 0}
    .disclosure-card>summary{cursor:pointer;color:#376859;font-size:12px;line-height:1.6}.disclosure-card[open]>summary{margin-bottom:12px}
    .hover-bubble{position:fixed;z-index:6;pointer-events:auto;max-width:calc(100vw - 24px);padding:8px;border:1px solid #cbdad1;border-radius:12px;background:#fff;color:#293c38;box-shadow:0 8px 32px #0003}
    .hover-bubble img,.hover-bubble video,.hover-bubble canvas{display:block;max-width:min(360px,calc(100vw - 40px));max-height:min(280px,calc(100vh - 72px));object-fit:contain}
    .hover-bubble p{margin:6px 0 0;font-size:12px;line-height:1.6}
''')
# Group backup content so settings spacing separates sections, not each line.
edit('src/panel.js','          <strong>导入与导出设置</strong>', '          <section id="backup-section"><strong>导入与导出设置</strong>')
edit('src/panel.js','          <section class="library" id="native-settings"','          </section><section id="hover-settings"><strong>网页预览</strong><label><input id="hover-images" type="checkbox" checked>鼠标悬停预览图片</label><p class="status" id="hover-settings-status" role="status"></p></section>\n          <section class="library" id="native-settings"')
print('Updated continuous picker, combined capture, provider tabs and common layouts')
