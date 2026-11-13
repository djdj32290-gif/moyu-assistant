from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
file = root / 'src/panel.js'
text = file.read_text(encoding='utf-8')
start = text.index('  const CSS_TEXT = `')
end = text.index('\n  function create()', start)
css = text[start:end]
button_selector = re.compile(r'\bbutton\b|\.(?:primary|secondary|choose|choosing|smallbutton|textbutton|iconbutton|level|level-reset|round-button|manage-button|panel-tab|cancel-button|thumb-button|editor-thumbnail)(?![\w-])')

def keep_layout(match):
    selectors, declarations = match.groups()
    kept = [selector.strip() for selector in selectors.split(',') if not button_selector.search(selector)]
    return ','.join(kept) + '{' + declarations + '}' if kept else ''

# Remove the accumulated, conflicting button rules instead of adding another
# layer of per-control overrides. Keep the unrelated panel and page layout.
css = re.sub(r'([^{}]+)\{([^{}]*)\}', keep_layout, css)
css = css.replace('    @media(prefers-reduced-motion:reduce)', '    ${BUTTON_CSS}\n    @media(prefers-reduced-motion:reduce)')
foundation = '''  // All action controls share this foundation. See /AGENTS.md before adding styles.
  const BUTTON_CSS = `
    :host{
      --button-radius:8px;--button-height:34px;--button-compact-height:28px;
      --button-font-size:12px;--button-weight:500;--button-line-height:20px;
      --button-border:#cbdad1;--button-bg:#edf4f1;--button-ink:#376859;
      --button-hover-bg:#e1eee7;--button-hover-border:#9fbdad;--button-pressed-bg:#d5e5dc;
      --button-selected-bg:#e9f3ed;--button-selected-border:#75a28d;
      --button-danger:#b44242;--button-danger-bg:#fff5f3;--button-danger-border:#e6bdb6;
      --button-focus:#538775;--button-icon-size:16px;
    }
    button{
      appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;
      min-width:0;min-height:var(--button-height);padding:6px 10px;
      border:1px solid var(--button-border);border-radius:var(--button-radius);
      background:var(--button-bg);color:var(--button-ink);box-shadow:none;
      font-family:inherit;font-size:var(--button-font-size);font-weight:var(--button-weight);line-height:var(--button-line-height);
      letter-spacing:normal;text-align:center;text-decoration:none;white-space:nowrap;vertical-align:middle;
      cursor:pointer;outline-offset:3px;transition:background-color .16s,border-color .16s,color .16s;
    }
    button svg{width:var(--button-icon-size);height:var(--button-icon-size);flex:none}
    button:hover:enabled{background:var(--button-hover-bg);border-color:var(--button-hover-border)}
    button:active:enabled{background:var(--button-pressed-bg);border-color:var(--button-hover-border)}
    button:focus-visible{outline:2px solid var(--button-focus)}
    button:disabled{opacity:.45;cursor:default}
    .primary{width:100%;background:var(--accent);border-color:var(--accent);color:white}
    .primary:hover:enabled{background:var(--accent-hover);border-color:var(--accent-hover)}
    .primary:active:enabled{background:#244a3f;border-color:#244a3f}
    .secondary{width:100%}.choose{margin:0}
    .choosing{background:var(--button-selected-bg);border-color:var(--button-selected-border)}
    .scope-buttons button{flex:1;margin:0;padding-inline:6px}
    .presets button,.round-button,.textbutton{min-height:var(--button-compact-height);padding:3px 8px}
    .presets button{flex:1;padding-inline:0}.round-button{min-width:32px;padding-inline:5px}
    .presets button.active,.level.active,.panel-tab[aria-selected="true"]{background:var(--button-selected-bg);border-color:var(--button-selected-border);color:var(--button-ink)}
    .textbutton.danger{background:var(--button-danger-bg);border-color:var(--button-danger-border);color:var(--button-danger)}
    .textbutton.danger:hover:enabled{background:#fce8e4;border-color:#d9988d;color:#902e2e}
    .textbutton.danger:active:enabled{background:#f7d9d3;border-color:#d9988d;color:#902e2e}
    .manage-button{width:100%;margin:12px 0 0}.manage-button>span:last-child{margin-left:auto}
    .iconbutton{width:32px;height:32px;min-height:32px;padding:0;border-color:transparent;background:transparent;color:var(--muted);flex:none}
    .level{position:relative;flex:1;padding-inline:0}.level.changed::after{content:"";position:absolute;right:3px;top:3px;width:5px;height:5px;border-radius:50%;background:var(--accent)}
    .level-reset{flex:none;width:26px;padding:0;font-size:18px}
    .panel-tab{position:relative;width:44px;height:44px;min-height:44px;padding:0;background:white;color:var(--muted)}
    .panel-tab svg{width:21px;height:21px}.panel-tab[aria-selected="true"]::before{content:"";position:absolute;left:-1px;top:12px;bottom:12px;width:3px;border-radius:2px;background:var(--accent)}
    .thumb-button,.editor-thumbnail{min-height:0;cursor:zoom-in}
    .thumb-button{display:flex;flex:none;margin-top:2px;padding:0;line-height:0}
    .thumb-button>.rule-thumb{border:0;border-radius:calc(var(--button-radius) - 1px)}
    .editor-thumbnail{display:flex;width:100%;padding:5px;margin:0 0 10px}
    .editor-thumbnail img{display:block;max-width:100%;height:auto;max-height:110px;object-fit:contain}
    .drag-handle{min-height:0;padding:3px 2px;border:0;background:transparent;color:inherit;justify-content:flex-start;gap:8px;font:inherit;text-align:left;white-space:normal;cursor:grab}
    .drag-handle:hover:enabled,.drag-handle:active:enabled{background:transparent;border:0;color:inherit}.drag-handle:active{cursor:grabbing}
  `;
'''
file.write_text(text[:start] + foundation + css + text[end:], encoding='utf-8')
