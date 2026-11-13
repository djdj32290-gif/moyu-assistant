import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / 'outputs'

def read(name):
    return json.loads((root / name).read_text(encoding='utf-8-sig'))

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

binary = sha(out / '点选缩放免安装版/点选缩放.exe')
assert binary == sha(out / '点选缩放视频助手/PointResizeVideo.exe')
specs = [
    ('免安装、整目录移动、禁用标签与连接圆点', 'work/software-main/portable-verification.json', 18),
    ('首次插件准备、配对及自动重连', 'work/software-main/onboarding-verification.json', 19),
    ('软件生命周期、规则缓存与异形窗口', 'work/software-main/verification.json', 23),
    ('资料库迁移、并发、容量及恢复', 'work/software-main/library-verification.json', 18),
    ('原有网页功能', 'work/verification.json', 58),
    ('独立主面板', 'work/panel-desktop/verification.json', 24),
    ('桌面视频', 'work/native-video/verification.json', 50),
    ('旧备份兼容', 'work/backup/verification.json', 14),
    ('页面与草稿隔离', 'work/page-isolation/verification.json', 15),
    ('兼容 MSI 只读检查', 'work/installer/verification.json', 41),
    ('专用目录清理', 'work/installer/cleanup-verification.json', 5),
]
rows = []
for title, name, count in specs:
    record = read(name)
    assert not record.get('errors'), name
    actual = record.get('passed') or len(record.get('tests', record.get('checks', record.get('report', []))))
    assert actual == count, (name, actual)
    if 'binarySHA256' in record:
        assert record['binarySHA256'] == binary, name
    if 'run' in record:
        candidate = Path(record['run']) / 'helper/PointResizeVideo.exe'
        if candidate.exists():
            assert sha(candidate) == binary, name
    rows.append(f'| {title} | {count} 通过 | [原始记录]({(root / name).as_posix()}) |')

build = read('work/installer/build-manifest.json')
msi = out / '点选缩放安装包/安装点选缩放.msi'
assert sha(msi) == build['msiSHA256'] == read('work/installer/verification.json')['msiSHA256']
assert build['files']['PointResizeVideo.exe'] == binary
portable = read('work/native-video/portable-build-manifest.json')
assert portable['version'] == '0.17.2'
for name, digest in portable['files'].items():
    assert sha(out / '点选缩放免安装版' / name) == digest, name
package = out / '点选缩放-免安装版-0.17.2.zip'
assert sha(package) == sha(out / '点选缩放-一体包-0.17.2.zip')
with zipfile.ZipFile(package) as archive:
    files = [entry for entry in archive.namelist() if not entry.endswith('/')]
    assert len(files) == 60
    assert all(name.startswith('点选缩放/') for name in files)

text = '''# 点选缩放 0.17.2：免安装软件版交付与验证

2026-11-12。在现有项目继续修改，未另建项目。修改前源码和 AGENTS 快照：work/portable-baseline-20261112-134046/。沿用已有桌面助手、通信、资料库、网页 DOM 执行器及异形窗口。

## 推荐成品

- [下载免安装 ZIP](点选缩放-免安装版-0.17.2.zip)
- [已解压的软件文件夹](点选缩放免安装版/)
- [软件使用说明](点选缩放免安装版/使用说明.md)

ZIP 只有一个“点选缩放”顶层文件夹，共 60 个运行和说明文件，包含“点选缩放.exe”、运行依赖、ui、浏览器插件及 portable.json；不含 MSI、配置脚本、源码、资料库、登录缓存或测试浏览器资料。[一体包 ZIP](点选缩放-一体包-0.17.2.zip) 与推荐 ZIP 字节完全相同。已解压交付目录也没有用户运行数据。

## 第一次怎么使用

1. 完整解压到选定的可写目录，建议 D 盘。双击“点选缩放.exe”，默认打开设置。“点选缩放、视频待看”两个标签禁用。
2. 点“安装浏览器插件”，一次请求打开 Chrome 扩展管理页，并在资源管理器中选中随软件附带的“浏览器插件/点选缩放”文件夹。Edge 入口作为备用。浏览器未打开成功时可手动输入 chrome://extensions/ 或 edge://extensions/。
3. 在浏览器开启开发者模式，拖入选中的插件文件夹；拖入无效时，点“加载已解压的扩展程序”选择该文件夹。
4. 首次插件准备页点“配对并授权”，按浏览器实际提示完成网站访问及打开软件的确认。没有弹出时可点“打开软件完成配对”重试，不需要复制扩展 ID 或运行脚本。
5. 实际通信、旧资料迁移和缓存同步确认完成后，两个标签解锁。插件图标显示绿点，断开显示红点；可将插件固定到工具栏查看状态。

普通用户首次系统登记、外部程序确认及资源管理器拖入仍需要实机验证，不能把下文专用登记测试等同于这一步已经完成。系统阻止登记时软件保留设置页并显示原因；备份导入导出仍可用，不修改安全策略、隔离标记或请求提权。

![未连接时设置与禁用标签](免安装未连接设置-0.17.2.png)

截图来自独立测试模式，已展开安装指引。“已记录”表示测试仅记录外部启动与登记目标；正式运行才实际尝试相应操作。

## 日常连接与关闭

每次浏览器未连接，软件自动回到设置，另外两个标签禁用；资料保留，设置中的导入导出可用，已有独立视频不会被强关。连接并确认资料同步后恢复两个标签。这遵循用户最新选择，替代此前未连接也能在视频标签管理列表的设计。

已配对浏览器启动后自动连接；扩展图标唤出同一个软件窗口，不产生多个主窗口。关闭软件不自动弹回，不设置开机启动。浏览器运行时允许轻量 Native Messaging 通信进程继续同步资料，关闭主面板后仍可能显示绿点；绿点表示实际通信及资料同步，不能代表全部网站已授权或视频已经播放。

软件未打开时，已保存、启用、已同步且已获授权的网页规则仍由内容脚本自动应用。关闭浏览器不关闭已经打开的软件或独立视频。

连接圆点复用原图标，用 OffscreenCanvas 生成 16/32/48 像素图像，经 Chrome action.setIcon 更新，无新增权限。下面是实际提交给 API 的图像，测试确认 Chrome 接受并核对圆点像素；不是物理浏览器工具栏的截图。API 用法参照 [Chrome 官方 action 文档](https://developer.chrome.com/docs/extensions/reference/api/action)。

![连接绿点](插件连接绿点-0.17.2.png) ![断开红点](插件断开红点-0.17.2.png)

## 移动、旧版迁移与删除

移动前关闭浏览器、主面板和视频，移动整个软件文件夹，包含“资料库”、data、导出文件、插件和依赖。新位置运行 EXE，重新加载新位置插件并配对。软件修复本目录连接路径；测试中的新插件 ID 与旧位置不同，重新配对后完整库身份和资料仍相同。不要同时运行新旧目录两份软件。

从已有 MSI 版切换时，先关闭浏览器和全部软件窗口，由用户把旧目录的**整个“资料库”文件夹**复制到免安装目录，保留原件，再第一次运行免安装版。只导入 JSON 备份不能替代已有迁移实例的完整库身份迁移。旧扩展尽量保留原 ID，使用新版插件文件覆盖原目录后重新加载；若加载新目录获得新 ID，再配对。不要先删除旧扩展或清空其存储。没有软件资料库的旧扩展，会在首次配对时迁移。

![整目录移动后待看与已看标记保留](移动后待看保留-0.17.2.png)

不用时先导出备份，设置中点“解除本目录登记”，关闭浏览器和全部软件窗口，移除浏览器中的插件项，再删除文件夹。解除只处理仍指向本目录的登记，不删资料库；直接删除文件夹会一起删除其中的数据和备份，也不会自动清理系统登记。旧 MSI 版仍通过 Windows“设置 → 应用”卸载，新版不会代为卸载。

## 数据和网页边界

唯一可修改的保存库仍是“资料库/library.json”。保留全部规则、截图、隐藏、层级分支、名称、启用状态、完整待看和已看；迁移先校验并保存 migration-*.json 原始恢复快照，再提交来源标记，不先清空扩展数据。不同内容同 ID 保留冲突记录，视频去重；迁移完成的扩展仅保存已确认缓存，不能反向覆盖软件。不同库身份拒绝直接接入，失败不静默新建空库。保留 library.previous.json、操作 ID、修订号、校验和、目录锁和原子提交，兼容 schemaVersion 1 旧备份。

网页选区、DOM 调整及临时草稿仍在扩展内容脚本，按标签、文档和网址隔离。桌面通过可信 UI 快照及事件回传工作，不能据此宣称所有功能都已迁入原生软件。

原有无边框 WinForms Region 裁剪保留：圆角内容、连排标签、独立层级块和预览组成真实窗口区域，空白不占鼠标区域。拖动、置顶、关闭、大小及位置记忆保留。按钮继续唯一复用 panel.js 的 BUTTON_CSS。视频仍沿用现有播放器与 B 站公开嵌入来源，以实际解码和进度作为播放及自动已看的证据。

## 验证结果

| 检查 | 结果 | 记录 |
| --- | --- | --- |
''' + '\n'.join(rows) + '''

两项包校验通过：推荐 ZIP 白名单 60 文件与最终文件哈希相符；无 MSI、脚本、资料库、缓存或测试资料；一体包别名一致。附带插件 36 文件逐项匹配，四项强制权限及既有可选权限不变，桌面按钮 CSS 与公共来源一致。兼容 MSI 未覆盖推荐 ZIP。

免安装 18 项使用推荐 ZIP 解压后实际的中文 EXE，测试目录内关闭进程、移动整个文件夹，在新位置启动，并加载新位置插件，以实际新 ID 握手及同步；完整库身份、规则、截图、隐藏分支、禁用项、视频和已看保留，网页规则自动应用。圆点测试委托实际 Chrome API 并核对提交像素。

生命周期 23 项中的内部队列和播放器调用用于独立资料库与实际媒体回归；不代表未连接时开放日常视频标签。日常禁用和键盘不可切入由免安装专项实际 UI 覆盖。网页 58 项使用保留的 DOM 执行器内部入口，生产打开及配对入口由其他专项覆盖。

桌面视频 50 项包括 B 站公开播放器实际解码、进度、隐藏暂停和恢复。最后一次重包只更新说明文件，EXE 未重编译；MSI 最终字节由 41 项只读检查和包哈希校验覆盖。所有原生视频测试按顺序运行。测试专用登记已移除，未留下助手测试进程。

## 明确未验证的范围

- 项目文件继承的低完整性标签仍会影响首次直接登记。专用测试模式对准备、解除登记、浏览器/资源管理器及协议启动只记录目标；真实握手、迁移与媒体解码使用独立测试宿主。**普通用户首次系统登记、真实解除登记、Chrome/Edge 外部程序确认及资源管理器原生目录拖放未验证。** 没有修改隔离标签、提权或安全策略，也未访问日常浏览器资料。
- 之前的 [目录拖放探索记录](../work/software-main/folder-drop-verification.json) 中，CDP 合成拖入返回“No dragged path”，不能据此证明资源管理器拖入成功或浏览器不支持。保留官方加载目录方式：[Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)、[Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)。
- 系统实际 DPI 为 144（150%），WebView 缩放 67%、125%、150%、200% 已验证原生裁剪与独立下层窗口实际接收点击。未具备混合 DPI 多显示器环境，不能宣称已验证跨显示器 DPI 切换。
- 兼容 MSI 的 41 项只检查数据库、CAB 及配置，5 项清理使用专用目录与标记，注销和 msiexec 只记录。**未代用户执行真实 MSI 安装、升级、回滚或卸载。** 兼容产物另名“点选缩放-安装包-0.17.2.zip”，不作为本次推荐免安装流程。
- 包需要系统已有 .NET Framework 4.6.2+ 与 WebView2 Runtime，不自动安装依赖；程序未签名。免安装仍需一次当前用户浏览器连接登记，不等于没有登记痕迹。

## SHA-256

```text
''' + f'推荐免安装 ZIP: {sha(package)}\n点选缩放.exe: {binary}\n兼容 MSI: {sha(msi)}\n' + '''```
'''
target = out / '点选缩放-0.17.2-交付与验证.md'
target.write_text(text, encoding='utf-8')
print('Verified reports and wrote:', target)
