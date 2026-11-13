from pathlib import Path
root = Path(__file__).resolve().parents[2]
p = root / 'src/video-page.js'
s = p.read_text(encoding='utf-8')
s = s.replace('.vq-add{border:1px solid #bccfc5;border-radius:7px;background:#edf4f1;color:#376859;padding:6px 10px;white-space:nowrap;min-height:36px}', '.vq-add{flex:none}')
s = s.replace('.vq-row-actions button,.vq-row-actions a{border:0;background:transparent;color:#376859;padding:5px 0;font:inherit;font-size:12px;text-decoration:none;cursor:pointer;min-height:30px}.vq-row-actions .vq-remove{color:#b44242}', '.vq-row-actions a{color:#376859;font-size:12px;text-decoration:none}')
s = s.replace('    <form class="vq-form"', '    <div class="vq-actions"><button class="secondary" id="vq-pick" type="button" aria-pressed="false">点选网页视频加入</button></div>\n    <form class="vq-form"')
s = s.replace('else await request("ROOM");', 'else await request("ROOM", { id: item.id });')
s = s.replace('remove.className = "vq-remove";', 'remove.className = "textbutton danger";')
s = s.replace('play.type = "button";', 'play.type = "button"; play.className = "textbutton";')
s = s.replace('window.open(new URL("watchroom.html", location.href), "point-resize-video-room")', 'window.open(new URL("watchroom.html" + (args.id ? "#" + encodeURIComponent(args.id) : ""), location.href), "point-resize-video-room")')
s = s.replace('    $("vq-current").hidden = room;', '''    let picking = false;
    function cancelPicking() { picking = false; $("vq-pick").textContent = "点选网页视频加入"; $("vq-pick").setAttribute("aria-pressed", "false"); }
    $("vq-pick").hidden = room;
    $("vq-pick").onclick = () => {
      picking = !picking; $("vq-pick").setAttribute("aria-pressed", String(picking));
      $("vq-pick").textContent = picking ? "取消点选" : "点选网页视频加入";
      status(picking ? "请点击网页中的 B 站视频卡片或链接；按 Esc 取消。" : "已退出点选。");
    };
    if (!room) {
      window.addEventListener("click", event => {
        if (!picking || $("videos-page").hidden || $("panel").hidden || event.composedPath().includes(ui.host)) return;
        const link = event.composedPath().find(node => node instanceof Element && node.matches("a[href]"));
        if (!link) { status("请点视频卡片里的链接，或粘贴完整视频链接。", true); return; }
        let value;
        try { value = D.parse(link.href); } catch { status("这个链接不是支持的 B 站视频，请换一个。", true); return; }
        event.preventDefault(); event.stopImmediatePropagation();
        const image = link.querySelector("img");
        const title = link.getAttribute("title") || image?.alt || link.textContent.trim() || value.code;
        cancelPicking(); add({ ...value, title, cover: image?.currentSrc || image?.src }).catch(error => status(error.message, true));
      }, true);
      window.addEventListener("keydown", event => { if (picking && event.key === "Escape") { cancelPicking(); status("已退出点选。"); event.preventDefault(); event.stopImmediatePropagation(); } }, true);
    }
    $("vq-current").hidden = room;''')
s = s.replace('return { refresh, status, get items()', 'return { refresh, status, cancelPicking, get items()')
p.write_text(s, encoding='utf-8')
p = root / 'src/watchroom.css'
s = p.read_text(encoding='utf-8')
start = s.index('button{transition:')
end = s.index('.launcher{', start)
s = s[:start] + 'input:focus-visible,a:focus-visible{outline:2px solid #538775;outline-offset:3px}' + s[end:]
s = s.replace('.now-actions button{font-size:12px;padding:6px 10px;min-height:34px}', '.now-actions>.secondary{width:auto}')
s += '\n.launcher>.primary,.launcher>.secondary{width:auto;flex:none}\n'
p.write_text(s, encoding='utf-8')
p = root / 'src/content.js'
s = p.read_text(encoding='utf-8').replace('    state.tab = tab;\n', '    videoPage?.cancelPicking();\n    state.tab = tab;\n')
s = s.replace('function close() { state.visible', 'function close() { videoPage?.cancelPicking(); state.visible')
p.write_text(s, encoding='utf-8')
p = root / 'src/background.js'
s = p.read_text(encoding='utf-8')
s += '''
// Keep persistent registrations current when upgrading from a previous version.
chrome.runtime.onInstalled.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  for (const script of scripts.filter(item => item.id.startsWith("point-resize-"))) {
    await chrome.scripting.updateRegisteredContentScripts([{ id: script.id, js: FILES }]);
  }
});
'''
p.write_text(s, encoding='utf-8')
