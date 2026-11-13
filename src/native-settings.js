(() => {
  if (globalThis.PointResizeNativeSettings) return;
  const key = 'point-resize:desktop-link:v1';
  const api = {
    launch(url) {
      if (!/^pointresize-video:\/\/connect\?extension=[a-p]{32}$/.test(url)) throw new Error('连接地址无效。');
      const anchor = document.createElement('a'); anchor.href = url; anchor.style.display = 'none';
      document.documentElement.append(anchor); anchor.click(); anchor.remove();
    },
    saveInstaller(payload, root) {
      if (!/^PointResizeVideo-[a-p]{32}\.msi$/.test(payload.filename)) throw new Error('安装包文件名无效。');
      const bytes = Uint8Array.from(atob(payload.base64), value => value.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/x-msi' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = payload.filename;
      root.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
    mount(ui) {
      const $ = ui.$, button = $('native-toggle'), status = $('native-status'), install = $('native-install'), uninstall = $('native-uninstall');
      let connected = false, waiting = false, timer = 0, generation = 0, mode = 'CONNECT', busy = false;
      const note = text => { status.textContent = text; ui.syncControls(); };
      function syncControls() {
        button.disabled = busy;
        install.disabled = busy || waiting || connected;
        uninstall.disabled = busy || waiting;
      }
      const controls = value => { busy = value; syncControls(); };
      function show(value) { connected = !!value; button.textContent = connected ? '断开桌面助手' : '连接桌面助手'; button.setAttribute('aria-pressed', String(connected)); syncControls(); }
      async function request(type) {
        const result = await chrome.runtime.sendMessage({ type: 'VIDEO_NATIVE_' + type });
        if (!result?.ok) throw new Error(result?.error || '连接操作失败，请重新加载扩展并刷新网页。');
        return result;
      }
      function cancel() { ++generation; clearTimeout(timer); waiting = false; show(connected); controls(false); }
      async function poll(token, deadline) {
        if (token !== generation || !waiting) return;
        try {
          const result = await request(mode);
          if (token !== generation || !waiting) return;
          if (result.connected) { cancel(); show(true); note('已连接。再次点击扩展图标打开独立面板；视频与面板可分别关闭。'); return; }
        } catch { /* Continue while the user completes the first browser prompt. */ }
        if (token !== generation || !waiting) return;
        if (Date.now() >= deadline) { cancel(); note('尚未连接。请确认已在下载栏打开安装包并完成安装，再点连接。'); return; }
        timer = setTimeout(() => poll(token, deadline), 1500);
      }
      function waitForConnection(kind, deadline) {
        mode = kind; waiting = true; controls(false); button.textContent = '取消等待连接';
        const token = generation;
        timer = setTimeout(() => poll(token, deadline), 1000);
      }
      $('native-settings').hidden = false;
      if (!chrome.runtime.id) { controls(true); note('桌面安装和连接仅在浏览器扩展中使用，体验页不启动桌面程序。'); return; }
      install.onclick = async () => {
        if (busy || waiting || connected) return;
        controls(true); const token = ++generation;
        try {
          const payload = await request('INSTALLER');
          if (token !== generation) return;
          await api.saveInstaller(payload, ui.root);
          waitForConnection('PROBE', payload.pendingUntil);
          note('已导出安装包。请在浏览器下载栏点“打开”，先关闭软件主面板和视频再安装；安装完成后会自动连接。请保留文件名中的 ID。');
        } catch (error) { cancel(); request('CANCEL_INSTALL').catch(() => {}); note(error.message); }
        finally { if (!waiting) controls(false); }
      };
      uninstall.onclick = async () => {
        if (busy || waiting) return;
        cancel(); controls(true); const token = generation;
        try {
          await request('UNINSTALL');
          if (token !== generation) return;
          show(false); note('已请求打开 Windows 卸载窗口，请按窗口提示操作；这不代表已经卸载完成。取消卸载后，可点连接恢复使用。');
        } catch (error) { note(error.message); }
        finally { if (token === generation) controls(false); }
      };
      button.onclick = async () => {
        if (waiting) { cancel(); request('CANCEL_INSTALL').catch(() => {}); note('已取消等待，可随时重新连接。'); return; }
        if (busy) return;
        controls(true); const token = ++generation;
        try {
          const result = await request(connected ? 'DISCONNECT' : 'CONNECT');
          if (token !== generation) return;
          if (result.connected) { show(true); note('已连接。再次点击扩展图标打开独立面板；视频与面板可分别关闭。'); }
          else if (result.connectUrl) {
            note('已安装助手时，请允许浏览器打开助手；尚未安装时可取消等待，再点“安装助手”。无须输入 ID。');
            api.launch(result.connectUrl);
            waitForConnection('CONNECT', Date.now() + 60000);
          } else { show(false); note('已断开浏览器连接。软件和视频可独立使用；下次点连接即可恢复，无须重新配置。'); }
        } catch (error) { cancel(); note(error.message); }
        finally { if (!waiting) controls(false); }
      };
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[key] || waiting) return;
        const value = changes[key].newValue; show(value?.enabled && value?.connected);
      });
      request('LINK_STATUS').then(result => {
        if (generation !== 0 || busy || waiting) return;
        show(result.connected);
        if (result.pendingUntil > Date.now()) {
          waitForConnection('PROBE', result.pendingUntil);
          note('正在等待安装后自动连接。请在下载栏打开安装包并完成安装，也可取消等待。');
        } else note(result.connected ? '浏览器已连接。可直接打开桌面软件，主面板和视频分别关闭。' : '首次点“安装助手”，再在下载栏打开安装包；安装后自动连接。');
      }).catch(error => note(error.message));
      window.addEventListener('pagehide', cancel, { once: true });
    }
  };
  globalThis.PointResizeNativeSettings = api;
})();
