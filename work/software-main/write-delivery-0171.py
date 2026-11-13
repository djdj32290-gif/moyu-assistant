import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
out=root/'outputs'
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
binary=sha(out/'点选缩放视频助手/PointResizeVideo.exe')
specs=[('软件安装插件及首次配对','work/software-main/onboarding-verification.json',19),
       ('原有网页回归','work/verification.json',58),
       ('桌面主面板','work/panel-desktop/verification.json',24),
       ('桌面视频','work/native-video/verification.json',50),
       ('软件生命周期、缓存及异形区域','work/software-main/verification.json',23),
       ('资料库迁移、并发与恢复','work/software-main/library-verification.json',18),
       ('旧备份兼容','work/backup/verification.json',14),
       ('页面与草稿隔离','work/page-isolation/verification.json',15),
       ('MSI 只读检查','work/installer/verification.json',41),
       ('独立目录清理','work/installer/cleanup-verification.json',5)]
rows=[]
for title,name,count in specs:
    d=read(name)
    assert not d.get('errors'),name
    actual=d.get('passed') or len(d.get('tests',d.get('checks',d.get('report',[]))))
    assert actual==count,(name,actual)
    if 'binarySHA256' in d:assert d['binarySHA256']==binary,name
    if 'run' in d and (Path(d['run'])/'helper/PointResizeVideo.exe').exists():
        assert sha(Path(d['run'])/'helper/PointResizeVideo.exe')==binary,name
    rows.append(f'| {title} | {count} 通过 | [原始记录]({(root/name).as_posix()}) |')
build=read('work/installer/build-manifest.json')
msi=out/'点选缩放安装包/安装点选缩放.msi'
assert sha(msi)==build['msiSHA256']==read('work/installer/verification.json')['msiSHA256']
assert build['files']['PointResizeVideo.exe']==binary
text='''# 点选缩放 0.17.1：先安装软件，再连接浏览器

2026-11-12。在原 0.17.0 项目继续修改，未另建项目；修改前源码与 AGENTS 快照为 work/software-first-baseline-20261112-111207/。软件资料库、旧数据迁移与异形窗口沿用现有实现。

## 本次交付

推荐 [点选缩放-一体包-0.17.1.zip](点选缩放-一体包-0.17.1.zip)，解压为：

```text
点选缩放/
  安装点选缩放.msi
  使用说明.md
```

也可直接打开 [已解压安装包文件夹](点选缩放安装包/)。不再要求新用户先加载扩展、再从扩展导出 MSI。

## 实际操作顺序

1. 双击“安装点选缩放.msi”，按 Windows 提示安装。新装默认 D:\\点选缩放\\当前用户名\\，可选其他非 C 盘目录；升级继续使用原目录。完成页可选择打开软件，也可双击桌面快捷方式。
2. 软件未连接时即可管理待看和设置。点击“安装浏览器插件”，选择 Chrome / Edge：打开软件安装目录“浏览器插件/点选缩放”的所在位置并选中该文件夹，尝试打开所选浏览器扩展管理页。未能打开时可手动输入 chrome://extensions/ 或 edge://extensions/。
3. 用户开启开发者模式，拖入选中的插件文件夹；若拖入无效，使用浏览器官方“加载已解压的扩展程序”并选择该文件夹。该操作必须由用户完成，软件不替用户写浏览器资料或绕过浏览器安装流程。
4. 插件首次加载后自动出现“连接点选缩放”准备页，点“配对并授权”。浏览器可能分别请求网页访问和打开外部程序确认。没有弹出或取消确认时，可点“打开软件完成配对”重试；不用复制 ID、配置文件或脚本。
5. 实际 Native Messaging 握手、旧数据迁移和缓存确认完成后显示“已连接，旧数据已同步”。回到桌面软件使用。准备页未出现时点击浏览器扩展图标进入。

以后浏览器自动连接，不重复打开准备页或弹出软件。软件手动启动；关闭软件不自动重开，无开机启动。已保存、启用且已授权的网页规则，在软件关闭时仍由内容脚本自动执行。软件、视频与浏览器独立关闭。

![软件打开插件安装引导](软件安装插件引导-0.17.1.png)

截图来自独立测试模式，其“已记录打开请求”文字仅用于测试；正式运行会调用资源管理器，并尝试打开所选浏览器。

![配对及同步完成](插件首次配对-0.17.1.png)

## 文件与旧数据

MSI 包含 24 个软件运行/说明文件及 35 个插件文件。插件固定保存在安装目录，不嵌套 MSI，没有递归打包。安装后可删除下载的 ZIP 与解压安装包文件夹；不要移动或删除已加载的插件目录。

已有插件保留原扩展 ID 和目录，不先卸载或加载第二份。升级软件后，可将固定插件目录中的新版文件覆盖至原扩展目录、重新加载并刷新网页，再配对同步。另保留 [旧插件原位更新 ZIP](点选缩放-0.17.1.zip)，它沿用旧版内置 MSI 的兼容能力，作为已有用户更新入口，推荐新装仍使用上面的软件安装包。

唯一可修改的保存库仍为“资料库/library.json”。首次迁移先保留 migration-*.json，再原子提交；保留完整规则、截图、隐藏、分支、名称、启用状态、待看和已看。兼容旧备份，失败不清空原扩展存储。扩展迁移后是确认缓存，不能把旧缓存反向覆盖软件；未保存网页草稿继续按标签、文档及网址隔离。

升级保留数据；卸载清理自己的缓存、连接和附带插件文件，保留资料库与导出文件。浏览器中的插件安装项需另行手动移除，旧独立目录的插件文件不由 MSI 删除。

## 验证

| 检查 | 结果 | 记录 |
| --- | --- | --- |
'''+'\n'.join(rows)+'''

两项包校验均通过：一体包只包含一个顶层文件夹和两份文件；MSI 与已解压安装包一致；附带插件逐文件匹配源码、无递归 MSI；旧扩展更新包与源码一致；按钮 CSS 仍来自 panel.js 的 BUTTON_CSS；没有混入缓存、浏览器资料或测试数据。四项强制权限与原有可选权限不变。

首次准备页在真实独立 Chromium 扩展环境加载；协议传递实际 ID、取消重试、实际握手、迁移、权限拒绝提示、单实例唤出、浏览器重启不再出现准备页均已检查。测试专用登记驱动实际通信，网站权限弹窗使用独立夹具预授予，外部协议/资源管理器/日常浏览器启动仅记录目标，没有操作用户已有浏览器资料。

原网页 58 项使用保留的 DOM 执行器内部入口进行回归；生产入口由软件/配对专项覆盖。视频 50 项包括公开 B 站嵌入播放器实际解码与进度、暂停隐藏和恢复，不以 iframe load 或打开窗口代替播放成功。无新增播放器承载标签页。

## 未验证范围

- **未代用户真实安装、升级、回滚或卸载 MSI，也未完成首次浏览器外部程序确认。** 41 项是 MSI 数据库、CAB、条件、快捷方式及完成页启动配置的只读检查。5 项清理只在专用目录和标记下操作，msiexec 与注销为测试记录。
- 项目文件继承的低完整性标签仍可能阻止直接 EXE 首次登记；未改隔离标记、提权或系统策略。专用测试登记不能证明真实安装后首次连接成功。
- [拖入探索记录](../work/software-main/folder-drop-verification.json)：CDP 合成目录拖入到扩展管理页后，浏览器返回“No dragged path”。自动化未能复现资源管理器的原生目录拖放，**真实 Chrome / Edge 拖入仍未验证**；不能据此宣称真实拖入已成功或不受支持。保留官方加载目录方式：[Chrome 官方步骤](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)、[Edge 官方步骤](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)。
- 异形区域仍通过原生 Region、命中测试及独立下层窗口接收鼠标消息检查。实际系统 DPI 为 144（150%），WebView 缩放 67%～200% 已测；混合 DPI 显示器之间移动未实测。

安装完成页沿用 [WiX 官方可选启动应用方式](https://docs.firegiant.com/wix3/howtos/ui_and_localization/run_program_after_install/)，由当前用户勾选，不注册开机启动或常驻服务。

## 校验值

```text
'''+f'一体包 SHA-256: {sha(out/"点选缩放-一体包-0.17.1.zip")}\nMSI SHA-256: {sha(msi)}\nPointResizeVideo.exe SHA-256: {binary}\n'+'''```
'''
(out/'点选缩放-0.17.1-交付与验证.md').write_text(text,encoding='utf-8')
legacy=out/'桌面视频助手交付与验证.md'
s=legacy.read_text(encoding='utf-8') if legacy.exists() else ''
lines=s.splitlines()
if lines and lines[0].startswith('> 当前版本为'):
    lines[0]='> 当前版本为 **0.17.1**，请查看 [0.17.1 软件优先安装与验证](点选缩放-0.17.1-交付与验证.md)。下文保留 0.16.0 历史记录，其生命周期、存储归属与交付顺序已由新版替代。'
    legacy.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('0.17.1 delivery report written; all expected results and final binary/MSI hashes match.')
