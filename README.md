# 摸鱼助手

Chrome / Edge Manifest V3 扩展与 Windows 桌面助手，当前版本 **0.18.8**。

- **点选缩放**：按具体网页保存整体缩放、文字字号、可撤销隐藏及层级分支；支持普通图片悬停预览和滚轮调整预览大小。
- **视频待看**：收藏可持久访问的视频直链、B站视频/番剧链接和虎牙房间，在独立小窗播放，支持列表、已看状态和移出隐藏。
- **设置**：浏览器配对、网站授权、JSON 导入导出。规则、截图、待看与设置由助手目录的 `资料库/library.json` 原子保存，扩展保留已确认缓存。

## 使用

在本仓库 **Releases** 下载 `摸鱼助手-免安装版-0.18.8.zip`，完整解压后运行 `摸鱼助手/摸鱼助手.exe`。依照软件设置选择 Chrome 或 Edge，手动开启扩展管理页的开发者模式，加载软件目录中的 `浏览器插件/摸鱼助手`，再完成配对与网站授权。浏览器和 Windows 的确认提示需要用户操作。

更新前关闭浏览器、主面板和视频，保留原目录的 `资料库`、`data` 和 `导出文件`，替换程序后在原位置重新加载插件。移动时一起移动完整软件文件夹与资料库，并在新位置重新加载插件和配对；不要先卸载旧扩展或清空数据。

更多说明见 [软件使用说明](src/desktop/这个文件夹是什么.md) 和 [0.18.8 交付与验证](outputs/摸鱼助手-0.18.8-交付与验证.md)。

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/` | 扩展源码、图标、构建入口 |
| `src/desktop/` | Windows 助手、可信 UI 桥接、资料库及兼容 MSI 构建 |
| `work/` | 保留的回归脚本与夹具；本地生成依赖、测试资料和缓存也在此，但不提交 |
| `outputs/` | 最新交付说明与引用图片；ZIP/MSI 仅在本地构建或 Release 分发 |
| `docs/` | 维护说明及第三方依赖许可 |

## 构建

需要 Windows x64、Python 3.10+，以及系统现有的 .NET Framework 4.x C# 编译器。运行界面需要 WebView2 Runtime；本项目不自动安装系统软件。

在项目根目录执行：

```powershell
New-Item -ItemType Directory -Force work/temp | Out-Null
$env:TEMP = $env:TMP = (Join-Path $PWD 'work/temp')
$env:PYTHONDONTWRITEBYTECODE = '1'
python src/build.py
python src/desktop/build.py
```

第一条构建扩展；第二条编译桌面助手并生成推荐免安装 ZIP。WebView2 SDK 下载至 `work/native-video/`，固定版本并校验 SHA-256。扩展与桌面按钮共用 `src/panel.js` 的 `BUTTON_CSS`。

兼容 MSI 可选：

```powershell
python src/desktop/build-installer.py
python src/build.py
python src/desktop/build.py --package-only
```

WiX 工具仅解压在 `work/installer/`，固定校验和，不安装 WiX。MSI 构建不等于真实安装、升级或卸载验证。第二次扩展构建将匹配版本的 MSI 放入旧扩展更新包，最后重新打包桌面合集以保持文件清单一致；推荐免安装 ZIP 不含 MSI。

## 按范围验证

无需浏览器的番剧身份、公开 canonical 解析及备份回归：

```powershell
node work/software-main/verify-bangumi-0188.cjs
```

构建相应交付后运行包校验：

```powershell
python work/verify-package.py
python work/native-video/verify-package.py
python work/verify-repository.py
```

前两项检查兼容包、免安装白名单、源码一致性及公共按钮样式，需要先完成上述兼容 MSI 构建。最后一项检查推荐 ZIP 与源码、发布文件和敏感数据排除规则。

浏览器/原生回归脚本仍在 `work/tests/`、`work/software-main/` 等目录。它们使用独立测试资料；部分保留了原验证机的 Playwright/Chromium 路径及历史版本断言，移机需先调整。详见 [测试与维护说明](docs/维护与验证.md)。按修改范围选用回归，不要直接批量执行历史更新脚本。

## 已知限制

- 实际网页操作限已授权的普通 HTTP/HTTPS 页面；不读取日常浏览器资料，不绕过浏览器权限或系统安全策略，不设置开机启动。
- 浏览器未连接并完成资料同步时，桌面点选与待看标签禁用；已有独立视频仍可继续运行。
- 临时 blob/srcObject 流不会作为新收藏持久保存；视频来源、验证、登录、会员和地区限制由网站决定。
- B站番剧能收藏不代表能外链播放。`ep3696892` 实测返回约 17 秒错误提示片，**影片播放未通过**；番剧目前仅手动标记已看。腾讯视频尚未正式支持，广告解码不算正片成功。
- 静态图片没有任何媒体线索时，无法保证判断其是否视频封面。
- 历史自动化采用专用测试目录/宿主；不是用户真实首次安装、登记、升级或卸载成功的证明。混合 DPI、真实系统鼠标操作等验证边界见交付说明。

## 许可

当前项目未声明开源许可证，此次整理没有新增授权。第三方组件的原始许可见 [docs/third-party](docs/third-party/README.md)。
