exec((__import__('pathlib').Path(__file__).with_name('update-0185.py')).read_text(encoding='utf-8').split('# Storage remains')[0])
edit('src/desktop/panel-app.js',"if(node.id!=='native-settings')", "if(!['native-settings','hover-settings'].includes(node.id))")
edit('src/desktop/panel-app.js','setup.innerHTML=`<section', 'setup.innerHTML=`<details class="disclosure-card" id="setup-card" open><summary id="setup-summary">浏览器连接</summary><section')
edit('src/desktop/panel-app.js','</section><div id="paired-browsers"', '</section></details><div id="paired-browsers"')
edit('src/desktop/panel-app.js','      ui.$(\'browser-setup\').hidden=false;syncSetup();', '''      ui.$('browser-setup').hidden=false;syncSetup();
      const setupCard=ui.$('setup-card');if(!connected||pairing)setupCard.open=true;else if(!wasConnected||wasPairing)setupCard.open=false;
      ui.$('setup-summary').textContent=connected?'浏览器连接 · 已连接':'浏览器连接';''')
edit('src/desktop/panel-app.js','padding:0 14px 8px}.pairing-actions','padding:0}.pairing-actions')
edit('src/desktop/panel-app.js','background:#f4f6f5}.setup-step[', 'background:#f4f6f5}.setup-step:last-child{margin-bottom:0}.setup-step[')
edit('src/desktop/panel-app.js','pairBusy=true;pairing=true;pairingError=', "ui.$('setup-card').open=true;pairBusy=true;pairing=true;pairingError=")
tabs='<div class="provider-tabs" id="queue-platforms" role="tablist" aria-label="按平台筛选">'+''.join(f'<button class="provider-tab" id="queue-platform-{key}" type="button" role="tab" aria-selected="{str(key=="all").lower()}" aria-controls="queue" tabindex="{0 if key=="all" else -1}" data-provider="{key}">{label}</button>' for key,label in [('all','全部'),('bilibili','B站'),('huya','虎牙'),('other','其他')])+'</div>'
edit('src/desktop/player.html','<ul id="queue"',tabs+'<ul id="queue"')
edit('src/desktop/player.css','#queue{padding:', '.provider-tabs{display:flex;gap:6px;padding:5px;background:#f3f7f5;border:1px solid #dce6e1;border-radius:12px;margin:6px 0;flex:none}\n#queue{padding:')
# Remove the replaced empty-list branch rather than keeping dead code.
p=root/'src/video-page.js';s=p.read_text(encoding='utf-8');s='\n'.join(line for line in s.split('\n') if 'if (false) { const empty' not in line);p.write_text(s,encoding='utf-8')
print('Updated setup disclosure, settings grouping and sidebar filters')
