from pathlib import Path

root = Path(__file__).resolve().parent.parent

def replace(file, old, new):
    p = root / 'src' / file
    s = p.read_text(encoding='utf-8')
    assert old in s, (file, old[:100])
    p.write_text(s.replace(old, new), encoding='utf-8')

replace('panel.js', '<div class="numberwrap"><input id="number"', '<div class="numberwrap"><button class="round-button" id="round-down" type="button"></button><button class="round-button" id="round-up" type="button"></button><input id="number"')
replace('panel.js', '<section class="library"><div class="libraryhead"><strong>此网站已保存 <span id="rule-count">0</span> 项</strong><label class="toggle"><input type="checkbox" id="enabled" checked>全部启用</label></div><div id="rules"></div></section>', '<button class="manage-button" id="manage" type="button">管理保存项 <span class="manage-count" id="rule-count">0</span><span aria-hidden="true">↗</span></button>')
replace('panel.js', 'const r = panel.getBoundingClientRect(), width = rail.getBoundingClientRect().width;', 'const r = panel.getBoundingClientRect(), slider = $("range").getBoundingClientRect(), width = rail.getBoundingClientRect().width;')
replace('panel.js', 'Math.min(r.top, innerHeight - rail.getBoundingClientRect().height - 8)', 'Math.min(slider.top - 12 * uiScale, innerHeight - rail.getBoundingClientRect().height - 8)')
replace('panel.js', '    @media(prefers-reduced-motion:reduce)', '''    .numberwrap{align-items:center;gap:4px}.round-button{font-size:11px;border:1px solid #d6e0ec;border-radius:6px;background:#f5f8fd;color:#365276;padding:4px 5px;min-height:30px;min-width:32px}.round-button:hover:enabled{background:#e9f1ff}.fieldtop{flex-wrap:wrap;gap:5px}.fieldtop label{font-size:12px}
    .manage-button{display:flex;align-items:center;gap:7px;width:100%;margin-top:12px;padding:10px 2px 0;border:0;border-top:1px solid #e8edf4;background:transparent;color:#365276;font-size:12px;text-align:left}.manage-button>span:last-child{margin-left:auto}.manage-count{display:inline-grid;place-items:center;min-width:20px;border-radius:5px;background:#edf3fb;padding:0 4px}
    .image-viewer{display:flex;align-items:center;justify-content:center}.preview-dialog{align-items:center;max-width:100%}.preview-head{align-self:stretch}.preview-image{margin:auto;object-position:center;flex:none}
    @media(prefers-reduced-motion:reduce)''')
replace('manifest.json', '"version": "0.4.0"', '"version": "0.5.0"')
