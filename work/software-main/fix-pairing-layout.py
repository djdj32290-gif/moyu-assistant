from pathlib import Path
p=Path(__file__).resolve().parents[2]/'src/desktop/panel-app.js'
text=p.read_text(encoding='utf-8')
text=text.replace('.connection-light{display:inline-block;', '.pairing-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.connection-light{display:inline-block;')
text=text.replace('<div class="rule-actions"><button id="browser-install"', '<div class="rule-actions pairing-actions"><button id="browser-install"')
p.write_text(text,encoding='utf-8')
