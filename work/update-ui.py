from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
file = root / 'src/panel.js'
text = file.read_text(encoding='utf-8')
def monochrome(match):
    value = match[0].lower()
    if value in ('#f03545', '#ef334009', '#ef3340', '#c41e31'):
        return value  # Red remains the functional page selection indicator.
    if value in ('#1e3a5f', '#285caa', '#2c60a9', '#dc3545'):
        return '#1b1b1b'
    if value == '#669cee':
        return '#555555'
    raw = value[1:]
    if len(raw) in (3, 4):
        raw = ''.join(c * 2 for c in raw)
    r, g, b = (int(raw[i:i+2], 16) for i in (0, 2, 4))
    gray = round(r * .2126 + g * .7152 + b * .0722)
    return '#' + f'{gray:02x}' * 3 + raw[6:]
text = re.sub(r'#[0-9a-fA-F]{3,8}\b', monochrome, text)
text = text.replace('.page-group{margin:7px 0;', '.page-group{margin:0;')
text = text.replace('          <p class="emptyguide" id="emptyguide">悬停看红框 → 点击选中 → 滑动调整</p>\n', '')
text = text.replace('    @media(prefers-reduced-motion:reduce)', '''    .page-records>.rule:last-child{border-bottom:0}
    .empty-skeleton{display:flex;align-items:center;gap:12px;min-height:86px;margin:9px 0 2px;padding:15px;border:1px solid #e5e5e5;border-radius:8px;background:#fafafa}
    .skeleton-thumb{flex:none;width:49px;height:40px;border:1px solid #e8e8e8;border-radius:5px;background:#ededed}
    .skeleton-copy{display:flex;flex:1;flex-direction:column;gap:8px}.skeleton-copy i{display:block;height:7px;border-radius:3px;background:#e8e8e8}.skeleton-copy i:nth-child(1){width:65%}.skeleton-copy i:nth-child(2){width:90%}.skeleton-copy i:nth-child(3){width:40%}
    @media(prefers-reduced-motion:reduce)''')
file.write_text(text, encoding='utf-8')
file = root / 'src/build.py'
text = file.read_text(encoding='utf-8').replace('(30, 58, 95, 255)', '(27, 27, 27, 255)').replace('(128, 180, 215, 255)', '(160, 160, 160, 255)')
file.write_text(text, encoding='utf-8')
