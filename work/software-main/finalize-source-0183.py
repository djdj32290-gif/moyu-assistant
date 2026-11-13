from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'src/desktop/这个文件夹是什么.md';s=p.read_text(encoding='utf-8');a=s.index('1. 第一张卡片');b=s.index('\n未连接时',a)
s=s[:a]+'''1. 第一张卡片直接选择谷歌浏览器或 Edge。软件会复制 chrome://extensions/ 或 edge://extensions/，并请求打开浏览器和插件目录。没有进入管理页时，在浏览器地址栏粘贴并回车，开启开发者模式，加载“浏览器插件/摸鱼助手”。
2. 第二张卡片自动进入配对等待，选择浏览器暂时禁用。装好插件后，在插件网页点“配对并授权”，按浏览器提示确认；实际通信和资料同步后亮绿灯，点“确认，关闭当前网页”只关闭这张配对页。配对中再次点软件按钮可取消并回到第一步，不断开已有浏览器。成功后留在设置页，可继续选择其他浏览器。

播放器顶部依次为“安静观看、移动、下一条、关闭视频”，侧边栏保留列表与观看设置。开始播放后主面板隐藏，关闭播放器后恢复同一主面板；鼠标移出自动隐藏视频不会打开主面板。软件打开期间会后台预热无视频的播放器界面，关闭软件后释放闲置预热进程，不设开机启动。真正退出后再次运行仍需初始化。
''' +s[b:];p.write_text(s,encoding='utf-8')
p=root/'src/desktop/使用说明.md';s=p.read_text(encoding='utf-8');a=s.index('3. 第一步');b=s.index('\n5. 更新',a)
s=s[:a]+'''3. 第一步直接选择“谷歌浏览器 / Edge”，自动复制管理页地址、请求打开浏览器并选中插件文件夹，进入第二步配对等待。Chrome 可能过滤外部传入的内部地址；未进入管理页时在地址栏粘贴并回车。开启开发者模式，加载“浏览器插件/摸鱼助手”，拖入无效时用“加载已解压的扩展程序”。
4. 第二步显示“配对中 · 点击取消”（10 分钟），浏览器选择暂时禁用；再点一次取消并回到第一步，已有连接保留。插件刚安装自动打开配对网页，红灯点击图标也能打开。在网页点“配对并授权”，按浏览器提示确认。通信、资料同步与主面板确认完成后亮绿灯，点“确认，关闭当前网页”仅关闭配对页；软件仍在设置页，并恢复浏览器选择。错误显示在第二步下方。''' +s[b:]
s=s.replace('标题与移动按钮可拖动或用方向键移动','标题可拖动或用方向键移动')
s+='\n## 播放时切换窗口\n\n播放器顶部依次为“安静观看、移动、下一条、关闭视频”，侧栏删除重复的关闭与下一条。播放时隐藏主面板并保留运行状态，关闭视频后恢复同一个窗口，不再重新准备；移出隐藏只作用于视频，不恢复主面板。显式关闭主面板后不自动重开。主界面显示后后台预热无媒体播放器外壳；软件关闭后闲置预热进程退出。真正退出再开仍需初始化，视频网络加载由来源决定。\n'
p.write_text(s,encoding='utf-8')
p=root/'src/安装说明.html';s=p.read_text(encoding='utf-8').replace('第一步点“安装浏览器插件”，第二步选谷歌浏览器或 Edge 后，','第一步直接选谷歌浏览器或 Edge 后，').replace('第三步配对等待','第二步配对等待').replace('第三步显示进入配对状态后，','第二步显示进入配对状态后，').replace('网页弹出“配对成功”；','网页弹出“配对成功”，点“确认，关闭当前网页”只关闭配对页；');p.write_text(s,encoding='utf-8')
p=root/'AGENTS.md';p.write_text(p.read_text(encoding='utf-8')+'''\n- 按用户 2026-11-13 最新授权，0.18.3 设置改两步：第一步直接选择浏览器（Chrome 使用公共 primary 深绿），自动复制地址/打开浏览器与目录后进入第二步等待；两步互斥，配对按钮等待时可再次点击取消，取消回第一步并保留已连接实例。配对尝试 ID 必须隔离，旧完成或失败不能结束新等待，取消后的确认不得报成功。配对完成弹窗按钮为“确认，关闭当前网页”，仅删除当前扩展配对标签页，不影响其他网页。维护内容直接展示并放在导入导出前，去掉主面板移动按钮，保留置顶/关闭及标题拖动。\n- 0.18.3 播放器顶部依次“安静观看、移动、下一条、关闭视频”，侧栏去掉重复关闭/下一条；沿用 BUTTON_CSS。主面板显示后允许后台预热原有播放器的本地无媒体外壳，播放时隐藏并保留主面板，正常关闭播放器恢复同一面板；移出自动隐藏不恢复主面板。闲置预热绑定创建它的主面板进程，主面板真正关闭则释放，已播放的视频仍可独立运行；所有退出/卸载仍关闭自己窗口，不因重连自动弹出。真正退出再开仍需 WebView2 初始化。播放器原生 WebView 背景从创建即设为现有暗色视频色，B站嵌入页面加载前暂不展示空白 iframe；iframe load 只用于显示界面，成功/已看仍须真实媒体解码与进度。\n''',encoding='utf-8')
p=root/'work/software-main/verify-portable.cjs';s=p.read_text(encoding='utf-8').replace("ui.locator('#browser-chrome').textContent(),'安装浏览器插件'","ui.locator('#browser-chrome').textContent(),'谷歌浏览器'")
s=s.replace("Step ① only reveals Google Chrome and Edge directly below it, removes the rejected paragraph and does not open a folder","Step ① directly offers Chrome and Edge without opening a folder before selection").replace('Selecting a browser in step 2 records','Selecting a browser in step 1 records');p.write_text(s,encoding='utf-8')
