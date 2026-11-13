from pathlib import Path
import json,zipfile,hashlib
root=Path(__file__).resolve().parents[2]
read=lambda name:json.loads((root/name).read_text(encoding='utf-8-sig'))
preview=read('work/software-main/preview-standalone-verification.json');access=read('work/software-main/preview-access-verification.json');size=read('work/software-main/preview-size-verification.json');isolation=read('work/page-isolation/verification.json');review=read('work/software-main/source-review-0186.json')
assert preview['version']==access['version']==review['version']=='0.18.6'
assert len(preview['checks'])==16 and not preview['errors'];assert len(access['checks'])==6 and not access['errors'];assert len(size['checks'])==5 and not size['errors'];assert len(isolation['checks'])==15 and not isolation.get('errors')
assert review['sharedButtonCSSUnchanged'] and review['permissionsUnchanged'] and review['existingSchemaNativePlayerPairingUnchanged'] and review['durableLibraryCoreUnchanged']
for name,value in review['sourceSHA256'].items():assert hashlib.sha256((root/'src'/name).read_bytes()).hexdigest()==value
record=read('work/native-video/portable-build-manifest.json');assert record['version']=='0.18.6'
package=root/'outputs/摸鱼助手-免安装版-0.18.6.zip'
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None and len(z.namelist())==65
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe'
assert size['binarySHA256']==hashlib.sha256(binary.read_bytes()).hexdigest()
text=f'''# 摸鱼助手 0.18.6：独立网页图片预览修复

交付日期：2026-11-13（香港时间）。[下载免安装版](摸鱼助手-免安装版-0.18.6.zip)。

## 修复原因与行为

0.18.5 将预览错误地限制在点选缩放面板可见且选中该标签时。在用户提供的 https://xiaoheihe.cn/app/bbs/home 实际复现：打开点选缩放能显示预览，切到设置或关闭面板后不显示；图片本身是可正常加载的 img，不是这个网站不支持。

0.18.6 改为：扩展启用、网站访问已获授权、图片预览开关勾选时即可悬停预览。无需打开软件界面，也无需打开面板或停在点选缩放。暂不具备网站授权时仍需用户完成原有授权，不绕过浏览器确认；浏览器受限页和本地文件不注入。内容脚本使用已确认的扩展设置缓存，资料库归属不变。

- 默认启用，设置复选框及导入导出沿用0.18.5，关闭开关后刷新仍保持关闭。
- 已授权但没有保存过缩放规则的网站也会自动加载预览；更新后处理当前已授权标签，浏览器后续新开页面沿用持久登记。
- 只使用原网页现有零尺寸宿主、ShadowRoot及临时popover层；预览不会唤起主面板、展示侧边标签、打开EXE窗口或新建承载网页。Esc/移开后关闭临时预览层。
- 正在选取元素/网页视频或拖动时临时避让，保留红框与选区操作；滚动、失去焦点、切换网页或撤销授权时关闭。重新授权后可恢复。
- 图片使用网页实际提供的来源。视频仍按0.18.5的来源能力处理，跨域嵌入播放器不保证悬停播放。本版未改变B站/虎牙播放适配、配对、规则识别或公共按钮样式，没有新增权限。
- 鼠标进入图片气泡后，滚轮向上放大、向下缩小预览框，图片保持比例；底下网页不滚动、浏览器缩放不变。下一张图片使用相同的框尺寸，小窗口自动限制到屏幕内。尺寸按0.5至3倍保存，关闭气泡时提交最后结果，新页面/刷新后沿用；写入失败会提示当前尺寸暂未保存，当前页仍可临时使用。
- 只新增可选canonical设置 point-resize:hover-size:v1，由原有资料库原子写入器保存，不改变原有规则/视频数据、配对或提交方式。新备份包含尺寸，旧schemaVersion 1备份缺少此项时保留当前值。

## 按影响范围验证

**本轮42个相关检查点通过，另有两项成品包校验通过。没有重复整套385项历史检查。**

| 范围 | 检查点 |
| --- | ---: |
| 真实小黑盒首页、独立预览、面板各标签、开关、滚轮缩放/不滚下层网页、下一张及刷新记忆、小窗口限制、原选区与释放 | 16 |
| 授权范围登记：无保存项的单站点、HTTP/HTTPS范围、撤销/恢复、URL不可见标签、受限页及本地文件排除 | 6 |
| 原生尺寸保存与校验、拒绝无效写入、操作幂等及新旧备份兼容 | 5 |
| 原有具体页面、SPA、查询参数、端口、层级分支及草稿隔离和旧记录兼容 | 15 |

真实页面检查使用D盘新建测试浏览器资料，在测试副本中只给予小黑盒站点权限，并将原生宿主替换为未登记的测试名称；没有启动用户日常助手或读写浏览器资料、注册表。权限刷新逻辑另用真实源码与模拟权限API检查，未代用户确认授权。失焦释放使用页面blur事件触发，不冒充实际操作系统窗口切换或真实标签可见状态验证。没有运行真实MSI安装、升级或卸载。

385是以前多套回归累积的检查点，上次较大修改采用了完整回归；它不是每次修改必须重复的数量。以后按实际影响选择验证，较大交付或跨模块改动再扩大范围，不能用检查数量代替用户给出页面的直接复现。

## 更新

关闭浏览器、主面板和视频后更新软件及插件文件，保留原来的“资料库、data、导出文件”。已有插件保持原目录和ID，重新加载原插件，不先卸载或清空数据；已打开网页可刷新以确保使用新内容脚本。预览仍需该网站的原有访问授权。

- 主包：65个白名单文件，顶层说明MD及一个“摸鱼助手”软件文件夹，不包含测试资料或运行缓存。
- ZIP SHA-256：`{hashlib.sha256(package.read_bytes()).hexdigest()}`。
- EXE SHA-256：`{hashlib.sha256(binary.read_bytes()).hexdigest()}`。
- 定向记录：work/software-main/preview-standalone-verification.json、preview-access-verification.json、preview-size-verification.json、source-review-0186.json及work/page-isolation/verification.json。

![小黑盒首页不打开主面板的图片预览](摸鱼助手-小黑盒独立图片预览-0.18.6.png)
'''
(root/'outputs/摸鱼助手-0.18.6-交付与验证.md').write_text(text,encoding='utf-8');print('Written 0.18.6 focused report: 42 related checks and 2 package verifiers')
