from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[2]
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
run=read('work/software-main/final-0184/run.json');assert run['version']=='0.18.4' and len(run['runs'])==18 and all(r['exitCode']==0 for r in run['runs'])
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe';digest=hashlib.sha256(binary.read_bytes()).hexdigest();assert run['binarySHA256']==digest
specs=[('直播与显示设置数据兼容','work/software-main/live-data-verification.json','checks',11),('侧栏、标题、直播、窗口往返完整流程','work/software-main/sidebar-live-verification.json','checks',24),('并发网页脚本登记','work/software-main/registration-verification.json','checks',4),('启动与后台准备','work/software-main/startup-verification.json','checks',6),('界面、拖动、多浏览器和真实裁剪','work/software-main/moyu-verification.json','checks',22),('免安装配对与移动','work/software-main/pairing-verification.json','checks',30),('配对及自动重连','work/software-main/onboarding-verification.json','checks',22),('独立桌面面板','work/panel-desktop/verification.json','checks',24),('生命周期、裁剪及缓存','work/software-main/verification.json','report',23),('桌面视频媒体回归','work/native-video/verification.json','report',50),('资料库迁移及恢复','work/software-main/library-verification.json','checks',18),('独立测试目录清理','work/installer/cleanup-verification.json','checks',5),('原有网页调整','work/verification.json','tests',58),('旧备份','work/backup/verification.json','checks',14),('具体页面及草稿隔离','work/page-isolation/verification.json','checks',15),('兼容 MSI 只读检查','work/installer/verification.json','checks',41)]
for _,file,key,count in specs:
 info=read(file);assert len(info[key])==count,(file,len(info[key]));assert not info.get('errors'),file
 if 'version' in info:assert info['version']=='0.18.4',file
 if 'binarySHA256' in info:assert info['binarySHA256']==digest,file
total=sum(row[3] for row in specs);assert total==367
manifest=read('src/manifest.json');assert manifest['version']=='0.18.4' and manifest['permissions']==['activeTab','scripting','storage','nativeMessaging']
review=read('work/software-main/source-review-0184.json');assert review['sharedButtonCSSUnchanged'] and review['permissionsUnchanged'] and review['DOMSelectionDraftsPipeSecurityMediaAgentUnchanged']
msi=read('work/installer/build-manifest.json');assert read('work/installer/verification.json')['msiSHA256']==msi['msiSHA256'];assert hashlib.sha256(Path(msi['msi']).read_bytes()).hexdigest()==msi['msiSHA256']
package=root/'outputs/摸鱼助手-免安装版-0.18.4.zip';record=read('work/native-video/portable-build-manifest.json');assert record['version']=='0.18.4'
with zipfile.ZipFile(package) as z:
 assert len(z.namelist())==65 and z.testzip() is None and {n.split('/')[0] for n in z.namelist()}=={'这个文件夹是什么.md','摸鱼助手'}
 assert z.read('摸鱼助手/摸鱼助手.exe')==binary.read_bytes()
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
side=read('work/software-main/sidebar-live-verification.json');first=next(c['details']['milliseconds'] for c in side['checks'] if c['name'].startswith('First arrow hover'))
live=next(c['details'] for c in side['checks'] if c['name'].startswith('Actual Huya media pauses'))
table='\n'.join(f'| {label} | {count} |' for label,_,_,count in specs)
text=f'''# 摸鱼助手 0.18.4：交付与验证

交付日期：2026-11-13（香港时间）。[下载免安装版](摸鱼助手-免安装版-0.18.4.zip)。解压后仍是说明 MD 和“摸鱼助手/”一个软件文件夹。

## 使用及改动

1. 在原浏览器打开虎牙直播间，软件“视频待看”中点“收藏当前页直播”，再从列表播放；也可点选实际直播播放器。保存数字房间身份，播放时使用虎牙自身的 HTTPS 嵌入播放器，不保存 blob 或签名流。页面别名通过同源标准 canonical 元信息解析，没有网站专用 DOM 选择器。粘贴数字房间网址也可识别；别名网址请用原网页收藏按钮，不猜测房间编号。
2. 用户提供的 [huya.com/lpl](https://www.huya.com/lpl) 被解析为 [660000 房间](https://www.huya.com/660000)，正式包从网页收藏、资料库写入到原生小窗播放已通过。该房间当时播放赛事内容，页面也有预告/回放信息；不把它描述成正在进行的线下赛事现场直播。
3. 虎牙播放继续使用现有桌面窗口。鼠标移出时隐藏真正的原生窗口并暂停实际媒体，移回恢复；自动隐藏不会弹出主面板，关闭视频恢复同一主面板。来源页面能匹配该房间时暂停其中原有视频，避免双重播放。登录、画质、广告、地区及平台限制由来源决定，未修改或绕过。
4. 侧栏去掉顶部视频标题、关闭/收起按钮、“收起列表”和正常播放状态行。列表保持展开，置顶、移出隐藏、清除已看和队列操作保留。错误需要时仍提示，Escape 仍可收起侧栏。
5. 主列表和侧栏都提供“标题：展开 / 收起”。默认展开多行；收起只把标题限制为一行，超出省略，保留原完整文本、原生标题提示及可键盘操作的展开入口。两处共用资料库键 point-resize:video-view:v1，由原有原子写入器保存并同步，导入导出包括该项；旧 schemaVersion 1 备份继续可导入，缺少新设置时保留当前选择。
6. 播放器网页就绪后提前准备隐藏的侧栏 WebView，内容 ready 后才显示；收起不销毁，后续复用。不先弹出未初始化的空白窗口，未用改背景色冒充加载加速。独立 Win32 可见状态已核对：准备时侧栏实际隐藏，展开后实际可见。本机这轮已预热侧栏首次悬停到显示约 {first} ms，不承诺其他机器或冷启动完全没有等待；代价是软件运行期间多保留一个本地侧栏 WebView。
7. B站预览只在具有明确包裹视频链接时关联为同一个视频，不再把这份 blob 预览显示成第二项或重复提示临时流。无关联的临时流仍跳过，旧保存项不自动删除，不扩大选区去抓邻近无关视频。

**斗鱼本次没有打通。** 尝试的开放平台入口没有加载出可解码的视频，因此没有把斗鱼标为支持，也没有改走不带自动隐藏的浏览器画中画。虎牙实际验证范围为上述房间；其他房间仍需由网站实际允许独立嵌入播放。没有下载视频、拦截/解密受保护流、复制用户 Cookie 或新增扩展权限。

## 验证

**{total} 项通过，另有两项成品包校验通过。** 原生管道及单实例检查顺序运行，18 个最终命令全部退出码为 0。

| 范围 | 通过项数 |
| --- | ---: |
{table}

正式包虎牙验证记录：媒体分辨率 {live['resume']['width']}×{live['resume']['height']}，隐藏后 paused=true，暂停时间 {live['pause']['time']:.3f}s；恢复后 paused=false，进度达到 {live['resume']['time']:.3f}s。还检查了隐藏时原生窗口不可见、自动隐藏不唤回主面板，以及关闭视频恢复原主面板 HWND。另有独立原型连续观察约 40 秒并截图核对赛事画面；原型通过不代替上述正式包检查。

长标题测试核对了实际单行溢出和完整标题文本、两处同步、旧格式备份导入、新备份往返及重开后保留。原有 B站公开嵌入播放器实际解码、移出暂停恢复、手动暂停保护、已看和队列同步也已回归。

原生裁剪继续使用独立下层窗口检查 WindowFromPoint 和接收点击，覆盖当前实际 144 DPI 与 WebView 多档缩放；测量只抬升自己的测试窗口并恢复置顶状态。视频八向大小调整使用 WebView 指针输入，核对实际原生 Bounds 变化；当前环境限制系统鼠标移动，未冒充实际系统鼠标拖动验证。没有混合 DPI 多显示器条件。

浏览器、WebView 和资料库全部使用 D 盘独立测试资料。浏览器/目录打开、剪贴板、协议登记与生产清理在测试模式记录目标；实际握手仅使用专用登记。没有读取日常浏览器资料、用户 Cookie 或 Excel 工作簿，没有代用户接受首次授权或安装提示。兼容 MSI 仅构建和只读验证，未实际安装、升级或卸载。

## 更新

关闭浏览器、主面板和视频后更新程序、依赖、ui 和插件，保留原来的 **资料库、data、导出文件**。已有插件保持原目录和 ID，更新后重新加载，不先卸载或清空扩展数据。改用新目录时先复制完整资料库并保留原件，确认配对同步和数据完整后再整理旧目录，不同时运行两份软件。

原有规则、截图、隐藏、层级分支、名称、启用状态、完整待看及已看兼容保留。网页选区与草稿仍由扩展内容脚本按标签页、文档和网址隔离；新增直播与显示设置没有改变这项架构。

## 文件核对

- 主 ZIP：65 个白名单文件，顶层 MD 加一个软件文件夹；未混入 MSI、源码、脚本、用户资料库、浏览器测试资料或运行缓存。
- 软件 SHA-256：`{digest}`。
- ZIP SHA-256：`{hashlib.sha256(package.read_bytes()).hexdigest()}`。
- ZIP 大小：{package.stat().st_size:,} 字节。
- 最终记录：work/software-main/final-0184/run.json；源码复核：work/software-main/source-review-0184.json。
- BUTTON_CSS 完全复用，原有四项强制权限和可选网站权限不变；DOM 选区/草稿、管道安全边界与媒体暂停代理源码未改。

## 预览

![精简侧栏及单行标题](摸鱼助手-精简侧栏-0.18.4.png)

![虎牙赛事房间在现有桌面播放器中播放](摸鱼助手-虎牙直播-0.18.4.png)
'''
(root/'outputs/摸鱼助手-0.18.4-交付与验证.md').write_text(text,encoding='utf-8');print(f'Written 0.18.4 report: {total} checks, 2 package verifiers, native SHA256 {digest}')
