from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[2]
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
run=read('work/software-main/final-0183/run.json')
assert run['version']=='0.18.3' and len(run['runs'])==17 and all(r['exitCode']==0 for r in run['runs'])
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe'
digest=hashlib.sha256(binary.read_bytes()).hexdigest();assert run['binarySHA256']==digest
specs=[
 ('两步配对、播放往返及窗口样式','work/software-main/cycle-verification.json','checks',15),
 ('并发网页脚本登记','work/software-main/registration-verification.json','checks',4),
 ('首次显示与后台准备','work/software-main/startup-verification.json','checks',6),
 ('界面、拖动、多浏览器和真实裁剪','work/software-main/moyu-verification.json','checks',22),
 ('免安装配对与移动','work/software-main/pairing-verification.json','checks',30),
 ('配对提醒与自动重连','work/software-main/onboarding-verification.json','checks',22),
 ('独立桌面主面板','work/panel-desktop/verification.json','checks',24),
 ('软件生命周期、裁剪及缓存','work/software-main/verification.json','report',23),
 ('桌面视频与媒体行为','work/native-video/verification.json','report',50),
 ('资料库迁移与恢复','work/software-main/library-verification.json','checks',18),
 ('独立测试目录清理','work/installer/cleanup-verification.json','checks',5),
 ('原有网页调整','work/verification.json','tests',58),
 ('旧格式备份','work/backup/verification.json','checks',14),
 ('具体页面及临时草稿隔离','work/page-isolation/verification.json','checks',15),
 ('兼容 MSI 只读检查','work/installer/verification.json','checks',41)]
for _,name,key,count in specs:
 info=read(name);assert len(info[key])==count,(name,len(info[key]));assert not info.get('errors'),name
 if 'version' in info:assert info['version']=='0.18.3',name
 if 'binarySHA256' in info:assert info['binarySHA256']==digest,name
msi=read('work/installer/build-manifest.json');assert read('work/installer/verification.json')['msiSHA256']==msi['msiSHA256'];assert hashlib.sha256(Path(msi['msi']).read_bytes()).hexdigest()==msi['msiSHA256']
package=root/'outputs/摸鱼助手-免安装版-0.18.3.zip';record=read('work/native-video/portable-build-manifest.json')
assert record['version']=='0.18.3'
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None and len(z.namelist())==65
 assert {n.split('/')[0] for n in z.namelist()}=={'这个文件夹是什么.md','摸鱼助手'}
 assert z.read('摸鱼助手/摸鱼助手.exe')==binary.read_bytes()
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
manifest=read('src/manifest.json');assert manifest['version']=='0.18.3' and manifest['permissions']==['activeTab','scripting','storage','nativeMessaging']
review=read('work/software-main/source-review-0183.json');assert review['sharedButtonCSSOnlyAuthorizedMoveSize'] and review['permissionsUnchanged'] and review['coreDOMLibraryBackupSourcesUnchanged']
total=sum(x[3] for x in specs);assert total==347
table='\n'.join(f'| {label} | {count} |' for label,_,_,count in specs)
cycle=read('work/software-main/cycle-verification.json')
timing={r['kind']:r['milliseconds'] for r in cycle['timings']}
startup=read('work/software-main/startup-verification.json')['measurements']
startup_table='\n'.join(f"| {'新建独立缓存' if r['kind']=='fresh-profile' else '已有独立缓存，软件真正重启'} | {r['firstPaintMilliseconds']} ms | {r['elapsedMilliseconds']} ms |" for r in startup)
text=f'''# 摸鱼助手 0.18.3：交付与验证

交付日期：2026-11-13（香港时间）。推荐 [摸鱼助手-免安装版-0.18.3.zip](摸鱼助手-免安装版-0.18.3.zip)。解压后为“这个文件夹是什么.md”和“摸鱼助手/”软件文件夹，运行其中“摸鱼助手.exe”。

## 本次修改

1. 播放器顶部依次为“安静观看｜移动｜下一条｜关闭视频”；侧栏删除重复的下一条和关闭，列表、已看等功能保留。“移动”按钮加大到 34px 高、左右内边距 14px，其他顶部文字按钮为 28px 高；例外集中在 panel.js 的 BUTTON_CSS，字号、颜色、交互状态继续共用。
2. 去掉视频窗口原来的绿色边框和原生内边距，视频铺满窗口。画面内 8 个逻辑像素的透明边缘及角落捕获指针，把屏幕坐标差换算后交给原生窗口调整尺寸，并限制最小大小及屏幕工作区；没有额外占鼠标的透明外框。八个方向的 WebView 指针拖动均核对了原生窗口实际尺寸变化。独立主面板的真实 Region 裁剪继续保留。
3. 播放时隐藏并保留当前主面板；正常关闭视频后恢复同一主面板和 WebView，不再为这次返回重新准备。移出自动暂停隐藏视频时不会弹出主面板。真正关闭主面板后不会因重连自动重开；真正退出后再启动仍需要初始化 WebView2。
4. 主面板显示后预热原有播放器的本地无媒体外壳，减少点击播放后的初始化等待；不提前加载视频或媒体网络资源。预热窗口实际隐藏、不在任务栏显示，不冒充播放成功；主面板真正关闭后释放闲置预热进程。实际播放中的视频仍可独立保留。预热到播放保持同一窗口句柄，避免立即播放时因切换任务栏样式而重建句柄、打断 WebView2 初始化。窗口及 WebView 从创建开始使用现有暗色背景，B站嵌入播放器空白加载阶段暂不展示 iframe；iframe load 仅控制显示，播放成功和已看仍由实际解码及进度确认。
5. 设置改为两步：①选择浏览器（谷歌按钮使用公共深绿样式），点击后复制扩展管理页地址并请求打开浏览器与插件目录；随后自动进入②配对。第一步时配对按钮禁用，等待时浏览器选择禁用；配对按钮显示“配对中 · 点击取消”，再次点击取消并回到第一步，已有连接保留。完成、失败、取消及旧回调按尝试 ID 隔离，旧结果不能结束新配对。
6. 配对成功弹窗按钮为“确认，关闭当前网页”，确认只关闭当前扩展配对标签页，其他网页保留。实际通信、资料同步和主面板确认成功后才显示完成；浏览器权限和外部程序确认仍由用户操作。
7. 主面板去掉“移动”按钮，保留“置顶、关闭”，仍可按住标题拖动或使用标题的方向键。连接记录直接显示在导入导出上方，导入导出仍在已连接并同步后显示。成功配对留在设置页。

资料库格式、完整规则、截图、隐藏和层级分支、名称及启用状态、完整待看和已看、旧备份兼容保留。网页 DOM 与临时草稿继续由扩展按标签页、文档和网址隔离处理。强制权限和可选网站权限不变。

## 验证结果

**{total} 项通过，另有两个成品包校验通过。** 原生管道及单实例相关测试顺序执行。

| 范围 | 通过项数 |
| --- | ---: |
{table}

本机使用已预热播放器的本地 HTTP 测试媒体，点击播放到实际解码约 {timing['prewarmed-click-to-decode']} ms；关闭视频到恢复原主面板约 {timing['close-player-to-same-panel']} ms。已核对同一主面板 PID、HWND，以及未重新写入的启动准备记录。该计时不代表 B站网络、登录、验证或其他电脑的速度；播放依据真实媒体状态，不以 opened、窗口显示、iframe load 或加入列表代替。

真正重启软件的独立缓存测试如下（从主面板对象创建开始计时，不含 Windows 双击到装入 .NET 的全部时间）：

| 场景 | 原生首次绘制 | 正式界面区域就绪 |
| --- | ---: | ---: |
{startup_table}

配对确认关闭测试实际删除自己的扩展标签页，并确认另一个网页仍在。多浏览器长流程夹具为复用同一测试页面，模拟关闭弹窗；真实标签页关闭由独立生命周期测试覆盖。取消后迟到的协议回调、旧尝试完成/失败、新尝试以及已有绿色连接均有验证。

真实原生裁剪使用独立下层窗口检查 WindowFromPoint 与接收点击，覆盖当前实际 144 DPI 及 WebView 67%、125%、150%、200% 缩放。测量只临时抬升自己的测试窗口并恢复原置顶状态，确认下层窗口实际可见。16 帧主面板拖动过程中形状和侧栏方向不变，松开后校正并换侧。视频边缘调整通过 WebView 调试输入的指针按下、移动和松开，走实际指针捕获与原生 Bounds 路径，核对八个方向窗口尺寸变化；本环境 SetCursorPos 被限制，未把它描述为实际系统鼠标拖动已验证。未具备混合 DPI 多显示器环境。

视频解码、隐藏、暂停恢复、已看、独立视频与主面板往返、旧资料迁移及备份均在 D 盘独立资料中验证。复制管理页地址、打开日常浏览器/插件目录、协议登记与生产清理在测试模式记录目标；仅使用专用 Native Messaging 登记，不改日常浏览器资料或剪贴板，没有代用户接受真实首次权限提示。兼容 MSI 仅构建和只读验证，未执行真实安装、升级或卸载。

## 更新方法

关闭浏览器、主面板和视频后更新程序、依赖、ui 和插件，**保留自己的“资料库、data、导出文件”**。已有扩展沿用原目录和 ID，更新后在扩展管理页重新加载；不先卸载或清空扩展数据。

使用新目录时，把原软件的整个“资料库”复制过去并保留原件；需要登录缓存及窗口位置时也保留原 data。先确认重新配对同步和资料完整，再整理旧目录，不同时运行新旧两份。软件未修改隔离标签、安全策略，也没有要求管理员权限。

## 成品核对

- 主 ZIP：65 个白名单文件，未混入 MSI、源码、测试浏览器资料、运行缓存或用户资料库。
- 软件 SHA-256：`{digest}`。
- ZIP SHA-256：`{hashlib.sha256(package.read_bytes()).hexdigest()}`。
- ZIP 大小：{package.stat().st_size:,} 字节。
- 最终记录：work/software-main/final-0183/run.json，17 个命令退出码均为 0；源码复核：work/software-main/source-review-0183.json。
- 原有 DOM 选区、资料库存储器、备份和视频列表核心源码保持原样；本次改动集中在界面、配对取消隔离及窗口生命周期。

## 预览

![两步设置](摸鱼助手-两步设置-0.18.3.png)

![播放器四按钮及无外框](摸鱼助手-播放器四按钮-0.18.3.png)

![配对确认关闭当前网页](摸鱼助手-配对确认关闭-0.18.3.png)
'''
(root/'outputs/摸鱼助手-0.18.3-交付与验证.md').write_text(text,encoding='utf-8')
print(f'Written 0.18.3 report: {total} checks, 2 package verifiers, native SHA256 {digest}')
