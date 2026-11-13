from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[2]
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
run=read('work/software-main/final-0185/run.json');assert run['version']=='0.18.5' and len(run['runs'])==18 and all(r['exitCode']==0 for r in run['runs'])
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe';digest=hashlib.sha256(binary.read_bytes()).hexdigest();assert run['binarySHA256']==digest
specs=[('直播与显示设置数据兼容','work/software-main/live-data-verification.json','checks',16),('侧栏、标题、直播、窗口往返完整流程','work/software-main/capture-preview-verification.json','checks',37),('并发网页脚本登记','work/software-main/registration-verification.json','checks',4),('启动与后台准备','work/software-main/startup-verification.json','checks',6),('界面、拖动、多浏览器和真实裁剪','work/software-main/moyu-verification.json','checks',22),('免安装配对与移动','work/software-main/pairing-verification.json','checks',30),('配对及自动重连','work/software-main/onboarding-verification.json','checks',22),('独立桌面面板','work/panel-desktop/verification.json','checks',24),('生命周期、裁剪及缓存','work/software-main/verification.json','report',23),('桌面视频媒体回归','work/native-video/verification.json','report',50),('资料库迁移及恢复','work/software-main/library-verification.json','checks',18),('独立测试目录清理','work/installer/cleanup-verification.json','checks',5),('原有网页调整','work/verification.json','tests',58),('旧备份','work/backup/verification.json','checks',14),('具体页面及草稿隔离','work/page-isolation/verification.json','checks',15),('兼容 MSI 只读检查','work/installer/verification.json','checks',41)]
for _,file,key,count in specs:
 info=read(file);assert len(info[key])==count,(file,len(info[key]));assert not info.get('errors'),file
 if 'version' in info:assert info['version']=='0.18.5',file
 if 'binarySHA256' in info:assert info['binarySHA256']==digest,file
total=sum(row[3] for row in specs);assert total==385
manifest=read('src/manifest.json');assert manifest['version']=='0.18.5' and manifest['permissions']==['activeTab','scripting','storage','nativeMessaging']
review=read('work/software-main/source-review-0185.json');assert review['existingButtonRulesUnchanged'] and review['newButtonRulesOnlyInSharedCSS'] and review['permissionsUnchanged'] and review['DOMSelectionDraftAlgorithmsUnchanged'] and review['nativePlaybackPipeSecurityRegionMediaAgentUnchanged'] and review['durableLibraryCoreUnchanged']
msi=read('work/installer/build-manifest.json');assert read('work/installer/verification.json')['msiSHA256']==msi['msiSHA256'];assert hashlib.sha256(Path(msi['msi']).read_bytes()).hexdigest()==msi['msiSHA256']
package=root/'outputs/摸鱼助手-免安装版-0.18.5.zip';record=read('work/native-video/portable-build-manifest.json');assert record['version']=='0.18.5'
with zipfile.ZipFile(package) as z:
 assert len(z.namelist())==65 and z.testzip() is None and {n.split('/')[0] for n in z.namelist()}=={'这个文件夹是什么.md','摸鱼助手'}
 assert z.read('摸鱼助手/摸鱼助手.exe')==binary.read_bytes()
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
side=read('work/software-main/capture-preview-verification.json');first=next(c['details']['milliseconds'] for c in side['checks'] if c['name'].startswith('First arrow hover'))
live=next(c['details'] for c in side['checks'] if c['name'].startswith('Actual Huya media pauses'))
table='\n'.join(f'| {label} | {count} |' for label,_,_,count in specs)
text=f'''# 摸鱼助手 0.18.5：交付与验证

交付日期：2026-11-13（香港时间）。[下载免安装版](摸鱼助手-免安装版-0.18.5.zip)。解压后仍是说明 MD 和“摸鱼助手/”一个软件文件夹。

## 使用及改动

1. “点选网页视频加入”成功后保持选取，可继续点下一个封面或标题；重复项跳过，写入期间防止重复提交。Esc 或原按钮退出。
2. 虎牙 https://www.huya.com/g/lol 分区页已用真实可见房间封面验证；点选后解析房间号并加入。使用通用链接识别；别名只读取公开房间页面的同源 canonical 标准元信息，确认数字身份后保存，不添加网站专用 DOM 选择器。解析不成功时提示打开房间后收藏，不保存未确认别名、blob 或签名流。
3. 当前页收藏合并为“收藏当前页视频／直播”，旁边注明支持 B站视频页、虎牙直播间页。原有普通 HTTP/HTTPS 媒体识别保留。
4. “粘贴链接加入”是一张默认收起卡片，展开再输入。支持 B站普通视频、虎牙数字及可解析别名房间、MP4/WebM 直链。**B站直播没有接入，斗鱼也仍未支持。** 虎牙 lpl 粘贴后与 660000 房间去重已验证。
5. 主列表、播放器侧栏增加“全部 / B站 / 虎牙 / 其他”平台标签，显示数量和选中状态，支持方向键。它们只筛选同一份资料库，未拆分收藏；完整待看、已看、标题展开/收起和原来的队列操作保留。
6. 点选缩放可见、非正在选择内容时，鼠标在原网页图片上停留约 350ms 显示放大气泡，边缘自动换位置；透明覆盖层沿用通用媒体识别。鼠标移开、Esc、切页、切标签或关闭面板时释放。设置中的“鼠标悬停预览图片”默认勾选，取消后停止图片预览。
7. 图片预览使用网页提供的图片，清晰度取决于来源。视频元素已在播放时显示实际画面副本；已暂停且有可用 HTTP/HTTPS 直链时另外创建静音预览，移开即暂停、清空来源并释放，不改变原视频播放/暂停或进度。**B站、虎牙跨域嵌入视频不能保证悬停播放，受限时只显示封面或提示**，不把封面当作播放成功。
8. 预览设置共用 canonical 键 point-resize:hover-preview:v1 的严格布尔值，由原有原子写入器保存和同步；旧 schemaVersion 1 备份仍可导入，新备份包括开关，旧备份缺少该项时保留当前值。没有新增浏览器权限。
9. 设置①②步骤放进“浏览器连接”折叠卡片，实际连接并同步成功后自动收起，未连接时展开，仍可手动展开添加浏览器。正文行高统一1.6，不同设置区块间隔20px，避免标题紧贴上一项按钮；按钮尺寸、字体、配色仍来自 BUTTON_CSS。
10. 小鱼保持朝左，在蓝底中整体居中；同源生成扩展 PNG、EXE 内嵌 ICO、主面板及播放器任务栏图标。资料库格式、连接身份和文件夹结构不变。

## 验证

**{total} 项通过，另有两项成品包校验通过。** 原生管道及单实例检查顺序运行，18 个最终命令全部退出码为 0。

| 范围 | 通过项数 |
| --- | ---: |
{table}

正式包虎牙验证记录：媒体分辨率 {live['resume']['width']}×{live['resume']['height']}，隐藏后 paused=true，暂停时间 {live['pause']['time']:.3f}s；恢复后 paused=false，进度达到 {live['resume']['time']:.3f}s。还检查了隐藏时原生窗口不可见、自动隐藏不唤回主面板，以及关闭视频恢复原主面板 HWND。本版数字房间入口、分区收藏和粘贴别名均确认指向同一个房间后才保存。

新增检查包括连续加入与去重、退出点选、真实虎牙分区封面与粘贴别名、两处平台筛选及键盘操作、图片气泡和默认开关、取消后的浏览器缓存同步、旧备份保留开关、视频实际解码预览及原播放状态不变、预览释放、设置折叠及间距。长标题仍核对单行溢出、两处同步及备份往返。原有 B站公开嵌入播放器实际解码、移出暂停恢复、手动暂停保护、已看和队列同步也已回归。

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
- 最终记录：work/software-main/final-0185/run.json；源码复核：work/software-main/source-review-0185.json。
- 原有 BUTTON_CSS 规则保持不变，新增平台标签选中规则集中在同一公共样式；四项强制权限和可选网站权限不变。DOM 选区/草稿算法、管道安全边界、真实 Region、原生媒体播放/暂停和资料库原子提交核心保持不变；内容脚本仅增加悬停预览的启停调用。

## 预览

![平台列表和折叠输入](摸鱼助手-平台列表-0.18.5.png)

![设置折叠卡片和间距](摸鱼助手-设置折叠卡片-0.18.5.png)

![原网页图片悬停气泡](摸鱼助手-网页图片预览-0.18.5.png)

![虎牙分区点选](摸鱼助手-虎牙分区点选-0.18.5.png)

![播放器侧栏平台标签](摸鱼助手-精简侧栏-0.18.5.png)
'''
(root/'outputs/摸鱼助手-0.18.5-交付与验证.md').write_text(text,encoding='utf-8');print(f'Written 0.18.5 report: {total} checks, 2 package verifiers, native SHA256 {digest}')
