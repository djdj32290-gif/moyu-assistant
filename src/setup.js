(() => {
  const style=document.createElement('style');style.textContent=PointResizePanel.buttonCSS.replaceAll(':host',':root');document.head.append(style);
  const $=id=>document.getElementById(id),origins=chrome.runtime.getManifest().optional_host_permissions;
  let generation=0,timer=0,connectURL='',busy=false,connected=false,remindOnSuccess=false;
  const note=text=>$('setup-status').textContent=text;
  async function request(kind){const result=await chrome.runtime.sendMessage({type:'VIDEO_NATIVE_'+kind});if(!result?.ok)throw new Error(result?.error||'连接失败，请重试。');return result;}
  function stop(){++generation;clearTimeout(timer);timer=0;}
  function show(value){connected=value;$('pair').hidden=value;$('launch').hidden=!value;$('pair').disabled=busy;$('setup-light').dataset.connected=String(value);$('setup-light').setAttribute('aria-label',value?'已连接，绿灯':'未连接，红灯');}
  async function success(){stop();const token=generation;connectURL='';show(true);const granted=await chrome.permissions.contains({origins});if(token!==generation)return;note(granted?'已连接，旧数据已同步。回到桌面软件即可使用；以后会自动连接。':'已连接，旧数据已同步。网页访问尚未授权，自动执行和截图会受限，可在下面重新授权。');if(remindOnSuccess){remindOnSuccess=false;$('success-message').textContent=granted?'插件已连接，资料已同步，可以回到软件使用。':'插件已连接，资料已同步。网页访问尚未授权，可在本页重新授权。';if(!$('pair-success').open)$('pair-success').showModal();}}
  async function poll(token,deadline){
    if(token!==generation)return;
    let failure=false;
    try{const result=await request('PAIR');if(token!==generation)return;if(result.connected){await success();return;}}
    catch(error){if(token!==generation)return;failure=true;note(error.message);}
    if(Date.now()>=deadline){stop();$('pair').textContent='配对并授权';note('尚未收到软件的连接确认。若已经允许打开 EXE，请查看其第②步下方的具体错误；确认软件和插件来自同一新版目录，再进入配对状态重试。');return;}
    if(!connected&&!failure)note('仍在等待软件连接确认。若已授权打开 EXE，请查看软件第②步下方的登记结果；两边绿灯前均未确认成功。');
    timer=setTimeout(()=>poll(token,deadline),1500);
  }
  function launchAndWait(){
    PointResizeNativeSettings.launch(connectURL);
    $('pair').textContent='打开软件完成配对';
    note('请确认 EXE 已进入配对状态，再允许浏览器打开“摸鱼助手”传递插件身份。实际连接同步后两边才亮绿灯；没有提示时可再次点击。');
    const token=generation;timer=setTimeout(()=>poll(token,Date.now()+90000),1200);
  }
  $('pair').onclick=async()=>{
    if(busy)return;stop();remindOnSuccess=true;
    if(connectURL){try{launchAndWait();}catch(error){note(error.message);}return;}
    // Request optional website access directly inside the user's click handler.
    const permission=chrome.permissions.request({origins});busy=true;show(false);note('请按浏览器提示确认网页访问，随后完成软件配对。');
    try{await permission;const result=await request('PAIR');if(result.connected)await success();else{connectURL=result.connectUrl;if(!connectURL)throw new Error('未收到连接地址，请重新加载插件。');launchAndWait();}}
    catch(error){note(error.message);}
    finally{busy=false;show(connected);}
  };
  $('authorize').onclick=async()=>{try{const allowed=await chrome.permissions.request({origins});$('help-status').textContent=allowed?'网页访问已授权。':'网页访问未全部授权，自动执行和截图会受限。';if(connected)await success();}catch(error){$('help-status').textContent=error.message;}};
  $('launch').onclick=async()=>{try{const result=await chrome.runtime.sendMessage({type:'POINT_RESIZE_DESKTOP_OPEN'});if(!result?.ok)throw new Error(result?.error||'打开失败。');note('桌面软件已唤出，可以关闭此页。');}catch(error){note(error.message);}};
  $('success-close').onclick=async()=>{const button=$('success-close');button.disabled=true;try{const tab=await chrome.tabs.getCurrent();if(!tab?.id)throw new Error('请手动关闭当前配对网页。');await chrome.tabs.remove(tab.id);}catch(error){$('success-message').textContent='配对已成功。'+error.message;button.disabled=false;}};
  $('pair-success').addEventListener('close',()=>$('launch').focus());
  chrome.runtime.onMessage.addListener(message=>{if(message.type!=='VIDEO_NATIVE_PAIR_CANCELLED')return;stop();remindOnSuccess=false;connectURL='';$('pair').textContent='配对并授权';if(!connected)note('配对已取消，请回到软件选择浏览器后重试。');});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local'||!changes['point-resize:desktop-link:v1'])return;const value=changes['point-resize:desktop-link:v1'].newValue;if(value?.connected)success().catch(error=>note(error.message));else if(connected){stop();connectURL='';$('pair').textContent='配对并授权';show(false);note('浏览器连接已断开。重新配对后恢复使用，已保存资料保留。');}});
  request('LINK_STATUS').then(result=>{if(result.connected&&!busy&&!connectURL)success().catch(error=>note(error.message));}).catch(error=>note(error.message));
  window.addEventListener('pagehide',stop,{once:true});
})();
