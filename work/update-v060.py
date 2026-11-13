from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
src = root / 'src'

def replace(file, old, new):
    p = src / file
    s = p.read_text(encoding='utf-8')
    assert old in s, (file, old[:100])
    p.write_text(s.replace(old, new), encoding='utf-8')

replace('panel.js', '    @media(prefers-reduced-motion:reduce)', '''    .saved-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;border:1px solid #e1e7ef;background:#f7f9fc;color:#365276;border-radius:8px;padding:8px 10px;margin-top:9px;font-size:12px;min-height:34px}
    .library{border-top:0;margin-top:10px;padding-top:0}.libraryhead{margin-bottom:3px}.libraryhead strong{font-size:12px}.libraryhead .toggle{white-space:nowrap}
    .edit-heading{display:flex;align-items:center;justify-content:space-between;margin-top:8px;color:#607086;font-size:11px}.edit-heading button{min-height:30px}
    .rule{align-items:flex-start;padding:10px 0;gap:7px}.rule-check{margin-top:11px}.thumb-button{padding:0;border:0;border-radius:5px;background:transparent;display:flex;flex:none;cursor:zoom-in;margin-top:2px}.rule-thumb{width:48px;height:38px}.rule-copy{min-width:0;flex:1}.rule-name input{width:100%;border:1px solid transparent;border-radius:4px;background:transparent;padding:1px 2px;color:#203e62;font-size:12px;min-width:0}.rule-name input:hover{border-color:#d6e0ec}.rule-name input:focus{border-color:#669cee;background:#fff}.rule-actions{display:flex;gap:9px;margin-top:2px}.rule-actions .textbutton{min-height:24px;padding:2px 0}.ruleval{margin-top:1px;padding-left:2px;font-size:10px;line-height:1.5}.rule.disabled .rule-copy{opacity:.6}.empty{line-height:1.7;margin:12px 0}
    .all-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.all-head strong{font-size:13px}.site-search{width:100%;border:1px solid #d6e0ec;border-radius:7px;background:#fff;padding:7px 9px;font-size:12px;color:#203e62;margin-bottom:10px}.site-group{border:1px solid #e1e7ef;border-radius:9px;margin-bottom:9px;overflow:hidden}.site-group summary{padding:10px 9px;background:#f5f8fc;cursor:pointer;font-size:12px;font-weight:600;overflow-wrap:anywhere}.site-group summary span{font-size:11px;font-weight:400;color:#607086;margin-left:5px}.site-records{padding:0 9px 7px}.site-records .libraryhead{padding-top:6px}.site-records .rule:last-child{border-bottom:0}.manage-button{padding-bottom:5px}.all-note{font-size:11px;color:#607086;margin:0 0 10px}
    @media(prefers-reduced-motion:reduce)''')
replace('panel.js', '<p class="emptyguide" id="emptyguide">悬停看红框 → 点击选中 → 滑动调整</p>', '''<p class="emptyguide" id="emptyguide">悬停看红框 → 点击选中 → 滑动调整</p>
          <button class="saved-toggle" id="saved-toggle" hidden aria-expanded="false"><span id="saved-summary"></span><span id="saved-arrow">▾</span></button>
          <section class="library" id="library" aria-label="当前网站保存项">
            <div class="libraryhead"><strong>此网站已保存 <span id="rule-count">0</span> 项</strong><label class="toggle"><input type="checkbox" id="enabled">全部启用</label></div>
            <div id="rules"></div>
            <button class="manage-button" id="manage" type="button">全部网站记录<span aria-hidden="true">→</span></button>
          </section>
          <div class="edit-heading" id="edit-heading" hidden><span>调整后点击保存</span><button class="textbutton" id="cancel-edit">取消并返回列表</button></div>''')
replace('panel.js', '          <button class="manage-button" id="manage" type="button">管理保存项 <span class="manage-count" id="rule-count">0</span><span aria-hidden="true">↗</span></button>', '''          <section id="all-view" hidden aria-label="全部网站保存记录">
            <div class="all-head"><button class="textbutton" id="all-back">← 当前网站</button><strong>全部网站记录</strong></div>
            <p class="all-note">按网站分类，开关与修改立即保存到本机。</p>
            <input class="site-search" id="site-search" type="search" placeholder="搜索网站或保存项" aria-label="搜索网站或保存项">
            <div id="all-records"></div>
          </section>''')

replace('content.js', 'profile: { enabled: true, rules: [] }, session:', 'view: "current", libraryCollapsed: true, allProfiles: {}, allLoad: 0, profile: { enabled: true, rules: [] }, session:')
replace('content.js', '  function renderRules() { $("rule-count").textContent = state.profile.rules.length; }', '''  function layout() {
    const all = state.view === "all", editing = state.view === "edit";
    $("choose").hidden = all;
    $("saved-toggle").hidden = !editing;
    $("saved-summary").textContent = "已保存 " + state.profile.rules.length + " 项";
    $("saved-toggle").setAttribute("aria-expanded", String(!state.libraryCollapsed));
    $("saved-arrow").textContent = state.libraryCollapsed ? "▾" : "▴";
    $("library").hidden = all || (editing && state.libraryCollapsed);
    $("edit-heading").hidden = !editing;
    $("editor").hidden = !editing || !state.libraryCollapsed || !state.draft;
    $("emptyguide").hidden = all || !!state.draft || (!state.picking && !!state.profile.rules.length);
    $("emptyguide").textContent = state.picking ? "悬停看红框 → 点击选中 → 滑动调整" : "还没有保存项，点击上方按钮开始调整。";
    $("all-view").hidden = !all;
    ui.syncControls();
  }
  function finishEdit(message = "已取消未保存的调整。") {
    setPicking(false); clearSelection(); state.view = "current"; state.libraryCollapsed = true;
    apply(); renderRules(); status(message);
  }
  function bulkToggle(input, profile, site) {
    const count = profile.rules.filter(item => item.enabled !== false).length;
    input.checked = !!profile.rules.length && count === profile.rules.length;
    input.indeterminate = count > 0 && count < profile.rules.length; input.disabled = !profile.rules.length;
    input.onchange = () => updateProfile(site, data => data.rules.forEach(item => { item.enabled = input.checked; }));
  }
  async function updateProfile(site, mutate) {
    const storageKey = "point-resize:v1:" + site;
    try {
      const data = await chrome.storage.local.get(storageKey), profile = sanitizeProfile(data[storageKey] || {});
      mutate(profile); await chrome.storage.local.set({ [storageKey]: profile }); status("已保存。");
    } catch (error) { renderRules(); if (state.view === "all") loadAll(); status("保存失败：" + error.message, true); }
  }
  function ruleRow(item, site) {
    const row = document.createElement("article"); row.className = "rule" + (item.enabled === false ? " disabled" : "");
    row.setAttribute("aria-label", item.label || item.defaultLabel || "内容区域");
    const check = document.createElement("input"); check.type = "checkbox"; check.className = "rule-check"; check.checked = item.enabled !== false;
    check.setAttribute("aria-label", "启用 " + (item.label || "内容区域"));
    check.onchange = () => updateProfile(site, profile => { const target = profile.rules.find(rule => rule.id === item.id); if (target) target.enabled = check.checked; });
    const thumb = document.createElement(item.thumbnail ? "button" : "span");
    if (item.thumbnail) {
      thumb.type = "button"; thumb.className = "thumb-button"; thumb.setAttribute("aria-label", "查看 " + item.label + " 的截图"); thumb.title = "双击查看大图";
      const image = document.createElement("img"); image.className = "rule-thumb"; image.src = item.thumbnail; image.alt = item.label + " 区域截图"; thumb.append(image);
      thumb.ondblclick = () => ui.showPreview(item.thumbnail, item.label);
      thumb.onkeydown = event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); ui.showPreview(item.thumbnail, item.label); } };
    } else { thumb.className = "rule-thumb empty-thumb"; thumb.textContent = "无预览"; }
    const copy = document.createElement("div"); copy.className = "rule-copy";
    const name = document.createElement("label"); name.className = "rule-name";
    const input = document.createElement("input"); input.value = item.name || ""; input.placeholder = item.defaultLabel || item.label; input.maxLength = 60; input.setAttribute("aria-label", "保存项名称");
    input.onchange = () => { const value = input.value.trim(); updateProfile(site, profile => { const target = profile.rules.find(rule => rule.id === item.id); if (target) { target.name = value; target.label = value || target.defaultLabel || "内容区域"; } }); };
    name.append(input);
    const value = document.createElement("span"); value.className = "ruleval";
    value.textContent = layersOf(item).map(rule => "第" + (rule.level || 1) + "层 " + rule.value + (rule.mode === "font" ? "px" : "%")).join(" · ");
    const actions = document.createElement("div"); actions.className = "rule-actions";
    const edit = document.createElement("button"); edit.className = "textbutton"; edit.textContent = site === location.hostname ? "调整" : "到网页调整";
    edit.onclick = async () => {
      if (site === location.hostname) { const result = editSaved(item.id); if (!result.ok) status(result.error, true); }
      else if (chrome.runtime.id) {
        try { const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_EDIT_ON_PAGE", site, id: item.id }); if (!result?.ok) status(result?.error || "打开网页失败。", true); }
        catch (error) { status(error.message, true); }
      } else status("体验页仅支持调整当前网站；跨网站调整请使用真实扩展。", true);
    };
    const remove = document.createElement("button"); remove.className = "textbutton danger"; remove.textContent = "删除";
    remove.onclick = () => updateProfile(site, profile => { profile.rules = profile.rules.filter(rule => rule.id !== item.id); });
    actions.append(edit, remove); copy.append(name, value, actions); row.append(check, thumb, copy); return row;
  }
  function renderRules() {
    $("rule-count").textContent = state.profile.rules.length;
    bulkToggle($("enabled"), state.profile, location.hostname || "local-demo");
    $("rules").replaceChildren(...state.profile.rules.map(item => ruleRow(item, location.hostname)));
    if (!state.profile.rules.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "保存后的名称、截图和开关会显示在这里。"; $("rules").append(empty); }
    layout();
  }
  async function loadAll() {
    const revision = ++state.allLoad;
    try {
      const data = await chrome.storage.local.get(null); if (revision !== state.allLoad || state.view !== "all") return;
      state.allProfiles = Object.fromEntries(Object.entries(data).filter(([name]) => name.startsWith("point-resize:v1:")).map(([name, profile]) => [name.slice("point-resize:v1:".length), sanitizeProfile(profile || {})]));
      renderAll();
    } catch (error) { status("读取保存项失败：" + error.message, true); }
  }
  function renderAll() {
    const opened = new Set([...$("all-records").querySelectorAll("details[open]")].map(node => node.dataset.site));
    const query = $("site-search").value.trim().toLowerCase(), groups = [];
    const profiles = Object.entries(state.allProfiles).filter(([, profile]) => profile.rules.length).sort(([a], [b]) => a === location.hostname ? -1 : b === location.hostname ? 1 : a.localeCompare(b));
    for (const [site, profile] of profiles) {
      const items = profile.rules.filter(item => !query || site.toLowerCase().includes(query) || (item.label || "").toLowerCase().includes(query));
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
      records.append(head, ...items.map(item => ruleRow(item, site))); group.append(summary, records); groups.push(group);
    }
    $("all-records").replaceChildren(...groups);
    if (!groups.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = query ? "没有匹配的保存记录。" : "还没有任何网站保存记录。"; $("all-records").append(empty); }
    ui.syncControls();
  }''')
replace('content.js', 'const d = state.draft; $("editor").hidden = !d; $("emptyguide").hidden = !!d;', 'const d = state.draft; layout();')
replace('content.js', 'if (picking) { clearSelection(); apply();', 'if (picking) { state.view = "edit"; state.libraryCollapsed = true; clearSelection(); apply();')
replace('content.js', '    else { if (!state.session) state.selected = null; draw(); }\n  }\n  function makeEntry', '    else { if (!state.session) state.selected = null; draw(); }\n    layout();\n  }\n  function makeEntry')
replace('content.js', '    state.session = s; state.dirty = !existing;', '    state.view = "edit"; state.libraryCollapsed = true; state.session = s; state.dirty = !existing;')
replace('content.js', '    renderRules(); setPicking(false); status(state.session ? "可以继续调整，或重新选择网页内容。" : "点击“选择网页内容”开始选取。");', '    setPicking(false); clearSelection(); state.view = "current"; state.libraryCollapsed = true; apply(); renderRules(); status();')
replace('content.js', '$("choose").onclick = () => setPicking(!state.picking);', '$("choose").onclick = () => state.picking ? finishEdit("已退出选取。") : setPicking(true);\n  $("cancel-edit").onclick = () => finishEdit();\n  $("saved-toggle").onclick = () => { state.libraryCollapsed = !state.libraryCollapsed; layout(); };\n  $("all-back").onclick = () => { state.view = state.session || state.picking ? "edit" : "current"; renderRules(); status(); };\n  $("site-search").oninput = renderAll;')
replace('content.js', 'await persist(); state.dirty = false; renderRules(); apply();', 'await persist(); finishEdit("");')
replace('content.js', '''    if (chrome.runtime.id) chrome.runtime.sendMessage({ type: "POINT_RESIZE_MANAGE" }).catch(error => status(error.message, true));
    else window.open(new URL("manager.html?site=" + encodeURIComponent(location.hostname), location.href), "point-resize-manager");''', '''    state.view = "all"; $("site-search").value = ""; $("all-records").replaceChildren();
    layout(); status(); loadAll();''')
replace('content.js', '    if (state.picking) { setPicking(false); status("已退出选取。"); } else close();', '    if (state.view === "all") $("all-back").click();\n    else if (state.view === "edit") finishEdit(); else close();')
replace('content.js', '''    if (area !== "local" || !changes[key]) return;
    const editingSaved = state.profile.rules.some(item => item.id === state.session?.id);
    state.profile = sanitizeProfile(changes[key].newValue || {});
    if (editingSaved && !state.profile.rules.some(item => item.id === state.session?.id && item.enabled !== false)) clearSelection();
    apply(); if (state.visible) renderRules();''', '''    if (area !== "local") return;
    if (changes[key]) {
      const editingSaved = state.profile.rules.some(item => item.id === state.session?.id);
      state.profile = sanitizeProfile(changes[key].newValue || {});
      if (editingSaved && !state.profile.rules.some(item => item.id === state.session?.id && item.enabled !== false)) {
        const all = state.view === "all"; clearSelection(); if (!all) state.view = "current";
      }
      apply(); if (state.visible) renderRules();
    }
    if (state.visible && state.view === "all" && Object.keys(changes).some(name => name.startsWith("point-resize:v1:"))) loadAll();''')

replace('demo-boot.js', 'async get(key) { try { return { [key]: JSON.parse(localStorage.getItem(key) || "null") }; } catch { return {}; } },', '''async get(key) { try {
          const keys = key == null ? Object.keys(localStorage) : Array.isArray(key) ? key : [key];
          return Object.fromEntries(keys.map(name => [name, JSON.parse(localStorage.getItem(name) || "null")]));
        } catch { return {}; } },''')
p = src / 'background.js'; s = p.read_text(encoding='utf-8')
start = s.index('async function manageSaved('); end = s.index('async function editSavedOnPage(', start)
s = s[:start] + s[end:]
s = s.replace('  else if (message.type === "POINT_RESIZE_MANAGE" && sender.tab) operation = manageSaved({ site: new URL(sender.tab.url).hostname });\n', '')
s = s.replace('message.type === "POINT_RESIZE_MANAGER_EDIT" && sender.url?.startsWith(chrome.runtime.getURL("manager.html"))', 'message.type === "POINT_RESIZE_EDIT_ON_PAGE" && sender.tab')
p.write_text(s, encoding='utf-8')
p = src / 'manifest.json'; data = json.loads(p.read_text(encoding='utf-8')); data['version'] = '0.6.0'; data.pop('options_ui', None); p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
# These owned files were only the removed 0.5.0 management page, no media or user data.
for name in ('manager.html', 'manager.js', 'manager.css'):
    for directory in (src, root / 'outputs' / '点选缩放'):
        p = directory / name
        assert p.resolve().parent == directory.resolve()
        p.unlink(missing_ok=True)

p = src / '使用说明.md'; s = p.read_text(encoding='utf-8').replace('0.5.0','0.6.0')
start = s.index('## 独立保存管理页'); end = s.index('## 区域截图与大图', start)
s = s[:start] + '''## 浮窗里的保存记录

点击扩展先显示当前网站的保存项，带名称、截图、启用复选框、调整和删除按钮；不会直接进入捕获，也不会打开管理标签页。

点击“选择网页内容”新增，或点击已有项的“调整”，进入调整状态。原来的保存项收成“已保存 N 项”一行；点击可展开查看，再点击收起返回滑杆，当前草稿和各层参数保留。展开时左侧层级栏暂时隐藏，收起后恢复。改动列表名称后按 Tab 或点击别处保存，留空恢复自动名称。

点击“保存到此网站”会保存所有暂存层级，然后回到当前网站列表。点“取消并返回列表”、Esc、关闭或重新选取会撤销尚未保存的预览。重新打开扩展默认回到当前网站列表。

点击列表下方“全部网站记录”，在同一个浮窗里按网站分组查看所有记录，可展开网站并搜索网站或保存项；点击“← 当前网站”返回。每项可开关、改名、删除，网站的“全部启用”只控制该网站全部记录；部分启用时显示半选。当前网页会即时响应开关和删除，其他网站设置相互独立。

当前网站的“调整”直接回到编辑；其他网站显示“到网页调整”，优先激活已有对应网页，没有时才打开保存时的网址。这是打开目标内容网页，不是打开管理页。权限被拒绝时需要先在目标网页点击扩展允许访问。

''' + s[end:]
s = s.replace('在管理页双击截图', '在浮窗保存项中双击截图').replace('独立管理页使用正常标签页缩放。', '全部网站记录和截图预览也在同一个浮窗中显示。')
p.write_text(s, encoding='utf-8')
p = src / '安装说明.html'; s = p.read_text(encoding='utf-8').replace('0.5.0','0.6.0').replace('直接打开网页调整面板。', '先显示当前网站的保存项，不自动进入选取。').replace('点击<b>保存到此网站</b>，下次访问自动应用。', '点击<b>保存到此网站</b>回到记录列表，下次访问自动应用。')
s = s.replace('点击“管理保存项”会在新标签页按网站分类管理，网站下分别列出各条设置。', '新增或调整时，已有记录收成“已保存 N 项”一行，展开查看不会丢失当前草稿。点击“全部网站记录”在同一浮窗里按网站分类查看，返回即可回到当前网站，不打开管理标签页。').replace('管理页中每项可单独开关', '列表中每项可单独开关')
p.write_text(s, encoding='utf-8')
print('Updated 0.6.0 source and documentation')
