from pathlib import Path
root=Path(__file__).resolve().parents[2]
def edit(name,old,new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,name;p.write_text(s.replace(old,new),encoding='utf-8')
p=root/'src/desktop/panel-app.js';s=p.read_text(encoding='utf-8')
s=s.replace('let setupStep=1,setSetupStep=()=>{};','let setupStep=1,setSetupStep=()=>{},syncSetup=()=>{},pairBusy=false;')
start=s.index('    setup.innerHTML=');end=s.index('    ui.syncGeometry=',start)
s=s[:start]+'''    setup.innerHTML=`<section id="setup-step-1" class="setup-step" aria-current="step"><h3>① 选择浏览器</h3><div id="browser-choices"><div class="rule-actions"><button id="browser-chrome" class="primary" type="button" aria-pressed="false">谷歌浏览器</button><button id="browser-edge" type="button" aria-pressed="false">Edge</button></div></div><p id="browser-address" hidden></p><p id="browser-setup-status" role="status"></p></section>
      <section id="setup-step-2" class="setup-step"><h3>② 配对插件</h3><div class="rule-actions pairing-actions"><button id="browser-pair" type="button" disabled>配对浏览器插件</button></div><p id="pairing-status" role="status"></p></section><div id="paired-browsers" class="paired-browsers" aria-label="已配对浏览器"></div>`;
    ui.$('settings-page').prepend(setup);
    setSetupStep=value=>{setupStep=value;for(let step=1;step<=2;step++){const card=ui.$('setup-step-'+step);if(step===value)card.setAttribute('aria-current','step');else card.removeAttribute('aria-current');}syncSetup();};
    syncSetup=()=>{ui.$('browser-chrome').disabled=ui.$('browser-edge').disabled=installing||pairing||pairBusy;const button=ui.$('browser-pair');button.disabled=installing||pairBusy||(!pairing&&setupStep!==2);button.textContent=pairing?'配对中 · 点击取消':'配对浏览器插件';button.setAttribute('aria-busy',String(pairing));};
    async function beginPairing(){
      pairBusy=true;pairing=true;pairingError='';setSetupStep(2);
      try{await bridge.rpc('browser-pairing');ui.$('portable-status')?.setAttribute('hidden','');ui.$('pairing-status').textContent='已进入配对状态（10 分钟），请到插件网页完成配对。';}
      catch(error){pairing=false;pairingError=error.message;ui.$('pairing-status').textContent='未能进入配对状态：'+error.message;setSetupStep(1);}
      finally{pairBusy=false;syncSetup();}
    }
    async function cancelPairing(){
      if(pairBusy||!pairing)return;pairBusy=true;syncSetup();
      try{await bridge.rpc('browser-pairing-cancel');pairing=false;pairingError='';ui.$('pairing-status').textContent='已取消配对。';setSetupStep(1);}
      catch(error){ui.$('pairing-status').textContent='取消未完成：'+error.message;}
      finally{pairBusy=false;syncSetup();}
    }
    async function selectBrowser(browser){
      if(installing||pairing||pairBusy)return;installing=true;pairingError='';syncSetup();
      ui.$('browser-address').hidden=false;ui.$('browser-address').textContent=browser==='edge'?'edge://extensions/':'chrome://extensions/';for(const name of ['chrome','edge'])ui.$('browser-'+name).setAttribute('aria-pressed',String(name===browser));
      try{const result=await bridge.rpc('browser-setup',{browser});ui.$('browser-setup-status').textContent=!result.simulated&&!result.browserOpened?'浏览器未能启动。':!result.simulated&&!result.clipboardCopied?'地址复制失败。':'';if(result.simulated||result.browserOpened)await beginPairing();}
      catch(error){ui.$('browser-setup-status').textContent=error.message;setSetupStep(1);}
      finally{installing=false;syncSetup();}
    }
    ui.$('browser-pair').onclick=()=>pairing?cancelPairing():beginPairing();
    for(const browser of ['chrome','edge'])ui.$('browser-'+browser).onclick=()=>selectBrowser(browser);
    syncSetup();
''' + s[end:]
start=s.index("    const move=document.createElement('button');");end=s.index('    ui.$("dock").classList',start);s=s[:start]+s[end:]
old="    const maintenance=document.createElement('details'),summary=document.createElement('summary');summary.textContent='连接维护与移除';maintenance.append(summary);ui.$('native-settings').before(maintenance);maintenance.append(ui.$('native-settings'));"
assert old in s;s=s.replace(old,"    ui.$('settings-backup').before(ui.$('native-settings'));")
old="const wasConnected=connected;connected=message.connected;pairing=!!message.pairing;ui.$('connection-light').title=message.reason;"
assert old in s;s=s.replace(old,"const wasConnected=connected,wasPairing=pairing;connected=message.connected;if(!pairBusy)pairing=!!message.pairing;ui.$('connection-light').title=message.reason;if(pairing)setSetupStep(2);else if(wasPairing&&!pairBusy)setSetupStep(1);")
start=s.index("      ui.$('browser-setup').hidden=false;");end=s.index("      ui.$('tab-resize').disabled=",start)
s=s[:start]+"      ui.$('browser-setup').hidden=false;syncSetup();\n      if(connected&&!pairing&&!pairingError){ui.$('pairing-status').textContent='';ui.$('portable-status')?.setAttribute('hidden','');}\n"+s[end:]
s=s.replace('chooseTab(\'settings\');setSetupStep(3);',"chooseTab('settings');if(!pairing)setSetupStep(1);")
p.write_text(s,encoding='utf-8')
# Keep the existing common button styling; only order and redundant controls change.
p=root/'src/desktop/player.html';s=p.read_text(encoding='utf-8');start=s.index('  <div id="video-top">');end=s.index('\n',start)
s=s[:start]+'''  <div id="video-top"><button id="quiet" class="textbutton" type="button" title="悬停隐藏按钮和鼠标；移动鼠标或按 Esc 恢复">安静观看</button><button id="move" class="textbutton video-move" type="button" title="按住拖动，方向键移动">移动</button><button id="video-next" class="textbutton" type="button" aria-label="播放下一条视频">下一条</button><button id="video-close" class="textbutton" type="button" aria-label="关闭视频小窗">关闭视频</button></div>'''+s[end:]
s=s.replace('<button class="textbutton" id="next">下一条</button><button class="textbutton" id="close">关闭视频</button>','')
p.write_text(s,encoding='utf-8')
edit('src/desktop/player.js',"$('video-next').disabled = $('next').disabled = !items.length;","$('video-next').disabled = !items.length;")
edit('src/desktop/player.js',"$('close').onclick = $('video-close').onclick", "$('video-close').onclick")
edit('src/desktop/player.js',"$('next').onclick = $('video-next').onclick", "$('video-next').onclick")
edit('src/setup.html','>知道了</button>','>确认，关闭当前网页</button>')
edit('src/setup.js',"$('success-close').onclick=()=>$('pair-success').close();", "$('success-close').onclick=async()=>{const button=$('success-close');button.disabled=true;try{const tab=await chrome.tabs.getCurrent();if(!tab?.id)throw new Error('请手动关闭当前配对网页。');await chrome.tabs.remove(tab.id);}catch(error){$('success-message').textContent='配对已成功。'+error.message;button.disabled=false;}};")
for name in ['src/setup.js','src/setup.html']:
 p=root/name;p.write_text(p.read_text(encoding='utf-8').replace('第③步','第②步').replace('三步引导','两步引导'),encoding='utf-8')
for p in (root/'src').rglob('*'):
 if p.suffix in ['.md','.js','.html','.json','.cs']:
  s=p.read_text(encoding='utf-8');n=s.replace('0.18.2','0.18.3')
  if n!=s:p.write_text(n,encoding='utf-8')
