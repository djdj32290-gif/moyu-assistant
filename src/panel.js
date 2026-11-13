(() => {
  if (globalThis.PointResizePanel) return;
  const PREVIEW_KEY='point-resize:hover-preview:v1',PREVIEW_SIZE_KEY='point-resize:hover-size:v1';
  const previewScale=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(.5,Math.min(3,Math.round(value*100)/100)):1;
  const icons = {
    pointer: '<path d="m4 3 6 17 3-7 7-3L4 3Z"/><path d="m13 13 6 6"/>',
    video: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 4-6 5 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    pin: '<path d="m8 3 8 0-1 6 3 4H6l3-4-1-6ZM12 13v8"/>',
    move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
    dock: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    camera: '<path d="M8 6 10 3h4l2 3h4v14H4V6Z"/><circle cx="12" cy="12" r="4"/>',
    settings: '<path d="m9 3-.6 2.2-2 .9-2-.6-2 3.5 1.6 1.6v2.8L2.4 15l2 3.5 2-.6 2 .9L9 21h4l.6-2.2 2-.9 2 .6 2-3.5-1.6-1.6v-2.8L19.6 9l-2-3.5-2 .6-2-.9L13 3Z"/><circle cx="11" cy="12" r="3"/>'
  };
  const icon = name => `<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.image}</svg>`;
  // All action controls share this foundation. See /AGENTS.md before adding styles.
  const BUTTON_CSS = `
    :host{
      --button-radius:8px;--button-height:34px;--button-compact-height:28px;
      --button-font-size:12px;--button-weight:500;--button-line-height:20px;
      --button-border:#cbdad1;--button-bg:#edf4f1;--button-ink:#376859;
      --button-hover-bg:#e1eee7;--button-hover-border:#9fbdad;--button-pressed-bg:#d5e5dc;
      --button-selected-border:#75a28d;--button-danger:#b44242;
      --button-focus:#538775;--button-icon-size:16px;
      --button-main-bg:#376859;--button-main-hover:#2b5548;--button-main-pressed:#244a3f;--button-main-ink:#fff;
      --button-delete-bg:#b44242;--button-delete-hover:#963535;--button-delete-pressed:#7f2d2d;--button-delete-ink:#fff;
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
    .primary,.secondary{width:100%}.choose{margin:0}
    .primary,.choose,.cancel-button{background:var(--button-main-bg);border-color:var(--button-main-bg);color:var(--button-main-ink)}
    .primary:hover:enabled,.choose:hover:enabled,.cancel-button:hover:enabled{background:var(--button-main-hover);border-color:var(--button-main-hover)}
    .primary:active:enabled,.choose:active:enabled,.cancel-button:active:enabled{background:var(--button-main-pressed);border-color:var(--button-main-pressed)}
    .delete-content{width:100%;background:var(--button-delete-bg);border-color:var(--button-delete-bg);color:var(--button-delete-ink)}
    .delete-content:hover:enabled{background:var(--button-delete-hover);border-color:var(--button-delete-hover)}
    .delete-content:active:enabled{background:var(--button-delete-pressed);border-color:var(--button-delete-pressed)}
    .choosing{border-color:var(--button-selected-border)}
    .scope-buttons button,.mode-switch button{flex:1;margin:0;padding-inline:6px}
    .presets button,.round-button,.textbutton{min-height:var(--button-compact-height);padding:3px 8px}
    .presets button{flex:1;padding-inline:0}.round-button{min-width:32px;padding-inline:5px}
    .presets button.active,.level.active,.level-peer.active,.mode-switch button[aria-pressed="true"]{border-color:var(--button-selected-border);box-shadow:inset 0 0 0 1px var(--button-selected-border)}
    .textbutton.danger,button.danger{color:var(--button-danger)}
    .manage-button{width:100%;margin:12px 0 0}.manage-button>span:last-child{margin-left:auto}
    .iconbutton{width:32px;height:32px;min-height:32px;padding:0;flex:none}
    .video-tools-toggle{width:32px;height:32px;min-height:32px;padding:0;flex:none}
    .video-move{cursor:grab}.video-move:active{cursor:grabbing}
    #video-top .video-move{height:34px;min-height:34px;padding:6px 14px}
    .level{position:relative;flex:1;padding-inline:0}.level.changed::after{content:"";position:absolute;right:3px;top:3px;width:5px;height:5px;border-radius:50%;background:var(--accent)}
    .level-reset{flex:none;width:22px;padding:0;font-size:18px}
    .level-peer{width:34px;padding-inline:0}.sibling-controls button{flex:1}
    .panel-tab{position:relative;width:44px;height:44px;min-height:44px;padding:0;flex:none;border-radius:0}
    .panel-tab:first-child{border-top-left-radius:var(--button-radius)}
    .panel-tab:last-child{border-bottom-left-radius:var(--button-radius)}
    .panel-tab+.panel-tab{border-top-width:0}
    .panel-tab[aria-selected="true"]{z-index:1;border-color:var(--button-selected-border);border-right-color:transparent;box-shadow:inset 1px 0 0 var(--button-selected-border),inset 0 1px 0 var(--button-selected-border),inset 0 -1px 0 var(--button-selected-border)}
    .panel-tab[aria-selected="true"]:is(:hover,:active):enabled{border-right-color:transparent}
    .panel-tab[aria-selected="true"]::after{content:"";position:absolute;right:-1px;top:1px;bottom:1px;width:2px;background:inherit;pointer-events:none}
    .panel-tab:focus-visible{z-index:2}
    .panel-tab svg{width:21px;height:21px}.panel-tab[aria-selected="true"]::before{content:"";position:absolute;left:-1px;top:12px;bottom:12px;width:3px;border-radius:2px;background:var(--accent)}
    :host([data-desktop]) .desktop-pin[aria-pressed="true"]{background:var(--button-main-bg);border-color:var(--button-main-bg);color:var(--button-main-ink)}
    :host([data-desktop]) .desktop-pin[aria-pressed="true"]:hover:enabled{background:var(--button-main-hover);border-color:var(--button-main-hover)}
    :host([data-desktop]) .desktop-pin[aria-pressed="true"]:active:enabled{background:var(--button-main-pressed);border-color:var(--button-main-pressed)}
    :host([data-desktop]) .panel-tab{background:#fff}
    :host([data-desktop]) .panel-tab:hover:enabled{background:#f4f8f6}
    :host([data-desktop]) .panel-tab:active:enabled{background:#e8f0ec}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab{border-radius:0}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab:first-child{border-top-right-radius:var(--button-radius)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab:last-child{border-bottom-right-radius:var(--button-radius)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]{border-right-color:var(--button-selected-border);border-left-color:transparent;box-shadow:inset -1px 0 0 var(--button-selected-border),inset 0 1px 0 var(--button-selected-border),inset 0 -1px 0 var(--button-selected-border)}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]::after{right:auto;left:-1px}
    :host([data-desktop]) .panel-tabs[data-side="right"] .panel-tab[aria-selected="true"]::before{left:auto;right:-1px}
    .provider-tab{flex:1;min-width:0}
    .provider-tab[aria-selected="true"]{border-color:var(--button-selected-border);box-shadow:inset 0 0 0 1px var(--button-selected-border)}
    .thumb-button,.editor-thumbnail{min-height:0;cursor:zoom-in}
    .thumb-button{display:flex;flex:none;margin-top:2px;padding:0;line-height:0}
    .thumb-button>.rule-thumb{border:0;border-radius:calc(var(--button-radius) - 1px)}
    .editor-thumbnail{display:flex;width:100%;padding:5px;margin:0 0 10px}
    .editor-thumbnail img{display:block;max-width:100%;height:auto;max-height:110px;object-fit:contain}
    .drag-handle{min-height:0;padding:3px 2px;border:0;background:transparent;color:inherit;justify-content:flex-start;gap:8px;font:inherit;text-align:left;white-space:normal;cursor:grab}
    .drag-handle:hover:enabled,.drag-handle:active:enabled{background:transparent;border:0;color:inherit}.drag-handle:active{cursor:grabbing}
  `;
  const CSS_TEXT = `
    :host{--content-line-height:1.6;color-scheme:light!important;font-family:"Segoe UI","Microsoft YaHei",sans-serif!important;line-height:var(--content-line-height,1.6)!important;font-size:14px!important;color:#242424!important}
    :host::backdrop{background:transparent!important;pointer-events:none!important}
    *{box-sizing:border-box}
    input{font:inherit}
    a,input{outline-offset:3px}
    input:focus-visible,a:focus-visible{outline:3px solid #555555}
    .panel{position:fixed;top:18px;right:18px;width:336px;max-width:calc(100vw - 24px);max-height:calc(100vh - 36px);overflow:auto;background:#ffffff;border:1px solid #e2e2e2;border-radius:18px;box-shadow:0 14px 64px #22222230;color:#242424;pointer-events:auto;overscroll-behavior:contain}
    .panel[hidden],[hidden]{display:none!important}
    .top{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 10px}
    .brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px}
    .mark{display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:#1b1b1b;color:white}
    .site{font-size:12px;color:#6e6e6e;overflow-wrap:anywhere;padding:0 20px 15px;border-bottom:1px solid #ededed}
    .body{padding:18px 20px 20px}
    .eyebrow{font-size:11px;font-weight:700;letter-spacing:1.5px;color:#737373;margin-bottom:9px}
    .heading{margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-.5px;line-height:var(--content-line-height,1.6)}
    .muted{font-size:13px;line-height:var(--content-line-height,1.6);color:#686868;margin:0}
    .steps{display:flex;gap:9px;margin:18px 0 4px;color:#707070;font-size:12px;align-items:center}
    .steps b{display:inline-grid;place-items:center;width:20px;height:20px;background:#f1f1f1;border-radius:50%;margin-right:4px;color:#4d4d4d}
    .steps svg{width:12px}
    .selection{display:flex;gap:10px;align-items:center;background:#f6f6f6;border:1px solid #e6e6e6;border-radius:11px;padding:12px;margin:16px 0 14px}
    .selection-icon{color:#575757;display:flex}
    .selection-title{font-size:14px;font-weight:600}
    .fieldtop{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
    .fieldtop label{font-size:14px;font-weight:600}
    .numberwrap{display:flex;align-items:baseline;gap:3px}
    .numberwrap input{width:57px;border:1px solid #dfdfdf;border-radius:7px;background:white;text-align:center;padding:5px;font-size:19px;font-weight:700;color:#3a3a3a;appearance:textfield;-moz-appearance:textfield}
    .unit{font-size:13px;color:#717171}
    .range{display:block;width:100%;height:30px;accent-color:#1b1b1b;margin:10px 0 0;cursor:pointer}
    .limits{display:flex;justify-content:space-between;font-size:11px;color:#787878}
    .presets{display:flex;gap:6px;margin:14px 0}
    .checkrow{display:flex;align-items:center;gap:8px;font-size:12px;color:#636363;margin:14px 0}
    .checkrow input{accent-color:#1b1b1b;width:16px;height:16px;margin:0}
    .count{font-size:11px;color:#717171;margin-left:auto}
    .status{font-size:12px;line-height:var(--content-line-height,1.6);margin-top:10px;color:#535353;min-height:18px;overflow-wrap:anywhere}
    .status.error{color:#414141}
    .library{border-top:1px solid #ececec;padding-top:17px;margin-top:17px}
    .libraryhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .libraryhead strong{font-size:13px}
    .toggle{display:flex;align-items:center;gap:5px;font-size:11px;color:#686868}
    .toggle input{accent-color:#1b1b1b}
    .rule{display:flex;gap:8px;align-items:center;padding:12px 0;border-bottom:1px solid #f0f0f0}
    .rulename{font-size:12px;flex:1}
    .ruleval{display:block;font-size:11px;color:#717171;margin-top:2px}
    .empty{font-size:12px;color:#737373;margin:12px 0 0}
    .footer{font-size:11px;color:#757575;margin-top:14px;text-align:center}
    .tip{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);border:1px solid #cdcdcd;border-radius:30px;background:#f9f9f9;color:#3b3b3b;padding:10px 18px;font-size:13px;box-shadow:0 5px 24px #1c1c1c18;pointer-events:none;white-space:nowrap;max-width:calc(100vw - 20px)}
    .outline{position:fixed;pointer-events:none;border:2px solid #f03545;background:#ef334009;border-radius:3px;box-shadow:0 0 0 1px #ffffff77}
    .outline.locked{border-color:#ef3340;background:transparent}
    .tag{position:absolute;left:-2px;bottom:calc(100% + 3px);background:#c41e31;color:white;font-size:11px;font-weight:600;padding:4px 8px;border-radius:5px;white-space:nowrap}
    .outline.tagbelow .tag{bottom:auto;top:calc(100% + 3px)}
    .panel{width:320px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);border-radius:14px;z-index:3}
    .top{position:sticky;top:0;gap:4px;padding:8px 10px;background:#ffffff;border-bottom:1px solid #ededed;z-index:1}
    .drag-handle{display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:none;border:0;padding:3px 2px;color:inherit;text-align:left;cursor:grab;touch-action:none;user-select:none}
    .drag-handle:active{cursor:grabbing}
    .brand-meta{min-width:0}
    .brand{display:block;font-size:15px}
    .mark{width:27px;height:27px;border-radius:8px;flex:none}
    .site{display:block;padding:0;border:0;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
    .body{padding:10px 14px 12px}
    .emptyguide{font-size:12px;color:#6e6e6e;margin:10px 0 0}
    .selection{gap:8px;padding:9px;margin:10px 0;border-radius:9px}
    .selection-copy{min-width:0;flex:1}
    .selection-title{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .name-row{display:flex;align-items:center;gap:8px;font-size:12px;color:#636363;margin:10px 0}
    .name-row input{flex:1;min-width:0;width:100%;height:32px;border:1px solid #dfdfdf;border-radius:7px;padding:5px 8px;background:white;color:#3a3a3a}
    .name-row input::placeholder{color:#818181}
    .fieldtop{margin-top:10px}
    .fieldtop label{font-size:13px}
    .numberwrap input{width:55px;padding:4px;font-size:18px}
    .range{height:28px;margin:6px 0 0}
    .presets{gap:5px;margin:9px 0}
    .checkrow{margin:10px 0}
    .actions{display:flex;gap:7px}
    .editor-actions{display:grid;gap:8px}
    .capture{display:flex;align-items:center;justify-content:center;gap:5px;min-height:36px;font-size:12px;margin:0}
    .status{margin-top:8px;min-height:0}
    .status:empty{display:none}
    .library{padding-top:12px;margin-top:12px}
    .libraryhead strong{font-size:12px}
    .rule{gap:7px;padding:8px 0}
    .rulename{min-width:0;overflow-wrap:anywhere}
    .tip{bottom:16px;padding:8px 14px;font-size:12px;z-index:2}
    .outline{z-index:1}
    .outline.related{border-style:dashed;background:transparent}
    .tag{max-width:280px;overflow:hidden;text-overflow:ellipsis}
    .scope-layout{display:grid;grid-template-columns:42px minmax(0,1fr);gap:9px;margin-top:10px}
    .levels{display:flex;flex-direction:column;gap:5px;max-height:285px;overflow:auto;padding:2px 3px 2px 0;border-right:1px solid #e9e9e9;scrollbar-width:thin}
    .scope-controls{min-width:0}
    .scope-controls .selection{margin-top:0}
    .scope-buttons{display:flex;gap:5px;margin:8px 0}
    .mode-switch{display:flex;gap:5px;margin:8px 0}
    .scope-controls .presets{gap:3px}
    .scope-controls .selection-icon{display:none}
    .rule-check{width:16px;height:16px;flex:none;accent-color:#1b1b1b;margin:0}
    .rule-thumb{width:44px;height:34px;flex:none;object-fit:cover;border:1px solid #e6e6e6;border-radius:5px;background:#f6f6f6}
    .rule-thumb.empty-thumb{display:grid;place-items:center;font-size:10px;color:#848484}
    .rule.disabled .rulename,.rule.disabled .rule-thumb{opacity:.55}
    .rule{gap:5px}
    .name-row{margin:10px 0 8px}
    .panel,.level-rail,.image-viewer{zoom:var(--ui-scale,1)}
    .panel{max-width:calc(var(--ui-vw,100vw) - 16px - var(--rail-space,0px));max-height:calc(var(--ui-vh,100vh) - 16px)}
    .scope-layout{display:block}
    .scope-controls .presets{gap:5px}
    .level-rail{position:fixed;width:112px;max-height:calc(var(--ui-vh,100vh) - 16px);padding:9px 6px;background:white;border:1px solid #e2e2e2;border-radius:12px;box-shadow:0 8px 30px #22222220;pointer-events:auto;z-index:3}
    .rail-heading{font-size:11px;color:#6e6e6e;text-align:center;margin-bottom:7px;display:grid;grid-template-columns:var(--level-columns);gap:3px}
    .level-rail{--level-columns:minmax(0,1fr) 34px 22px}
    .levels{max-height:calc(var(--ui-vh,100vh) - 68px);padding:0;border:0;gap:6px}
    .level-row{display:grid;grid-template-columns:var(--level-columns);align-items:center;gap:3px}
    .sibling-controls{display:flex;align-items:center;gap:6px;margin:6px 0 8px}.sibling-count{font-size:12px;color:var(--muted);white-space:nowrap}
    .rule-thumb:not(.empty-thumb){cursor:zoom-in}
    .rule-thumb:focus-visible{outline:3px solid #555555;outline-offset:2px}
    .image-viewer{position:fixed;left:0;top:0;width:var(--ui-vw,100vw);height:var(--ui-vh,100vh);display:grid;place-items:center;background:#1e1e1ea8;pointer-events:auto;z-index:5;padding:20px}
    .preview-dialog{background:white;border-radius:12px;max-width:100%;max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 70px #00000055}
    .preview-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:8px 12px;font-size:13px}
    .preview-image{display:block;object-fit:contain;max-width:calc(var(--ui-vw,100vw) - 40px);max-height:calc(var(--ui-vh,100vh) - 100px);width:auto;height:auto;background:#f6f6f6}
    .numberwrap{align-items:center;gap:4px}
    .fieldtop{flex-wrap:wrap;gap:5px}
    .fieldtop label{font-size:12px}
    .manage-count{display:inline-grid;place-items:center;min-width:20px;border-radius:5px;background:#f2f2f2;padding:0 4px}
    .image-viewer{display:flex;align-items:center;justify-content:center}
    .preview-dialog{align-items:center;max-width:100%}
    .preview-head{align-self:stretch}
    .preview-image{margin:auto;object-position:center;flex:none}
    .preview-image{border:2px solid #000000}
    .page-group{margin:0;border-top:1px solid #ececec}
    .page-group>summary{padding:9px 2px;font-size:11px;color:#636363;cursor:pointer;overflow-wrap:anywhere}
    .page-group>summary span{margin-left:5px;color:#828282}
    .page-group .page-records{padding-left:0}
    .site-records .page-group>summary{background:transparent;padding:8px 0;font-weight:400}
    .site-records .page-group>summary span{font-size:10px}
    .library{border-top:0;margin-top:10px;padding-top:0}
    .libraryhead{margin-bottom:3px}
    .libraryhead strong{font-size:12px}
    .libraryhead .toggle{white-space:nowrap}
    .edit-heading{display:flex;flex-direction:column;align-items:stretch;gap:8px;margin-top:8px}
    .edit-heading .selection{margin:0}.edit-heading .cancel-button{align-self:flex-end}
    .rule{align-items:flex-start;padding:10px 0;gap:7px}
    .rule-check{margin-top:11px}
    .rule-thumb{width:48px;height:38px}
    .rule-copy{min-width:0;flex:1}
    .rule-name input{width:100%;border:1px solid transparent;border-radius:4px;background:transparent;padding:1px 2px;color:#3a3a3a;font-size:12px;min-width:0}
    .rule-name input:hover{border-color:#dfdfdf}
    .rule-name input:focus{border-color:#555555;background:#ffffff}
    .rule-actions{display:flex;gap:9px;margin-top:2px}
    .ruleval{margin-top:1px;padding-left:2px;font-size:10px;line-height:var(--content-line-height,1.6)}
    .rule.disabled .rule-copy{opacity:.6}
    .empty{line-height:var(--content-line-height,1.6);margin:12px 0}
    .all-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .all-head strong{font-size:13px}
    .site-search{width:100%;border:1px solid #dfdfdf;border-radius:7px;background:#ffffff;padding:7px 9px;font-size:12px;color:#3a3a3a;margin-bottom:10px}
    .site-group{border:1px solid #e6e6e6;border-radius:9px;margin-bottom:9px;overflow:hidden}
    .site-group summary{padding:10px 9px;background:#f8f8f8;cursor:pointer;font-size:12px;font-weight:600;overflow-wrap:anywhere}
    .site-group summary span{font-size:11px;font-weight:400;color:#6e6e6e;margin-left:5px}
    .site-records{padding:0 9px 7px}
    .site-records .libraryhead{padding-top:6px}
    .site-records .rule:last-child{border-bottom:0}
    .all-note{font-size:11px;color:#6e6e6e;margin:0 0 10px}
    .page-records>.rule:last-child{border-bottom:0}
    .empty-skeleton{display:flex;align-items:center;gap:12px;min-height:86px;margin:9px 0 2px;padding:15px;border:1px solid #e5e5e5;border-radius:8px;background:#fafafa}
    .skeleton-thumb{flex:none;width:49px;height:40px;border:1px solid #e8e8e8;border-radius:5px;background:#ededed}
    .skeleton-copy{display:flex;flex:1;flex-direction:column;gap:8px}
    .skeleton-copy i{display:block;height:7px;border-radius:3px;background:#e8e8e8}
    .skeleton-copy i:nth-child(1){width:65%}
    .skeleton-copy i:nth-child(2){width:90%}
    .skeleton-copy i:nth-child(3){width:40%}
    :host{--ink:#293c38;--muted:#667873;--accent:#376859;--accent-hover:#2b5548;--soft:#edf4f1;--line:#dce6e1;color:var(--ink)!important}
    .panel{color:var(--ink);border-color:var(--line);border-top-left-radius:0;box-shadow:0 14px 64px #243e3526}
    .top{border-bottom-color:var(--line)}
    .mark{background:var(--accent)}
    input:focus-visible,a:focus-visible{outline-color:#538775}
    .site,.unit,.limits,.count,.toggle,.ruleval,.page-group>summary,.page-group>summary span,.rail-heading,.all-note{color:var(--muted)}
    .rule-effect.hidden-effect{color:#b44242}
    .rule-effect.resize-effect{color:var(--accent)}
    .range,.checkrow input,.toggle input,.rule-check{accent-color:var(--accent)}
    .selection{background:#f3f7f4;border-color:var(--line)}
    .selection-title,.numberwrap input,.name-row input,.rule-name input,.site-search{color:var(--ink)}
    .level-rail{border-color:var(--line);box-shadow:0 8px 30px #243e351c}
    .rule-name input:focus{border-color:#75a28d}
    .status{color:var(--accent)}
    .status.error{color:#b44242}
    .panel-tabs{position:fixed;display:flex;flex-direction:column;gap:0;width:44px;pointer-events:auto;z-index:4;zoom:var(--ui-scale,1)}
    .settings-page{min-height:240px;display:flex;flex-direction:column;gap:20px}
    .settings-page strong,.settings-page h3{display:block;line-height:1.6}.settings-page p{line-height:1.6;margin:8px 0 12px}
    .settings-page>.library{margin:0;padding:0;border:0}.settings-page>section{min-width:0}
    .settings-page label{display:flex;align-items:center;gap:8px;line-height:1.6}.settings-page input[type="checkbox"]{accent-color:#376859}
    .provider-tabs{display:flex;gap:6px;padding:5px;background:#f3f7f5;border:1px solid #dce6e1;border-radius:12px;margin:14px 0 6px}
    .disclosure-card{border:1px solid #dce6e1;border-radius:12px;padding:12px;background:#fff;margin:12px 0}
    .disclosure-card>summary{cursor:pointer;color:#376859;font-size:12px;line-height:1.6}.disclosure-card[open]>summary{margin-bottom:12px}
    .hover-bubble{position:fixed;z-index:6;pointer-events:auto;max-width:calc(100vw - 24px);padding:8px;border:1px solid #cbdad1;border-radius:12px;background:#fff;color:#293c38;box-shadow:0 8px 32px #0003}
    .hover-bubble img{display:block;max-width:min(360px,calc(100vw - 40px));max-height:min(280px,calc(100vh - 72px));object-fit:contain}
    .hover-image-frame{display:flex;align-items:center;justify-content:center}.hover-image-frame img{width:100%;height:100%;max-width:none;max-height:none;object-fit:contain}
    .hover-bubble p{margin:6px 0 0;font-size:12px;line-height:1.6}

    .backup-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.backup-actions button{flex:1}
    .image-viewer{background:#223a32a8}
    
    .numberwrap input::-webkit-inner-spin-button{appearance:none}
    ${BUTTON_CSS}
    ${globalThis.PointResizeVideos?.css || ""}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  `;
  function create() {
    const host = document.createElement("div");
    host.id = "point-resize-ui";
    host.style.cssText = "all:initial!important;position:fixed!important;inset:auto!important;left:0!important;top:0!important;width:0!important;height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;overflow:visible!important;background:transparent!important;z-index:2147483647!important;pointer-events:none!important;zoom:1!important;";
    host.setAttribute("popover", "manual");
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS_TEXT}</style>
      <div id="related-outlines"></div><div class="outline" id="outline" hidden><span class="tag" id="tag"></span></div>
      <nav class="panel-tabs" id="panel-tabs" hidden role="tablist" aria-label="面板页面" aria-orientation="vertical">
        <button class="panel-tab" id="tab-resize" type="button" role="tab" aria-label="点选缩放" title="点选缩放" aria-controls="resize-page" aria-selected="true">${icon("pointer")}</button>
        <button class="panel-tab" id="tab-videos" type="button" role="tab" aria-label="视频待看" title="视频待看" aria-controls="videos-page" aria-selected="false" tabindex="-1">${icon("video")}</button>
        <button class="panel-tab" id="tab-settings" type="button" role="tab" aria-label="设置" title="设置" aria-controls="settings-page" aria-selected="false" tabindex="-1">${icon("settings")}</button>
      </nav>
      <aside class="panel" id="panel" hidden aria-label="点选缩放调整面板">
        <header class="top"><button class="drag-handle" id="drag-handle" aria-label="拖动面板，或用方向键移动" title="拖动标题移动面板；也可用方向键"><span class="mark" id="brand-mark">${icon("pointer")}</span><span class="brand-meta"><span class="brand" id="brand-title">点选缩放</span><span class="site" id="site"></span></span></button><button class="iconbutton" id="dock" aria-label="切换面板到左侧或右侧" title="切换到另一侧">${icon("dock")}</button><button class="iconbutton" id="close" aria-label="关闭调整面板">${icon("close")}</button></header>
        <div class="body" id="resize-page" role="tabpanel" aria-labelledby="tab-resize">
          <button class="secondary choose" id="choose">${icon("pointer")}<span id="choose-label">选择网页上的内容</span></button>
          <section class="library" id="library" aria-label="当前网站保存项">
            <div class="libraryhead"><strong>此网站已保存 <span id="rule-count">0</span> 项</strong><label class="toggle"><input type="checkbox" id="enabled">全部启用</label></div>
            <div id="rules"></div>
            <button class="manage-button" id="manage" type="button">全部网站记录<span aria-hidden="true">→</span></button>
          </section>
          <div class="edit-heading" id="edit-heading" hidden><div class="selection"><div class="selection-copy"><div class="selection-title" id="selection-title"></div></div></div><button class="cancel-button" id="cancel-edit" type="button">取消修改并返回</button></div>
          <section id="editor" hidden aria-label="内容调整">
            <div class="scope-layout"><div class="scope-controls">
            <div class="scope-buttons"><button class="smallbutton" id="scope-up">↑ 扩大范围</button><button class="smallbutton" id="scope-down">↓ 缩小范围</button></div>
            <div class="sibling-controls"><button class="textbutton" id="sibling-prev" type="button" aria-label="上一个同层元素">← 上一个</button><span class="sibling-count" id="sibling-count" aria-live="polite"></span><button class="textbutton" id="sibling-next" type="button" aria-label="下一个同层元素">下一个 →</button></div>
            <div class="mode-switch" role="group" aria-label="调整方式"><button id="mode-scale" type="button" aria-pressed="true">整体缩放</button><button id="mode-font" type="button" aria-pressed="false">文字字号</button></div>
            <div class="fieldtop"><label for="range" id="size-label">图片 / 视频大小</label><div class="numberwrap"><button class="round-button" id="round-down" type="button"></button><button class="round-button" id="round-up" type="button"></button><input id="number" type="number" min="10" max="200" step="1" aria-label="大小数值"><span class="unit" id="unit">%</span></div></div>
            <input class="range" type="range" id="range" min="10" max="200" step="1" value="100">
            <div class="limits"><span id="min-label">10%</span><span id="max-label">200%</span></div>
            <div class="presets" id="presets"></div>
            <label class="checkrow"><input type="checkbox" id="similar" checked>同类内容一起调整<span class="count" id="count"></span></label>
            </div></div>
            <label class="name-row" for="name">名称<input id="name" type="text" maxlength="60" autocomplete="off" placeholder="留空使用默认名称"></label>
            <button class="editor-thumbnail" id="editor-thumbnail-button" hidden type="button" aria-label="查看当前选区截图" title="点击查看大图"><img id="editor-thumbnail" alt="当前选区截图"></button>
            <div class="editor-actions">
              <button class="delete-content" id="delete-content" type="button" aria-pressed="false">删除选中内容</button>
              <button class="primary" id="save">${icon("check")}保存到此网站</button>
            </div>
          </section>
          <div class="status" id="status" role="status" aria-live="polite"></div>
          <section id="all-view" hidden aria-label="全部网站保存记录">
            <div class="all-head"><button class="textbutton" id="all-back">← 当前网站</button><strong>全部网站记录</strong></div>
            <p class="all-note">按网站分类，开关与修改立即保存到本机。</p>
            <input class="site-search" id="site-search" type="search" placeholder="搜索网站或保存项" aria-label="搜索网站或保存项">
            <div id="all-records"></div>
          </section>
        </div>
        <section class="body settings-page" id="settings-page" role="tabpanel" aria-labelledby="tab-settings" hidden>
          <section id="backup-section"><strong>导入与导出设置</strong>
          <p class="all-note">备份点选缩放和视频待看的全部已保存设置，适用于所有网站。</p>
          <div class="backup-actions" role="group" aria-label="设置备份"><button id="backup-export" type="button">导出设置</button><button id="backup-import" type="button">导入设置</button></div>
          <input id="backup-file" type="file" accept=".json,application/json" aria-label="选择设置备份文件" hidden>
          <div class="status" id="backup-status" role="status" aria-live="polite"></div>
          </section><section id="hover-settings"><strong>网页预览</strong><label><input id="hover-images" type="checkbox" checked>鼠标悬停预览图片</label><p class="status" id="hover-settings-status" role="status"></p></section>
          <section class="library" id="native-settings" hidden aria-label="桌面视频助手连接">
            <strong>桌面视频助手</strong>
            <p class="all-note">首次点“安装助手”，再在浏览器下载栏打开安装包；安装完成后自动连接，无须输入 ID。卸载会打开 Windows 卸载窗口。</p>
            <div class="backup-actions" role="group" aria-label="桌面助手安装与连接"><button id="native-install" type="button">安装助手</button><button id="native-toggle" type="button" aria-pressed="false">连接桌面助手</button><button id="native-uninstall" class="danger" type="button">卸载助手</button></div>
            <div class="status" id="native-status" role="status" aria-live="polite"></div>
          </section>
        </section>
        <section class="video-page" id="videos-page" role="tabpanel" aria-labelledby="tab-videos" hidden>${globalThis.PointResizeVideos?.template || ""}</section>
      </aside>
      <aside class="level-rail" id="level-rail" hidden aria-label="层级、子元素与复原"><div class="rail-heading"><span>层级</span><span>子元素</span><span aria-hidden="true"></span></div><nav class="levels" id="levels" aria-label="选取层级，外层在上内层在下"></nav></aside>
      <div class="image-viewer" id="image-viewer" hidden><section class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"><header class="preview-head"><span id="preview-title">区域截图</span><button class="iconbutton" id="preview-close" aria-label="关闭截图预览">${icon("close")}</button></header><img class="preview-image" id="preview-image" alt="区域截图"></section></div>
      <div class="tip" id="tip" hidden>悬停看红框 · 点击选中 · Esc 退出</div>`;
    document.documentElement.appendChild(host);
    const $ = id => root.getElementById(id);
    const panel = $("panel"), handle = $("drag-handle");
    const positionKey = "point-resize:panel-position";
    let position = null, drag = null, visible = false, uiScale = 1, previewFocus = null;
    const rail = $("level-rail"), tabs = $("panel-tabs");
    function syncRail() {
      rail.hidden = panel.hidden || $("resize-page").hidden || $("editor").hidden;
      if (rail.hidden) return;
      const tabsBottom = tabs.getBoundingClientRect().bottom;
      const available = Math.max(80, innerHeight - tabsBottom - 18 * uiScale);
      rail.style.maxHeight = available / uiScale + "px";
      $("levels").style.maxHeight = Math.max(34, available / uiScale - 44) + "px";
      const r = panel.getBoundingClientRect(), slider = $("range").getBoundingClientRect(), width = rail.getBoundingClientRect().width;
      rail.style.left = (host.dataset.tabSide === "right" ? r.right + 8 * uiScale : Math.max(8 * uiScale, r.left - width - 8 * uiScale)) / uiScale + "px";
      rail.style.top = Math.max(tabsBottom + 10 * uiScale, Math.min(slider.top - 12 * uiScale, innerHeight - rail.getBoundingClientRect().height - 8 * uiScale)) / uiScale + "px";
    }
    function syncTabs() {
      tabs.hidden = panel.hidden;
      if (tabs.hidden) return;
      const r = panel.getBoundingClientRect();
      tabs.dataset.side = host.dataset.tabSide || "left";
      tabs.style.left = (host.dataset.tabSide === "right" ? r.right - uiScale : r.left - 43 * uiScale) / uiScale + "px";
      tabs.style.top = r.top / uiScale + "px";
    }
    function place(x, y) {
      if (host.hasAttribute("data-desktop")) { syncTabs(); syncRail(); return; }
      const editing = !$("resize-page").hidden && !$("editor").hidden;
      host.style.setProperty("--rail-space", editing ? "120px" : "44px");
      const r = panel.getBoundingClientRect();
      const minX = (editing ? 128 : 52) * uiScale;
      position = { x: Math.max(minX, Math.min(x, innerWidth - r.width - 8 * uiScale)) / uiScale, y: Math.max(8 * uiScale, Math.min(y, innerHeight - r.height - 8 * uiScale)) / uiScale };
      panel.style.left = position.x + "px"; panel.style.top = position.y + "px"; panel.style.right = "auto";
      syncTabs(); syncRail();
    }
    function clampPosition() {
      if (!panel.hidden) { const r = panel.getBoundingClientRect(); place(position ? position.x * uiScale : r.left, position ? position.y * uiScale : r.top); }
      syncTabs(); syncRail();
    }
    function setPageZoom(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      uiScale = 1 / factor;
      host.style.setProperty("--ui-scale", uiScale);
      host.style.setProperty("--ui-vw", innerWidth / uiScale + "px"); host.style.setProperty("--ui-vh", innerHeight / uiScale + "px");
      clampPosition();
    }
    function closePreview() {
      const opened = !$("image-viewer").hidden;
      $("image-viewer").hidden = true; $("preview-image").removeAttribute("src"); panel.inert = false; rail.inert = false;
      if (opened && previewFocus?.isConnected) previewFocus.focus();
      return opened;
    }
    function showPreview(source, label, origin) {
      previewFocus = origin || root.activeElement; $("preview-image").src = source; $("preview-image").alt = label + "区域截图"; $("preview-title").textContent = label;
      $("image-viewer").hidden = false; panel.inert = true; rail.inert = true; $("preview-close").focus();
    }
    $("preview-close").onclick = closePreview;
    $("image-viewer").onclick = event => { if (event.target === $("image-viewer")) closePreview(); };
    $("image-viewer").onkeydown = event => { if (event.key === "Tab") { event.preventDefault(); $("preview-close").focus(); } };
    function savePosition() { if (position) chrome.storage.local.set({ [positionKey]: position }).catch(() => {}); }
    chrome.storage.local.get(positionKey).then(data => {
      const saved = data[positionKey];
      if (!position && saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) { position = saved; clampPosition(); }
    }).catch(() => {});
    chrome.storage.onChanged.addListener((changes, area) => {
      const saved = changes[positionKey]?.newValue;
      if (area === "local" && !drag && saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) { position = saved; clampPosition(); }
    });
    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const r = panel.getBoundingClientRect(); drag = { id: event.pointerId, dx: event.clientX - r.left, dy: event.clientY - r.top };
      handle.setPointerCapture(event.pointerId); event.preventDefault();
    });
    handle.addEventListener("pointermove", event => { if (drag?.id === event.pointerId) place(event.clientX - drag.dx, event.clientY - drag.dy); });
    window.addEventListener("pointerrawupdate", event => { if (drag?.id === event.pointerId) place(event.clientX - drag.dx, event.clientY - drag.dy); }, { capture: true, passive: true });
    // Some pages consume pointermove at window capture; mousemove still reaches us.
    window.addEventListener("mousemove", event => { if (drag) place(event.clientX - drag.dx, event.clientY - drag.dy); }, { capture: true, passive: true });
    function stopDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      drag = null; if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); savePosition();
    }
    handle.addEventListener("pointerup", stopDrag); handle.addEventListener("pointercancel", stopDrag);
    handle.addEventListener("keydown", event => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta) return;
      event.preventDefault(); const r = panel.getBoundingClientRect(), step = event.shiftKey ? 40 : 16;
      place(r.left + delta[0] * step, r.top + delta[1] * step); savePosition();
    });
    $("dock").onclick = () => { const r = panel.getBoundingClientRect(); place(r.left + r.width / 2 > innerWidth / 2 ? 8 : innerWidth - r.width - 8, r.top); savePosition(); };
    new ResizeObserver(clampPosition).observe(panel);
    new ResizeObserver(syncRail).observe(rail);
    window.addEventListener("resize", () => {
      if (chrome.runtime.id) chrome.runtime.sendMessage({ type: "POINT_RESIZE_GET_ZOOM" }).then(result => setPageZoom(result?.ok ? result.zoomFactor : 1 / uiScale)).catch(() => setPageZoom(1 / uiScale));
      else setPageZoom(1 / uiScale);
    }, { passive: true });
    let knownLayers = new Set(), hoverVisible = false;
    function syncLayer(force = false) {
      if (!visible && !hoverVisible) return;
      const layers = [...document.querySelectorAll("dialog:modal,[popover]:popover-open")].filter(element => element !== host);
      // A modal dialog makes outside elements inert. Keep our top-layer host
      // inside the active modal so its controls remain interactive as well.
      const focusedModal = document.activeElement?.closest("dialog:modal");
      const modal = focusedModal || layers.filter(element => element.matches("dialog:modal")).at(-1);
      const parent = modal || document.documentElement;
      const moved = host.parentNode !== parent;
      if (moved) parent.appendChild(host);
      const appeared = layers.some(element => !knownLayers.has(element));
      knownLayers = new Set(layers);
      if (typeof host.showPopover !== "function") return;
      if (force || moved || appeared || !host.matches(":popover-open")) {
        try {
          if (host.matches(":popover-open")) host.hidePopover();
          host.showPopover();
        } catch { /* Fall back to the fixed-position host if a page is closing. */ }
      }
    }
    function show() { visible = true; syncLayer(true); clampPosition(); }
    function hide() {
      visible = false; knownLayers.clear(); rail.hidden = true; tabs.hidden = true; closePreview();
      if (!hoverVisible && typeof host.hidePopover === "function" && host.matches(":popover-open")) host.hidePopover();
      if (host.parentNode !== document.documentElement) document.documentElement.appendChild(host);
    }
    document.addEventListener("toggle", event => {
      if (event.target !== host && (visible || hoverVisible)) syncLayer();
    }, true);
    function hoverLayer(open){hoverVisible=open;if(open)syncLayer(true);else if(!visible&&typeof host.hidePopover==='function'&&host.matches(':popover-open'))host.hidePopover();}
    const ui={ host, root, $, icon, show, hide, hoverLayer, syncLayer, syncControls: clampPosition, setPageZoom, showPreview, closePreview, previewImages:true, previewScale:1, previewScalePending:null };
    const previewKey=PREVIEW_KEY;
    chrome.storage.local.get([previewKey,PREVIEW_SIZE_KEY]).then(data=>{$('hover-images').checked=ui.previewImages=data[previewKey]?.images!==false;if(ui.previewScalePending===null)ui.previewScale=previewScale(data[PREVIEW_SIZE_KEY]?.scale);ui.root.dispatchEvent(new Event('preview-size'));}).catch(()=>{});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes[previewKey])$('hover-images').checked=ui.previewImages=changes[previewKey].newValue?.images!==false;if(changes[PREVIEW_SIZE_KEY]){const scale=previewScale(changes[PREVIEW_SIZE_KEY].newValue?.scale);if(ui.previewScalePending===null||ui.previewScalePending===scale){ui.previewScale=scale;ui.previewScalePending=null;ui.root.dispatchEvent(new Event('preview-size'));}}});
    ui.savePreviewScale=async scale=>{const result=chrome.runtime.id?await chrome.runtime.sendMessage({type:'POINT_RESIZE_HOVER_SIZE',scale}):await chrome.storage.local.set({[PREVIEW_SIZE_KEY]:{scale}}).then(()=>({ok:true}));if(!result?.ok)throw new Error(result?.error||'预览尺寸未能保存。');if(ui.previewScalePending===scale)ui.previewScalePending=null;};
    $('hover-images').onchange=async()=>{
      const input=$('hover-images'),before=ui.previewImages;input.disabled=true;
      try{const result=chrome.runtime.id?await chrome.runtime.sendMessage({type:'POINT_RESIZE_HOVER_SET',images:input.checked}):await chrome.storage.local.set({[previewKey]:{images:input.checked}}).then(()=>({ok:true}));if(!result?.ok)throw new Error(result?.error||'设置未能保存，请重试。');ui.previewImages=input.checked;$('hover-settings-status').textContent='';}
      catch(error){input.checked=before;$('hover-settings-status').textContent=error.message;}
      finally{input.disabled=false;}
    };
    return ui;
  }
  function hoverPreview(ui,allowed) {
    const bubble=document.createElement('section');bubble.id='hover-bubble';bubble.className='hover-bubble';bubble.hidden=true;bubble.setAttribute('aria-label','网页图片预览');ui.root.append(bubble);
    let target=null,timer=0,point=null,sizeTimer=0,sizeDirty=false,positioned=false;
    const coverObserver=new MutationObserver(()=>{if(target&&(!target.isConnected||videoCover(target)))close();});
    function saveSize(){
      clearTimeout(sizeTimer);if(!sizeDirty)return;sizeDirty=false;const scale=ui.previewScale;
      ui.savePreviewScale(scale).then(()=>{if(ui.previewScale===scale){ui.$('hover-settings-status').textContent='';bubble.querySelector('[data-save-hint]')?.remove();}},error=>{if(ui.previewScale!==scale)return;ui.$('hover-settings-status').textContent=error.message;if(!bubble.hidden&&!bubble.querySelector('[data-save-hint]')){const hint=document.createElement('p');hint.dataset.saveHint='true';hint.setAttribute('role','status');hint.textContent='尺寸暂未保存，当前页面可继续使用。';bubble.append(hint);place();}});
    }
    function clear(){saveSize();clearTimeout(timer);coverObserver.disconnect();bubble.replaceChildren();bubble.hidden=true;positioned=false;ui.hoverLayer(false);}
    function close(){target=null;clear();}
    function place(pointer){if(bubble.hidden||!point)return;const rect=bubble.getBoundingClientRect();let x=rect.left,y=rect.top;if(!positioned){x=point.x+20;y=point.y+20;if(x+rect.width>innerWidth-12)x=point.x-rect.width-20;if(y+rect.height>innerHeight-12)y=point.y-rect.height-20;}if(Number.isFinite(pointer?.x)&&Number.isFinite(pointer?.y)){x=Math.min(pointer.x-16,Math.max(x,pointer.x-rect.width+16));y=Math.min(pointer.y-16,Math.max(y,pointer.y-rect.height+16));}bubble.style.left=Math.max(12,Math.min(x,innerWidth-rect.width-12))+'px';bubble.style.top=Math.max(12,Math.min(y,innerHeight-rect.height-12))+'px';positioned=true;}
    function sizeImage(pointer){const imageFrame=bubble.querySelector('.hover-image-frame');if(!imageFrame)return;imageFrame.style.width=Math.min(360*ui.previewScale,Math.max(80,innerWidth-48))+'px';imageFrame.style.height=Math.min(280*ui.previewScale,Math.max(70,innerHeight-96))+'px';place(pointer);}
    function image(source,alt){if(!source)return false;const imageFrame=document.createElement('div');imageFrame.className='hover-image-frame';const img=document.createElement('img');img.src=source;img.alt=alt||'图片预览';img.onload=sizeImage;img.onerror=()=>{if(bubble.contains(img))close();};imageFrame.append(img);bubble.append(imageFrame);sizeImage();return true;}
    function reveal(){ui.hoverLayer(true);bubble.hidden=false;place();}
    function inTransit(x,y){
      if(bubble.hidden||!target?.isConnected)return false;
      // Keep the space between the source and the fixed preview traversable.
      // The convex hull covers diagonal approaches without a full-screen hit area.
      const points=[target.getBoundingClientRect(),bubble.getBoundingClientRect()].flatMap(r=>[
        {x:r.left-6,y:r.top-6},{x:r.right+6,y:r.top-6},{x:r.right+6,y:r.bottom+6},{x:r.left-6,y:r.bottom+6}
      ]).sort((a,b)=>a.x-b.x||a.y-b.y);
      const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      const half=values=>{const hull=[];for(const p of values){while(hull.length>1&&cross(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}return hull;};
      const hull=half(points).slice(0,-1).concat(half([...points].reverse()).slice(0,-1)),p={x,y};
      return hull.length>2&&hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],p)>=0);
    }
    function videoCover(node){
      if(!node?.matches('img'))return true;
      const parent=n=>n.parentElement||n.getRootNode().host||null;
      // Use media/link semantics rather than website class names or selectors.
      for(let scope=node,depth=0;scope&&depth<5;scope=parent(scope),depth++){
        if(scope.matches('a[href]')){try{const value=PointResizeVideoData.candidate(scope.href);if(value)return true;}catch{}try{const url=new URL(scope.href);if(url.hostname==='v.qq.com'&&/^\/x\/(?:cover\/[A-Za-z0-9]+\/|page\/)[A-Za-z0-9]+\.html$/.test(url.pathname))return true;}catch{}if((scope.getAttribute('type')||'').startsWith('video/'))return true;}
        if(/\bVideoObject\b/i.test(scope.getAttribute('itemtype')||''))return true;
        if(depth>0&&scope.querySelector('video,iframe[src]')){
          const r=scope.getBoundingClientRect(),n=node.getBoundingClientRect();
          if(r.width<=Math.max(n.width*2,120)&&r.height<=Math.max(n.height*2,120))return true;
        }
        if(scope.matches('article,figure,li'))break;
      }
      return false;
    }
    function show(node){
      if(target!==node||!allowed()||!node.isConnected||videoCover(node))return;
      if(!ui.previewImages||!image(node.currentSrc||node.src,node.alt))return;
      reveal();
    }
    const observer=new MutationObserver(()=>{if(!allowed()||(target?.matches('img')&&!ui.previewImages))close();});observer.observe(ui.$('panel'),{attributes:true,subtree:true,attributeFilter:['hidden','aria-selected']});
    bubble.addEventListener('wheel',event=>{if(bubble.hidden||!bubble.querySelector('.hover-image-frame')||!event.deltaY)return;event.preventDefault();event.stopImmediatePropagation();const scale=previewScale(ui.previewScale+(event.deltaY<0?.1:-.1));if(scale===ui.previewScale)return;ui.previewScale=scale;ui.previewScalePending=scale;sizeDirty=true;sizeImage({x:event.clientX,y:event.clientY});clearTimeout(sizeTimer);sizeTimer=setTimeout(saveSize,250);},{passive:false});
    ui.root.addEventListener('preview-size',sizeImage);window.addEventListener('resize',sizeImage,{passive:true});
    window.addEventListener('pointermove',event=>{
      if(event.composedPath().includes(bubble))return;
      if(!allowed()||event.buttons){close();return;}
      if(event.composedPath().includes(ui.host)){close();return;}
      const node=event.composedPath().find(node=>node instanceof Element&&node.matches('img,video,iframe'))||globalThis.PointResizePicker?.inspectAt(event.clientX,event.clientY,ui.host).find(candidate=>candidate.element?.matches('img,video'))?.element;
      if(node===target){if(node&&videoCover(node)){close();return;}if(bubble.hidden)point={x:event.clientX,y:event.clientY};return;}
      if(!node&&inTransit(event.clientX,event.clientY))return;
      point={x:event.clientX,y:event.clientY};
      close();if(!node||videoCover(node)||event.composedPath().includes(ui.host)||node.matches('img')&&!ui.previewImages)return;
      target=node;let owner=node;for(let i=0;i<3&&owner.parentElement;i++){const r=owner.parentElement.getBoundingClientRect(),n=node.getBoundingClientRect();if(r.width>Math.max(n.width*2,120)||r.height>Math.max(n.height*2,120))break;owner=owner.parentElement;}coverObserver.observe(owner,{childList:true,subtree:true,attributes:true,attributeFilter:['href','itemtype','itemprop']});timer=setTimeout(()=>show(node),350);
    },{capture:true,passive:true});
    for(const type of ['scroll','blur','pagehide'])window.addEventListener(type,close,{capture:true,passive:true});
    document.addEventListener('visibilitychange',close);
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!bubble.hidden){event.preventDefault();event.stopImmediatePropagation();close();}},true);
    window.addEventListener('pointerdown',event=>{if(!event.composedPath().includes(bubble))close();},true);
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[PREVIEW_KEY])close();});
    return {close};
  }
  globalThis.PointResizePanel = { create, hoverPreview, buttonCSS: BUTTON_CSS };
})();
