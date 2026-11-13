from pathlib import Path
import json,hashlib,zipfile,shutil
root=Path(__file__).resolve().parents[2]
def read(p):return json.loads((root/p).read_text(encoding='utf-8-sig'))
run=read('work/software-main/final-0181/run.json')
assert run['version']=='0.18.1' and len(run['runs'])==14 and all(x['exitCode']==0 for x in run['runs'])
assert len(run.get('additionalRuns',[]))==7 and all(x['exitCode']==0 for x in run['additionalRuns'])
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe';digest=hashlib.sha256(binary.read_bytes()).hexdigest();assert run['binarySHA256']==digest
specs=[
 ('新界面、连续拖动和多浏览器','work/software-main/moyu-verification.json','checks',21),
 ('免安装配对、图标和移动','work/software-main/pairing-verification.json','checks',30),
 ('首次引导及自动重连','work/software-main/onboarding-verification.json','checks',20),
 ('独立桌面面板','work/panel-desktop/verification.json','checks',24),
 ('软件生命周期、区域裁剪及缓存','work/software-main/verification.json','report',23),
 ('桌面视频','work/native-video/verification.json','report',50),
 ('资料库迁移与恢复','work/software-main/library-verification.json','checks',18),
 ('独立目录清理','work/installer/cleanup-verification.json','checks',5),
 ('原有网页调整回归','work/verification.json','tests',58),
 ('备份','work/backup/verification.json','checks',14),
 ('页面及草稿隔离','work/page-isolation/verification.json','checks',15),
 ('兼容 MSI 只读检查','work/installer/verification.json','checks',41)]
for label,p,key,count in specs:
 info=read(p);assert len(info[key])==count,(p,len(info[key]));assert not info.get('errors'),p
 if 'binarySHA256' in info:assert info['binarySHA256']==digest,p
 if 'version' in info:assert info['version']=='0.18.1',p
msi=read('work/installer/build-manifest.json');assert read('work/installer/verification.json')['msiSHA256']==msi['msiSHA256'];assert hashlib.sha256(Path(msi['msi']).read_bytes()).hexdigest()==msi['msiSHA256']
package=root/'outputs/摸鱼助手-免安装版-0.18.1.zip';record=read('work/native-video/portable-build-manifest.json')
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None and len(z.namelist())==65
 assert {n.split('/')[0] for n in z.namelist()}=={'这个文件夹是什么.md','摸鱼助手'}
 assert z.read('摸鱼助手/摸鱼助手.exe')==binary.read_bytes()
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
manifest=read('src/manifest.json');assert manifest['name']=='摸鱼助手' and manifest['permissions']==['activeTab','scripting','storage','nativeMessaging']
for suffix in ('png','svg'):shutil.copy2(root/('src/icons/256.png' if suffix=='png' else 'src/icons/fish.svg'),root/('outputs/摸鱼助手-logo.'+suffix))
total=sum(x[3] for x in specs);assert total==319
table='\n'.join(f'| {label} | {count} |' for label,_,_,count in specs)
text=f'''# 摸鱼助手 0.18.1：交付与验证

交付日期：2026-11-12（香港时间）。推荐使用 [摸鱼助手-免安装版-0.18.1.zip](摸鱼助手-免安装版-0.18.1.zip)。完整展开目录位于“摸鱼助手免安装版/”，顶层只有说明 MD 和软件文件夹。

## 本次完成

1. 产品展示名、主软件目录、EXE、插件名称统一为“摸鱼助手”；“点选缩放”继续作为功能标签。既有连接协议、资料库格式和缓存键保持兼容。
2. 三步卡片依次为①选择浏览器、②链接打开扩展管理页、③配对插件。当前卡片白底绿框，其他灰底且可返回操作。第二步仅在明确点击链接时请求打开所选浏览器和插件目录，并调用原生剪贴板写入固定的扩展管理页地址；失败时显示手动复制提示。随后自动开始原有配对等待，不把打开请求当成安装成功。第三步的配对按钮可重复添加浏览器。等待时显示“配对中…”，已有连接继续使用；下方分别列出浏览器图标、名称与实际同步连接红绿灯。同类浏览器的不同身份分别显示。
3. EXE 维护区仅保留“清除注册表记录”。清理仍指向自己目录的 Chrome/Edge Native Messaging 和协议登记，通知全部已连接扩展断开，不删除插件和资料库。清理成功后，普通重开不会自动恢复登记，显式配对才恢复。失败如实提示。
4. 配对网页移除重复的断开、清理按钮，保留重新授权网页访问；内容水平、垂直居中，窄屏和展开帮助时可滚动。
5. 连接且同步确认后才显示整个导入导出区域；断开后隐藏。主面板全局状态只用顶栏当前标题旁的一盏灯表示，不再每页占一行“已连接”。配对和重连后留在设置页，不自动切到点选页。
6. 桌面三个侧边标签常态为白底，桌面例外集中在 panel.js 的 BUTTON_CSS。其余操作按钮继续复用原公共样式。
7. 拖动期间保持外形和侧栏方向，原生移动矩形沿用 Windows 提案，不重算 Region；松开后先让可见主面板回到边界，侧栏放不下时才换侧，主面板不因换侧再跳动。独立层级块及实际 WinForms Region 同步镜像。大小与位置记忆保留。
8. 顶栏提供置顶、移动和关闭；默认实际 TopMost=true，开启时图钉为深绿底白图标，关闭恢复浅底，可真实取消。标题及移动按钮均可拖动，移动按钮支持方向键。
9. 三个功能页标题恢复原有齿轮、点选、视频图标。应用小鱼统一鱼头向左，蓝底白色简笔小鱼供 PNG、ICO、EXE 资源、主面板与视频任务栏、扩展图标及页面标志使用。状态点继续叠加在扩展图标右下方。矢量来源和构建绘图一并保留。
10. “这个文件夹是什么.md”移到 ZIP 顶层，和“摸鱼助手/”并列，软件文件夹内不再重复放这份说明。

## 验证结果

共 **{total} 项通过**，另有两个成品包校验通过。共享原生管道和单实例锁的测试顺序执行。

| 范围 | 通过项数 |
| --- | ---: |
{table}

原生窗口检查包括实际 TopMost 切换、窗口图标句柄、连续 16 帧 Windows 移动循环、左右标签与层级区域、WindowFromPoint 和独立下层窗口接收点击；并在实际 144 DPI 显示器上检查 WebView 缩放 67%、125%、150%、200%。**没有混合 DPI 多显示器环境，不把这些缩放检查说成多显示器实测。**

实际 Native Messaging、迁移、两套独立 Chromium 浏览器身份、规则自动应用、关闭与重连、备份文件写入、视频媒体解码与暂停恢复已在独立 D 盘资料下验证。浏览器管理页和资源管理器打开请求记录了正确目标；首次外部程序确认及生产注册表清理没有代用户执行。剪贴板测试仅记录目标 URL 和模拟结果，不读取或覆盖日常剪贴板；真实 Windows 剪贴板写入未代用户执行。清理测试使用专用登记/模拟计划，不是删除日常登记；MSI 仅构建、数据库和载荷只读检查，未真实安装、升级、回滚或卸载。

软件仍由原扩展内容脚本执行网页 DOM 选区和临时草稿，按标签页、文档和网址隔离；桌面显示可信快照并回传操作。资料库/library.json 仍是唯一可修改保存库。视频继续使用原桌面播放器和 B 站公开嵌入播放器，没有下载或绕过验证。

## 更新与使用

先关闭旧软件、视频和浏览器。可解压到你已确认可正常运行的 D 盘普通目录，再运行“摸鱼助手.exe”。项目目录可能继承低完整性标签；本版仍不修改隔离标签、安全策略或要求管理员权限。

使用新目录时，先把原软件的**整个“资料库”文件夹**复制到新软件目录，保留原件；需要原软件登录和位置时也保留自己的 data。不要以浏览器缓存代替完整资料库，不要同时运行新旧两份软件。已有插件想保留 ID，应把新版插件文件更新到原插件目录再重新加载；跟随软件改用新位置插件时，先配对确认资料完整，再移除旧扩展项。

第二步点击管理页链接后，软件自动进入配对等待；若浏览器没有打开管理页，可在地址栏粘贴刚复制的地址，安装好插件再到插件网页确认；浏览器可能分别询问网页权限与打开外部软件。Chrome 可能过滤外部传入的 chrome://extensions/，未进入管理页时按界面说明在地址栏输入，软件不绕过浏览器确认。已配对浏览器以后自动连接，软件关闭后不会自动重开，也无开机启动。

永久移除时，先清除注册表记录并确认成功，再从所有浏览器移除扩展，关闭全部窗口，删除整个软件文件夹。目录内资料会一起删除；旧副本、另存备份、ZIP、快捷方式及旧 MSI 安装要分别处理。Windows 和浏览器自身的历史、运行记录不保证自动清理。

## 成品核对

- 主 ZIP：65 个白名单文件，无 MSI、配置脚本、桌面源码、构建脚本、测试资料、资料库或运行缓存。
- 软件二进制 SHA-256：`{digest}`。
- ZIP SHA-256：`{hashlib.sha256(package.read_bytes()).hexdigest()}`。
- ZIP 大小：{package.stat().st_size:,} 字节。
- 执行记录：work/software-main/final-0181/run.json；所有 14 个最终检查命令退出码为 0。
- 原有四项强制权限及可选网站权限不变；未读取或修改日常浏览器资料、Excel 工作簿，未安装软件或改变系统安全设置。

## 预览

![未连接设置](摸鱼助手-未连接设置-0.18.1.png)

![三步卡片与自动配对等待](摸鱼助手-三步配对-0.18.1.png)

![靠左时标签转到右侧](摸鱼助手-靠左标签向右-0.18.1.png)

![右侧独立层级与真实窗口裁剪](摸鱼助手-右侧层级裁剪-0.18.1.png)

![居中的插件配对页](摸鱼助手-插件配对页-0.18.1.png)
'''
(root/'outputs/摸鱼助手-0.18.1-交付与验证.md').write_text(text,encoding='utf-8')
print(f'Validated {total} checks and the final package; report written. EXE SHA256 {digest}')
