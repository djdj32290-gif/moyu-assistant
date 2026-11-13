import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / 'outputs'
def read(name):
    return json.loads((root / name).read_text(encoding='utf-8-sig'))
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

specs = [
    ('网页原有回归', 'work/verification.json', 'tests', 58),
    ('独立桌面面板', 'work/panel-desktop/verification.json', 'checks', 24),
    ('桌面视频', 'work/native-video/verification.json', 'report', 50),
    ('旧备份兼容', 'work/backup/verification.json', 'checks', 14),
    ('页面隔离', 'work/page-isolation/verification.json', 'checks', 15),
    ('软件主流程与异形窗口', 'work/software-main/verification.json', 'checks', 23),
    ('资料库迁移与恢复', 'work/software-main/library-verification.json', 'checks', 18),
    ('MSI 只读检查', 'work/installer/verification.json', 'checks', 38),
    ('独立目录清理', 'work/installer/cleanup-verification.json', 'checks', 5),
]
binary = sha(out / '点选缩放视频助手/PointResizeVideo.exe')
msi = out / '点选缩放视频助手-安装版-0.17.0.msi'
bundle = out / '点选缩放-一体包-0.17.0.zip'
rows = []
for title, name, field, count in specs:
    report = read(name)
    assert not report.get('errors'), name
    actual = len(report[field]) if field in report else report['passed']
    assert actual == count, (name, actual)
    if 'binarySHA256' in report:
        assert report['binarySHA256'] == binary, name
    if title in ('软件主流程与异形窗口', '资料库迁移与恢复'):
        assert sha(Path(report['run']) / 'helper/PointResizeVideo.exe') == binary
    rows.append(f'| {title} | {count} 通过 | [{name}]({(root / name).as_posix()}) |')
assert sha(msi) == read('work/installer/verification.json')['msiSHA256']
assert sha(msi) == read('work/installer/build-manifest.json')['msiSHA256']

text = '''# 点选缩放 0.17.0：交付与验证

2026-11-12，在现有 0.16.0 项目继续修改。源码沿用 src/，测试和专用浏览器资料位于 D 盘 work/，原始源码快照保存在 work/maintenance-baseline-20261112-092245/。未另建重复项目。

## 下载与升级

- [推荐：一体包](点选缩放-一体包-0.17.0.zip)：解压后只有一个可加载的“点选缩放”文件夹，36 个文件，内置 installer/PointResizeVideo.msi。
- [已解压扩展](点选缩放/) · [通用 MSI](点选缩放视频助手-安装版-0.17.0.msi) · [完整使用说明](点选缩放视频助手/使用说明.md)。

升级时先保留原扩展目录和 ID，原位覆盖、重新加载并刷新网页，**不要先卸载扩展**。点击扩展图标，在准备页安装新版助手，再到下载栏打开带当前扩展 ID 的 MSI；不要改掉导出文件名。安装后自动检测、配对和迁移；使用通用 MSI 时在准备页点一次连接。首次外部程序确认、Windows 安装提示和网站授权仍由用户完成。

MSI 按当前用户安装，默认 D 盘用户名目录，支持选其他非 C 盘目录，不自动安装依赖、不提权、不改隔离标签或系统安全策略。需要已有 .NET Framework 4.6.2+ 和 WebView2 Runtime。

## 日常行为

1. 手动双击桌面或开始菜单“点选缩放”，即可打开软件。浏览器未打开时也能管理全部保存项、待看、已看和备份。
2. 已配对浏览器打开后自动连接。扩展图标唤出同一个窗口，重复点击不产生多个主面板；扩展日常入口不再展示另一套完整操作面板。
3. 关闭软件不自动弹回，不设置开机启动。浏览器运行时可保留轻量通信进程同步规则，浏览器退出后通信退出，独立软件和视频继续保留。
4. **软件未打开，已经保存、启用并获网站授权的网页修改仍会自动执行。** 扩展持有软件确认后的规则缓存，内容脚本执行 DOM 修改。首次新浏览器需完成配对同步与授权。

软件显示浏览器未打开、未连接、已连接。主面板与视频分别关闭；断开连接阻止新的浏览器操作，不自动关闭正在独立播放的视频。多个配对实例使用同一份资料库，切换控制来源时旧连接命令不能操作新页面。

## 数据归属与恢复

助手目录 **资料库/library.json 是唯一可修改的保存库**。保留完整规则、截图、隐藏状态、层级与分支、名称、启用状态、完整待看和已看标记；扩展存储迁移后为确认缓存及配对信息，不作为第二套可独立修改的收藏库。

首次迁移按扩展实例记录来源：全量校验 → 写 migration-*.json 恢复快照 → 原子提交并登记成功。不先清空扩展数据。冲突规则保留双方，视频去重并保留已看。失败、容量超限或损坏均报错，不截断收藏、不创建空库；重连不会将迁移过的旧缓存再次反向导入。文件锁、操作 ID 和修订号防止并发静默覆盖。

旧 schemaVersion 1 备份继续导入导出，原有合并语义不变。migration-*.json 同时包含旧备份兼容字段及原始快照；library.previous.json 保留上一份完整库。需文件恢复时先关闭软件并断开浏览器连接、保留损坏文件副本，再用完整 previous 文件恢复 library.json；不要手改校验封装。测试已覆盖恢复较低修订号后替换旧缓存、删除项不复活。

真实卸载清理自己的 data、宿主文件和登记，**保留资料库与导出文件**。升级和回滚保留数据；删除扩展不会卸载软件，也不会删除软件资料库或浏览器登录。

网页 DOM、选区和临时草稿仍由内容脚本负责，按标签页、文档、网址隔离；桌面沿用可信 UI 快照和事件回传。没有把全部网页操作迁入原生软件，也没有访问用户已有浏览器资料或 Excel 工作簿。

## 异形外观

主面板改为无系统标题栏的原生窗口，使用 Win32 Region 合并圆角主面板、相连左侧标签、独立层级块及打开的图片预览。轮廓外不属于窗口区域，空白不挡下层点击。保留拖动、置顶、关闭、边缘调整大小、大小与位置记忆；DPI 和 WebView 缩放变化重新计算区域。按钮继续只取自 panel.js 的 BUTTON_CSS。

![原生窗口裁剪实测](软件异形窗口裁剪验证-0.17.0.png)

截图棋盘格来自真实的独立下层测试窗口。测试检查 GetWindowRgn/PtInRegion、WindowFromPoint，并向实际命中的测试窗口发送鼠标消息，确认空白区域能接收点击；未移动用户鼠标或点击用户应用。不是将矩形背景涂成桌面颜色。

系统实际 DPI 为 144（150%），另测 WebView 缩放 67%、125%、150%、200% 及恢复 100%，面板物理尺寸稳定、层级块间隙可穿透，最窄窗口布局可用。**未实测不同 DPI 显示器之间拖动，也未改系统 DPI 设置。**

## 验证结果

下表全部通过，桌面面板和视频共用的管道/单实例测试顺序运行。

| 检查 | 结果 | 原始记录 |
| --- | --- | --- |
''' + '\n'.join(rows) + '''

另外通过 python work/verify-package.py 与 python work/native-video/verify-package.py：源码、输出和 ZIP 一致；MSI 运行文件与构建清单匹配；按钮 CSS 复用一致；没有混入源码、测试资料、缓存或浏览器资料。强制四项权限和原有可选网站权限保持不变。

软件专项实测独立启动、关闭不重开、浏览器重启无界面自动执行规则、跨连接同步和旧命令隔离。备份专项覆盖旧截图/隐藏/分支、旧临时流、迁移重复与失败、并发、校验损坏、容量、恢复、目录链接拒绝。视频测试沿用公开 B 站嵌入播放器，以实际解码与进度前进证明播放；没有下载、绕过登录/地区限制，也没有以 iframe load 或窗口打开当作播放成功。

MSI 38 项仅为数据库、CAB 文件与安装条件的只读检查。清理 5 项只在独立测试目录和专用标记下删除假缓存，注销和 msiexec 为测试记录。Native Messaging 与媒体检查采用专用测试登记；项目继承的低完整性标签仍导致其直接首次登记受限，未修改隔离标签。**真实 MSI 首次安装、外部程序确认、首次连接、升级、回滚和卸载均未代用户执行，仍待实机验证。**

## 成品校验

```text
''' + f'一体包 SHA-256: {sha(bundle)}\nMSI SHA-256: {sha(msi)}\nPointResizeVideo.exe SHA-256: {binary}\n' + '''```
'''
(out / '点选缩放-0.17.0-交付与验证.md').write_text(text, encoding='utf-8')
legacy = out / '桌面视频助手交付与验证.md'
old = legacy.read_text(encoding='utf-8-sig')
notice = '> 当前版本为 **0.17.0**，请查看 [0.17.0 交付与验证](点选缩放-0.17.0-交付与验证.md)。下文保留 0.16.0 历史记录，其生命周期和存储归属已由新版替代。\n\n'
if not old.startswith('> 当前版本为 **0.17.0**'):
    legacy.write_text(notice + old, encoding='utf-8')
print('Delivery report written; all report counts and final binary/MSI hashes match.')
