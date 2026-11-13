from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[2]
def read(name):return json.loads((root/name).read_text(encoding='utf-8-sig'))
run=read('work/software-main/final-0182/run.json')
assert run['version']=='0.18.2' and len(run['runs'])==16 and all(r['exitCode']==0 for r in run['runs'])
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe'
digest=hashlib.sha256(binary.read_bytes()).hexdigest();assert run['binarySHA256']==digest
specs=[
 ('并发网页脚本登记','work/software-main/registration-verification.json','checks',4),
 ('首次可见窗口与后台准备','work/software-main/startup-verification.json','checks',6),
 ('三步界面、拖动、多浏览器','work/software-main/moyu-verification.json','checks',22),
 ('免安装配对与移动','work/software-main/pairing-verification.json','checks',30),
 ('配对引导、成功提醒、自动重连','work/software-main/onboarding-verification.json','checks',22),
 ('独立桌面面板','work/panel-desktop/verification.json','checks',24),
 ('软件生命周期、裁剪、缓存','work/software-main/verification.json','report',23),
 ('桌面视频','work/native-video/verification.json','report',50),
 ('资料库迁移与恢复','work/software-main/library-verification.json','checks',18),
 ('独立目录清理','work/installer/cleanup-verification.json','checks',5),
 ('原有网页调整','work/verification.json','tests',58),
 ('旧备份','work/backup/verification.json','checks',14),
 ('具体页面与临时草稿隔离','work/page-isolation/verification.json','checks',15),
 ('兼容 MSI 只读检查','work/installer/verification.json','checks',41)]
for _,name,key,count in specs:
 info=read(name);assert len(info[key])==count,(name,len(info[key]));assert not info.get('errors'),name
 if 'version' in info:assert info['version']=='0.18.2',name
 if 'binarySHA256' in info:assert info['binarySHA256']==digest,name
msi=read('work/installer/build-manifest.json');assert read('work/installer/verification.json')['msiSHA256']==msi['msiSHA256'];assert hashlib.sha256(Path(msi['msi']).read_bytes()).hexdigest()==msi['msiSHA256']
package=root/'outputs/摸鱼助手-免安装版-0.18.2.zip';record=read('work/native-video/portable-build-manifest.json')
assert record['version']=='0.18.2'
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None and len(z.namelist())==65
 assert {n.split('/')[0] for n in z.namelist()}=={'这个文件夹是什么.md','摸鱼助手'}
 assert z.read('摸鱼助手/摸鱼助手.exe')==binary.read_bytes()
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
manifest=read('src/manifest.json');assert manifest['version']=='0.18.2' and manifest['permissions']==['activeTab','scripting','storage','nativeMessaging']
total=sum(x[3] for x in specs);assert total==332
table='\n'.join(f'| {label} | {count} |' for label,_,_,count in specs)
timings=read('work/software-main/startup-verification.json')['measurements']
timing_table='\n'.join(f"| {'新建独立缓存' if r['kind']=='fresh-profile' else '已有独立缓存'} | {r['firstPaintMilliseconds']} ms | {r['elapsedMilliseconds']} ms |" for r in timings)
text=f'''# 摸鱼助手 0.18.2：交付与验证

交付日期：2026-11-13（香港时间）。推荐 [摸鱼助手-免安装版-0.18.2.zip](摸鱼助手-免安装版-0.18.2.zip)。ZIP 解压后顶层为说明 MD 和“摸鱼助手/”软件文件夹，运行里面的“摸鱼助手.exe”。

## 本次修改

1. 第一张卡片点“安装浏览器插件”只进入第二步。浏览器选项移到第二张卡片，选择谷歌浏览器或 Edge 后，自动复制对应扩展管理页地址、请求打开浏览器与插件目录，并进入第三步配对等待。没有额外的管理页链接点击，也不会因第一步重复打开目录。
2. 删除用户指出的两段长说明。成功发出打开请求后不再追加重复的长状态文字；浏览器启动或地址复制失败只显示简短错误，卡片仍保留管理页地址。浏览器管理页是否接受外部传入的内部地址仍由 Chrome / Edge 决定。
3. 主面板、视频列表与控制区、插件配对页的正文行高统一 1.6，卡片间距统一 12px。文字操作按钮继续使用 panel.js 的 BUTTON_CSS，固定行高 20px，没有另写按钮外观。
4. 手动启动 EXE 直接进入原有单实例主面板，省去再启动一遍 EXE。先绘制同一原生窗口的圆角准备界面，再异步创建运行目录和初始化 WebView2；正式界面准备好后替换准备内容。启动期间可以拖动，按 Escape 关闭；关闭不会等准备完成后再弹回来。没有另建启动器窗口或设置开机启动。
5. 插件配对网页在用户发起操作，并且实际通信、资料同步及主面板确认完成后，弹出一次“配对成功”。“知道了”和 Escape 均可关闭，重复状态更新、重新授权、打开已连接页面及自动重连不会再次弹出。网站权限未授权时，完成提醒如实说明限制；仅打开窗口或目录不算成功。
6. 顺带修复导航、窗口焦点与打开请求同时登记同一个网页脚本时的竞态，避免偶发重复 ID 后卡在连接中。相同 ID 合并同一次登记，不同网站仍分别登记，真实权限错误继续反馈并允许重试。

已有资料库、迁移快照、规则与截图、隐藏和分支、待看与已看、旧备份保持兼容。成功配对后仍留在设置页；异形窗口、默认置顶、侧栏换边、独立视频及浏览器关闭后的生命周期沿用上一版。

## 验证结果

**{total} 项通过，另有两个成品包校验通过。** 原生通信、视频和单实例相关检查均顺序执行。

| 范围 | 通过项数 |
| --- | ---: |
{table}

启动检查使用 D 盘独立资料。在创建目录前，实际 Win32 窗口已可见、存在有效圆角 Region，窗口命中测试通过；故意延迟准备 3 秒时，同一窗口始终可见并最终进入正式界面，早期关闭后无隐藏进程或重新创建的缓存。正常新缓存和已有缓存记录如下：

| 场景 | 原生首次绘制 | 正式界面区域就绪 |
| --- | ---: | ---: |
{timing_table}

这些计时从主面板对象开始创建计算，只代表本机独立测试，不包含 Windows 从双击到装入 .NET 的全部时间，也不是其他电脑或系统冷启动速度承诺。先显示的是准备界面，WebView2 正式操作区仍需要初始化。

真实 Region 检查使用独立下层窗口，验证圆角、空白、层级间隙的 WindowFromPoint 与实际接收点击；覆盖实际 144 DPI 及 WebView 67%、125%、150%、200% 缩放。测量时临时将两扇测试窗口抬到前方，测后恢复原置顶状态；置顶开关断言读取测前的实际窗口样式。下层测试窗口另用原生 IsWindowVisible 确认真正显示。没有混合 DPI 多显示器环境。启动图使用原生窗口捕获，轮廓外黑色是捕获空白，实际圆角与空白穿透另有上述命中验证。

实际 Native Messaging、迁移、两个独立浏览器身份、网页规则自动应用、备份写入及视频解码/暂停恢复均在 D 盘独立测试资料中验证。浏览器与文件夹打开、外部协议、剪贴板动作在测试模式记录正确目标；没有读取或覆盖日常剪贴板，也未代用户接受真实首次授权提示。生产连接登记清理未代用户执行，测试仅处理专用登记或模拟计划。兼容 MSI 只构建及只读校验，未真实安装、升级或卸载。

## 更新

关闭浏览器、软件主面板和视频后，覆盖程序、依赖、ui 与插件文件，**保留自己的“资料库、data、导出文件”**。已有插件在原目录更新并重新加载，保留原 ID，不先卸载或清空扩展数据。

若使用新文件夹，把原软件的整个“资料库”复制过去并保留原件；需要原登录和位置时也保留原 data。先确认配对同步和资料完整，再整理旧目录，不同时运行新旧两份软件。文件的完整性限制仍按 Windows 实际结果提示，本版没有修改隔离标签、安全策略或要求管理员权限。

## 成品核对

- 主 ZIP：65 个白名单文件，未包含 MSI、配置脚本、桌面源码、测试浏览器资料、运行缓存或用户资料库。
- 软件二进制 SHA-256：`{digest}`。
- ZIP SHA-256：`{hashlib.sha256(package.read_bytes()).hexdigest()}`。
- ZIP 大小：{package.stat().st_size:,} 字节。
- 最终执行记录：work/software-main/final-0182/run.json，16 个检查命令全部退出码为 0。
- 原有四项强制权限及可选网站权限不变；没有读取或修改日常浏览器资料或 Excel 工作簿。

## 预览

![第二步选择浏览器](摸鱼助手-选择浏览器-0.18.2.png)

![配对成功提醒](摸鱼助手-配对成功提醒-0.18.2.png)

![首次启动准备界面](摸鱼助手-启动准备-0.18.2.png)
'''
(root/'outputs/摸鱼助手-0.18.2-交付与验证.md').write_text(text,encoding='utf-8')
print(f'Validated {total} checks and the final package. EXE SHA256 {digest}')
