from pathlib import Path
import hashlib
import json
import zipfile

root=Path(__file__).resolve().parents[2]
out=root/'outputs'
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
def sha(file):return hashlib.sha256(file.read_bytes()).hexdigest()
binary=sha(out/'点选缩放免安装版/点选缩放.exe')
assert binary==sha(out/'点选缩放视频助手/PointResizeVideo.exe')
specs=[
 ('免安装、配对、红绿灯、点击与整目录移动','work/software-main/pairing-verification.json',24),
 ('首次准备、取消重试、权限拒绝与关闭等待','work/software-main/onboarding-verification.json',20),
 ('独立面板与网页操作','work/panel-desktop/verification.json',24),
 ('软件生命周期、跨浏览器与异形裁剪','work/software-main/verification.json',23),
 ('桌面视频及实际播放','work/native-video/verification.json',50),
 ('资料库迁移、并发和恢复','work/software-main/library-verification.json',18),
 ('专用测试目录清理','work/installer/cleanup-verification.json',5),
 ('原有网页回归','work/verification.json',58),
 ('旧备份兼容','work/backup/verification.json',14),
 ('页面及草稿隔离','work/page-isolation/verification.json',15),
 ('兼容 MSI 只读检查','work/installer/verification.json',41),
 ('真实 Chrome 内部页启动限制与地址导航','work/software-main/extension-manager-verification.json',3),
]
rows=[]
for title,name,count in specs:
    record=read(name)
    assert not record.get('errors'),name
    assert (record.get('passed') or len(record.get('tests',record.get('checks',record.get('report',[])))))==count,name
    if 'binarySHA256' in record:assert record['binarySHA256']==binary,name
    if record.get('run'):
        candidate=Path(record['run'])/'helper/PointResizeVideo.exe'
        if candidate.exists():assert sha(candidate)==binary,name
    rows.append(f'| {title} | {count} 通过 | [记录]({(root/name).as_posix()}) |')
run=read('work/software-main/final-0173/run.json')
assert len(run['runs'])==17 and all(item['exitCode']==0 for item in run['runs'])
assert run['binarySHA256']==binary
manifest=read('work/native-video/portable-build-manifest.json')
assert manifest['version']=='0.17.3' and len(manifest['files'])==60
package=out/'点选缩放-免安装版-0.17.3.zip'
assert sha(package)==sha(out/'点选缩放-一体包-0.17.3.zip')
with zipfile.ZipFile(package) as archive:
    assert set(archive.namelist())=={'点选缩放/'+name for name in manifest['files']}
    for name,digest in manifest['files'].items():
        assert hashlib.sha256(archive.read('点选缩放/'+name)).hexdigest()==digest
        assert sha(out/'点选缩放免安装版'/name)==digest
    assert not any(name.endswith('待修问题.md') for name in archive.namelist())
msi=out/'点选缩放视频助手-安装版-0.17.3.msi'
assert sha(msi)==read('work/installer/build-manifest.json')['msiSHA256']==read('work/installer/verification.json')['msiSHA256']
text='''# 点选缩放 0.17.3：EXE 发起配对

2026-11-12。在现有项目继续修改；修改前快照为 work/pairing-baseline-20261112-144108/。未另建项目，未修改用户已运行的 0.17.2 解压目录、资料库或日常浏览器资料。

## 下载与更新

- [推荐免安装 ZIP](点选缩放-免安装版-0.17.3.zip)
- [已解压软件文件夹](点选缩放免安装版/)
- [完整使用说明](点选缩放免安装版/使用说明.md)

ZIP 解压只有一个“点选缩放”文件夹，运行“点选缩放.exe”。60 个白名单运行及说明文件，不带 MSI、源码、登记文件、测试资料、登录缓存或资料库；内部待修记录也不打包。[一体包别名](点选缩放-一体包-0.17.3.zip) 与推荐 ZIP 字节相同。

已有 0.17.2 用户先关闭浏览器、主面板和视频，保留自己的整个“资料库”、data 和“导出文件”，覆盖更新程序、依赖、ui 和插件文件；原插件目录重新加载，尽量保留 ID。不用空文件夹替换自己的资料目录，不先卸载插件。若改用新软件目录，在首次运行前复制完整原资料库并保留原件，不能只导入备份冒充完整库身份迁移。

## 这次的操作流程

1. 打开 EXE，未连接显示红灯，点选缩放和视频待看两个标签禁用。设置突出“安装浏览器插件、配对浏览器插件”两个按钮；备份入口保留，连接维护收进展开项。
2. 安装按钮打开插件目录并请求打开 Chrome。若未进入扩展管理页，在地址栏输入 chrome://extensions/。开启开发者模式，拖入插件文件夹；拖入无效时使用“加载已解压的扩展程序”。
3. EXE 点“配对浏览器插件”，显示“已进入配对状态”，有效 10 分钟，灯仍为红色。登记在后台处理，不再单独让用户操作“重新准备连接”。准备失败则明确报错，不假装等待成功。
4. 插件刚安装自动打开配对网页；插件红灯时点击图标，也只打开/聚焦同一配对网页，不自动唤出或重连软件。
5. 网页点“配对并授权”，按浏览器实际网站访问和外部程序提示确认。通信和资料缓存同步成功后，EXE、配对网页及插件工具栏都显示绿灯，两个标签解锁。
6. 插件绿灯时点击只启动/唤出同一个桌面主面板。已配对浏览器以后仍自动连接；软件关闭后不自动弹回，没有开机启动。关闭主面板会取消尚未完成的配对等待，已有配对不会因此丢失。

![EXE 等待配对，仍为红灯](EXE进入配对状态-0.17.3.png)

![EXE 实际连接后的绿灯](EXE配对成功-0.17.3.png)

![浏览器配对成功](插件首次配对-0.17.3.png)

截图来自 D 盘独立测试资料，测试模式下外部程序启动和登记只记录目标；不能把截图当作真实首次系统提示已经确认。绿灯不代表全部网站已授权，也不代表视频已经实际播放。

## 两个问题的处理与边界

**点击绿灯插件导致断连：**原来的窗口唤出异常会结束整个通信进程。现在唤出请求有明确结果，访问被拒会报错并保留连接；通过测试专用故障注入验证了通信、绿灯和重试。实际用户日志中管道访问被拒的底层原因尚未确认，不能宣称根因已完全解决；没有修改管道安全边界、提权或解除隔离标签。记录见源码 src/待修问题.md。跨浏览器唤出仍把控制身份送到对应连接，旧网页命令不能发往新网页。

**只打开 Chrome，未进入扩展管理页：**已用本机真实 Chrome 140 的全新 D 盘测试资料验证，外部启动参数中的 chrome://extensions/ 被过滤。Chromium 的 [启动 URL 校验源码](https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/ui/startup/url_util.cc) 也仅允许特定内部设置地址。不能通过加 --new-window 就保证打开该页，也不使用降低浏览器安全边界的参数。软件明确提示在地址栏输入管理地址；测试中的直接地址导航能正常进入管理页，这不等于软件已自动打开。资源管理器原生目录拖放仍未验证，保留官方加载方式：[Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)、[Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)。

## 数据、外观与验证

唯一可修改保存库仍是“资料库/library.json”，保留规则、截图、隐藏、完整层级分支、名称、启用状态、待看和已看。迁移前不清空扩展数据，保留原始恢复快照；库身份、并发锁、操作 ID、修订号、校验和、原子提交和旧 schemaVersion 1 备份兼容均沿用。整目录移动、新插件 ID 重新配对后，库身份及全部保存字段保持。软件关闭时，内容脚本仍自动应用已确认缓存中的启用规则。

网页选区、DOM 执行及临时草稿仍按标签、文档和网址隔离，桌面仍通过可信 UI 快照及事件回传工作。无边框 Region 裁剪、连排标签、独立层级块、拖动、置顶、大小与位置记忆保留。新增按钮只复用 panel.js 的 BUTTON_CSS；窄窗口允许换行，不缩小字号挤入。

| 检查 | 结果 | 记录 |
| --- | --- | --- |
'''+ '\n'.join(rows)+'''

共 295 项检查通过，另两项包校验通过。[最终构建与顺序执行记录](../work/software-main/final-0173/run.json) 对应本报告 EXE 哈希；共享管道和锁的原生测试按顺序运行。测试过程中发现的跨浏览器控制转交回归已修复并重跑。视频 50 项包括 B 站公开嵌入播放器实际解码、进度、隐藏暂停及恢复，不以 iframe load、窗口打开或加入列表当播放成功。

异形区域在系统实际 144 DPI（150%）及 WebView 缩放 67%、125%、150%、200% 下验证，独立下层窗口实际收到空白区域点击；混合 DPI 多显示器切换未实测。原网页回归使用保留的内部 DOM 入口；日常图标入口由配对和面板专项覆盖。生命周期中的内部队列/播放器调用不是未连接时开放日常视频标签。

**普通用户首次系统登记、Chrome/Edge 外部程序确认、真实解除登记、资源管理器目录拖放，以及真实 MSI 安装/升级/回滚/卸载尚未验证。** 项目继承的低完整性标签仍可能阻止登记；专用 Native Messaging 登记驱动实际握手、资料迁移和媒体播放，登记及解除仅记录计划。未修改系统策略或隔离标签，未安装软件或读取用户已有浏览器资料、Excel 工作簿。兼容 MSI 的 41 项是只读检查；5 项清理仅删除专用测试目录中的假数据，msiexec 和注销只记录。

## SHA-256

```text
'''+f'推荐免安装 ZIP: {sha(package)}\n点选缩放.exe: {binary}\n兼容 MSI: {sha(msi)}\n'+'''```
'''
target=out/'点选缩放-0.17.3-交付与验证.md'
target.write_text(text,encoding='utf-8')
print('All final records match; wrote',target)
