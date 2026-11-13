from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[2]
out = root / 'outputs'
read = lambda name: json.loads((root / name).read_text(encoding='utf-8'))
version = read('src/manifest.json')['version']
installer = read('work/installer/verification.json')
build = read('work/installer/build-manifest.json')
native = read('work/native-video/verification.json')
regression = read('work/verification.json')
diagnostic = read('work/native-video/low-integrity-verification.json')
backup = read('work/backup/verification.json')
compat = read('work/video-web/verification.json')
player_controls = read('work/native-video/player-controls-verification.json')
cleanup = read('work/installer/cleanup-verification.json')
panel = read('work/panel-desktop/verification.json')
exe_hash = hashlib.sha256((out / '点选缩放视频助手/PointResizeVideo.exe').read_bytes()).hexdigest()
msi = Path(build['msi'])
assert installer['version'] == native['version'] == diagnostic['version'] == version
assert cleanup['version'] == version and len(cleanup['checks']) == 5
assert len(native['report']) >= 50 and not native['errors']
assert exe_hash == native['binarySHA256'] == diagnostic['binarySHA256'] == build['files']['PointResizeVideo.exe']
assert panel['version'] == version and panel['binarySHA256'] == exe_hash and panel['passed'] >= 22 and not panel['errors']
assert player_controls['version'] == version and player_controls['binarySHA256'] == exe_hash
assert player_controls['defaultControls']['progressVisible'] and player_controls['defaultControls']['danmakuSwitchVisible']
assert hashlib.sha256(msi.read_bytes()).hexdigest() == installer['msiSHA256'] == build['msiSHA256']
report = f'''# 点选缩放 {version}：安装版助手交付与验证

现有项目继续维护，扩展保留点选缩放、视频待看、设置及已有数据兼容性。一体包仍为一个可加载的扩展文件夹，内置 MSI；设置页提供安装、连接/断开、卸载助手。用户已接受首次点安装后在浏览器下载栏再点一次打开。

## 独立悬浮主面板（本轮新增）

点击一次扩展打开独立原生窗口，保留“点选缩放、视频待看、设置”。跨网站切换标签页、刷新、跳转或关闭原网页时窗口保留，自动连接当前普通网页；没有可操作网页时，待看和设置仍可用。网页持有选区、层级和草稿，桌面复用原 UI 和按钮样式；操作按标签 ID、文档 UUID 及网址校验，旧页面操作不能修改新页面。切换标签保留草稿，刷新/跳转撤销旧文档未保存调整，仅返回网页焦点不会取消选取。

主面板支持置顶、移动、缩放和本机位置记忆。面板、视频分别关闭；全部关闭后退出，断开助手关闭两者，浏览器退出关闭对应主面板。不设置开机启动或常驻服务。主面板缓存 data/panel-webview、位置 data/panel-position.json；视频仍用原目录。原网页面板位置继续随设置备份，独立桌面窗口位置由本机助手记忆。

保留四项强制权限，增加可选 `<all_urls>`，与原 HTTP/HTTPS 网站授权一并申请，以满足 Chrome 在新标签页截图的权限要求。不自动开启本地文件网址访问，实际仍只操作 HTTP/HTTPS 页面。拒绝后，未授权网站和截图需要回到该网页点工具栏授权。

桌面导出使用正常 Windows 保存文件窗口，默认在助手“导出文件”目录，卸载不删除；导入仍完整校验后合并，经原有串行存储写入。超过 1 MB 的备份经 Native Messaging 分包传输并保留中文和表情。没有助手时保留网页安装入口，助手版本不匹配时提示在设置断开后升级。

## 保留的视频功能

视频待看中的“点选网页视频加入”移到“收藏当前页视频”上方，复用公共 primary 深绿白字按钮；删除用户指定的两段常驻说明。两处列表均只在未看视频标题旁显示带无障碍名称和提示的红点，看过后红点消失，原手动切换和一键清除保留。

桌面视频窗口默认约 480×300 个逻辑像素，按实际系统 DPI 换算尺寸。左右两侧都有箭头；悬停或点击箭头展开对应侧的附属控制区，列表默认展开，不改变视频尺寸，空间不足时换侧，离开后收起。支持键盘 Enter 打开、Escape 收起。列表保留封面、标题、来源及当前播放状态，无封面或图片失败时使用占位。视频顶部为“移动、下一条、安静观看、关闭”，前者支持按住拖动及方向键；下一条直接换片，关闭只退出视频窗口，保留主面板。安静观看隐藏全部扩展浮层按钮和视频区域内鼠标，视频继续播放，移动鼠标、离开视频区域或 Escape 恢复。不全局修改 Windows 鼠标。

此前 150% 系统缩放下外窗仍只给 480 个物理像素，iframe 实际仅约 304 CSS 像素宽，实测 B 站自动隐藏原版控制条；调整为正常逻辑尺寸后，原版进度条、弹幕开关可见，并实测点击进度条后媒体时间跳转。取消此前 danmaku=0，恢复 B 站默认弹幕行为，仍使用公开嵌入版，功能范围由 B 站决定。用户手动缩小至过窄尺寸仍可能触发 B 站精简界面。安静观看期间先移动鼠标或按 Escape 恢复，才可操作原版控件。

用户最终选择只放简短 MD，不制作本地或在线说明网页。安装目录新增“这个文件夹是什么.md”和“卸载点选缩放视频助手”快捷方式。Chrome 删除扩展只清除扩展存储，仍不会自动卸载 MSI；需要通过卸载入口或 Windows 应用卸载助手。新版卸载清理助手自己的登录、缓存、位置、日志及连接登记，升级保留；浏览器本身的网站登录和其他文件不清理。没有添加常驻监控或卸载提醒网页。

视频队列增加布尔已看标记，旧记录默认未看，导入导出保留。实际解码且进度前进后自动标记，表示开始观看，不代表完整看完；加载窗口、iframe load 或失败不标记。两处均可手动切换已看/未看并一键清除已看，同步通过扩展原有串行存储写入器完成，助手没有另建收藏库。清除保留未看条目和当前播放。按播放代次及媒体 ID 隔离旧遥测，避免换片后旧帧错误标记新视频。浏览器画中画兼容路径中的跨域 B 站进度不可读时使用手动标记。

本轮取消原 400ms 等待、40 个逻辑像素外扩以及松开后 850ms 缓冲。按 25ms 计时器检查，移出实际窗口与控制区就先隐藏，再确认实际媒体暂停；两窗之间的窄缝可通过，拖动/缩放时保护，松开后按位置判断。若不能确认暂停则恢复窗口并停用自动隐藏，避免反复闪动。位置保存于助手自己的 data/window-position.json，隐藏和关闭后保留，新进程恢复原位置，并在屏幕变化时限制到可见区域。

**安装包已构建并完成只读检查；尚未在日常环境实际安装。首次安装、真实外部协议确认、首次连接、失败回滚、升级及卸载仍待用户执行验证。** 不将专用测试登记下的播放通过写成安装已通过。

## 成品与操作

- `点选缩放视频助手-安装版-{version}.msi`：助手安装包，默认 `D:\\点选缩放视频助手\\当前Windows用户名\\`，可选择其他非 C 盘目录。
- `点选缩放-{version}.zip`：扩展更新包。原位覆盖、重新加载原扩展，不卸载，以保留数据和扩展 ID。
- **推荐 `点选缩放-一体包-{version}.zip`**：解压只有“点选缩放”文件夹，29 个扩展文件加 `installer/PointResizeVideo.msi`，共 30 个文件。可加载的目录和安装包都在一起。
- `安装助手与连接说明.md`：完整使用及卸载说明。

在扩展管理页开启开发者模式，加载解压出的“点选缩放”文件夹。支持目录拖放的版本可拖至扩展管理页，不接受拖放时使用“加载已解压的扩展程序”；不保证拖至普通网页安装，目录拖放未人工实测。已有扩展应原位覆盖、重新加载并刷新网页，不卸载或额外加载第二份。

在设置点“安装助手”，扩展导出 `PointResizeVideo-当前扩展ID.msi`，用户在浏览器下载栏点一次打开。保留文件名中的 ID；浏览器自动添加的“ (1)”等重复编号受支持。MSI 从原始文件名提取并校验 ID，部署助手后登记精确白名单。扩展最多等待 15 分钟，检测到与本次扩展版本相同的助手后自动握手；待安装标记可跨网页刷新恢复，不进入跨机备份。取消、断开或卸载会清除待安装标记，不会把取消等待说成取消了 Windows 安装。

扩展只导出自带 MSI，不直接运行未登记的本地文件，不新增 downloads / downloads.open 权限，不改变当前扩展 ID。通用 MSI 手动安装时没有当前扩展 ID，安装后仍需在设置点一次连接，允许浏览器打开助手。安装或卸载中的 Windows、浏览器提示保留。

助手只为当前 Windows 用户安装，不自动安装浏览器扩展，不设置开机启动、系统服务或常驻托盘。点击播放才启动视频窗口，关闭窗口后停止媒体、鼠标检测并退出通信和播放进程。强制权限仍为 activeTab、scripting、storage、nativeMessaging；增加可选 `<all_urls>` 以支持独立面板切页后的截图。

## 安装与数据

MSI 将 22 个运行文件、指南及许可证部署到目标目录，再以当前用户身份调用已安装助手 `--install-prepare "[INSTALLSOURCE]"`。INSTALLSOURCE 在部署前捕获 OriginalDatabase；程序只接受严格格式的文件名 ID，不接受路径中的其他文字作为 ID。无 ID 时只登记协议入口。通过导出流程得到有效 ID 时同时登记 Chrome / Edge Native Messaging 精确白名单；不读取用户现有浏览器资料。

默认目录在 D 盘，执行序列拒绝 C 盘目标。WebView2 资料和缓存写安装目录 `data/webview/`，错误写 `data/last-error.txt`。运行时仍需系统已有 .NET Framework 4.6.2 或更高版本、WebView2 Runtime；包内不安装这些运行时，本机已存在。包未签名，Windows 可能显示发布者未知。

设置中的“卸载助手”先核对原生助手回报的安装能力，再断开并关闭当前视频，由助手校验 HKCU 的安装目录和编译时确定的 ProductCode 均匹配本身，才请求系统 `msiexec /x {{ProductCode}} /norestart`，保留 Windows 卸载交互。消息只表示已请求启动，不表示卸载已经完成。旧版或记录不匹配时提示使用新版安装包或 Windows 应用卸载入口。也可从 Windows“设置 → 应用”卸载。安装目录内的卸载快捷方式调用同一助手 --uninstall。MSI 在删除安装登记之前、且仅 REMOVE=ALL 和非升级时调用 --uninstall-cleanup；核对精确产品和目录，关闭面板和视频并等待各自 WebView2 浏览进程退出，清理本目录 data（含登录、缓存、位置和日志）及宿主 JSON，再解除自己的登记。递归清理前检查所有路径，拒绝链接、磁盘根目录及不匹配记录，不改 ACL 或提权；占用或权限问题报告失败，不视为已清理。扩展保存项和其他用户文件保留。升级和修复不会触发清理，卸载后无其他自存文件即可删除剩余目录。

安装失败有尝试撤销入口的回滚步骤；旧版本升级时跳过旧助手的主动断连清理。上述路径已核对数据库顺序，未实际执行升级、失败回滚或卸载。安装失败时原有入口的恢复、安装目录已有其他版本时的行为还需专门验证。

项目目录中的原始 EXE 继承低完整性标签，用户从资源管理器双击也曾登记失败。安装版是新的 Windows 部署流程，不修改这些标签或系统 ACL，不执行提权或关闭安全策略；所选目录仍受限制时应报告安装失败。

## 本轮检查

| 范围 | 通过数量 | 记录 |
|---|---:|---|
| 原有缩放与界面回归 | {len(regression['tests'])} | work/verification.json |
| 全局备份导入、导出与兼容性 | {len(backup['checks'])} | work/backup/verification.json |
| 浏览器画中画兼容路径（测试副本显式选择） | {len(compat['checks'])} | work/video-web/verification.json |
| 独立悬浮面板与跨网站跟随 | {panel['passed']} | work/panel-desktop/verification.json |
| 桌面播放与真实 MV3 接入（专用测试登记） | {len(native['report'])} | work/native-video/verification.json |
| 低完整性诊断与握手 | {len(diagnostic['checks'])} | work/native-video/low-integrity-verification.json |
| 独立目录的数据清理及拒绝危险路径 | {len(cleanup['checks'])} | work/installer/cleanup-verification.json |
| 默认 DPI 下 B 站原版控件、弹幕默认参数及实际跳转 | 通过 | work/native-video/player-controls-verification.json |
| MSI 数据库、载荷、前置条件和套装 | {len(installer['checks'])} | work/installer/verification.json |

MSI 检查包括当前用户上下文、无需提升权限的包标记、x64、默认路径实际格式化、.NET 和系统检测、C 盘判断、所有 22 个 CAB 文件的 SHA-256、安装/回滚/卸载动作顺序、无服务或 ACL 修改表、无通配删除、原始 MSI 路径的实际格式化、完成页引导及 30 文件单文件夹一体包一致性。使用只读数据库会话和 CAB 解包，没有执行安装序列，也未运行 WiX ICE 验证；不把这些检查当作端到端安装测试。

桌面验证使用专用宿主名、扩展 ID 和 D 盘独立测试资料。项目 EXE 自登记仍因低完整性失败，随后仅为互操作测试建立专用登记并在测试后解除。新增检查实际按钮导出及 MSI 逐字节摘要、带真实 ID 的文件名、重复编号与无效名解析、刷新恢复等待、按版本探测及宿主出现后自动连接、清除待安装标记和备份排除。卸载按钮在专用测试安装标记下只写入待执行命令记录，确认产品、目录不匹配均拒绝；未启动真正的 msiexec，未实际卸载任何用户软件。未登录 B 站公开播放器实际解码 640×360、进度前进；移出后媒体暂停且原生窗口隐藏，移回恢复，手动暂停保持暂停。还验证列表换片、隐藏时换片、置顶、键盘移动、最小窗口布局、关闭退出、刷新/跳转后继续播放及原网页地址和普通标签数量不变。

鼠标测试向同一计时器状态机注入屏幕坐标，实际观察 Win32 可见状态和媒体属性，没有移动用户鼠标或操作 Excel。调整大小保护测试向实际窗口发送 WM_ENTERSIZEMOVE / WM_EXITSIZEMOVE，验证处理中不隐藏、松开后按位置立即判断，并未人工拖动操作系统窗口。播放成功不以 iframe load 或窗口显示为证。已验证移出立即隐藏及实际暂停、两窗窄缝通过、关闭后新进程恢复位置、两侧箭头、默认展开列表、顶部移动键盘入口、安静观看时扩展按钮隐藏及 cursor:none、移动/Escape 恢复且视频实际进度前进；还验证真实 B 站进度自动已看、手动状态双向同步、两处清除保留未看及当前播放、失败视频保持未看。已查看更新的小窗、安静观看、已看同步及设置截图。多显示器切换、所有 DPI 比例及日常 Edge 的人工接入未覆盖；安装向导尚未进行实际窗口截图验证。

扩展包和原有便携包的字节一致性校验通过。一体包不含测试资料、浏览器缓存、宿主注册 JSON、WiX 工具或源码。三个安装管理按钮沿用已查看的公共样式，复用公共 BUTTON_CSS；卸载沿用浅底红字，其余浅绿底深绿字。MSI 包含 WebView2 和 WiX 的许可证文本；构建依赖位于 D 盘项目 work/，没有在 C 盘安装工具链。

数据清理测试只在独立 D 盘目录放入虚构 Cookies、缓存、位置文件和测试登记，实际关闭测试 WebView2 并删除这些文件；校验产品和目录不匹配、目录链接均拒绝，外部哨兵和其他文件保留。测试模式仅记录注销及 msiexec 请求，没有真实卸载用户软件或删除用户的登录资料；实际 MSI 安装、升级和完整卸载仍未执行。

MSI SHA-256：`{installer['msiSHA256']}`。

助手 EXE SHA-256：`{exe_hash}`。

独立面板已实际验证：工具栏一次点击、新网页和不同网站自动跟随、网页内元素选取与真实字号变化、草稿切换保留、截图及预览 Escape、保存及刷新重连、旧文档命令拒绝、真实收藏/点选 B 站链接、受限浏览器页仍用全局待看、直接解码本地视频、备份真实写出及超过 1 MB 的有效备份导入、关闭原页后继续使用、置顶及键盘移动、位置重开恢复、独立退出和网页 Escape 关闭。已查看独立面板调整、待看与设置截图。测试使用独立 D 盘资料、专用 Chromium Native Messaging 名称，未访问现有浏览器资料或 Excel。

## 维护

- 扩展：`python src/build.py`
- 助手：`python src/desktop/build.py`
- MSI 与一体包：`python src/desktop/build-installer.py`
- 包检查：`python work/verify-package.py`、`python work/native-video/verify-package.py`
- 安装包只读检查：`pwsh -NoProfile -File work/installer/verify.ps1`
- 回归：`node work/tests/verify.cjs`、`node work/native-video/verify.cjs`、`node work/panel-desktop/verify.cjs`

安装器源码在 `src/desktop/installer/`。WiX 3.14.1 便携工具从官方发布下载至 work/installer/，本机存档 SHA-256 为 `{build['wixArchiveSHA256']}`，后续构建按此值锁定。官方未提供独立校验和，不能把本机记录称为官方签发的摘要。

参考：[Windows Installer 当前用户安装](https://learn.microsoft.com/en-us/windows/win32/msi/installation-context)、[OriginalDatabase 原始路径](https://learn.microsoft.com/en-us/windows/win32/msi/originaldatabase)、[Native Messaging 登记](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)、[WiX per-user 包](https://docs.firegiant.com/wix/schema/wxs/packagescopetype/)、[WiX 3.14.1 发布](https://github.com/wixtoolset/wix3/releases/tag/wix3141rtm)。
'''
(out / '桌面视频助手交付与验证.md').write_text(report, encoding='utf-8')
print('Installer report generated; delivery hashes match current verification records.')
