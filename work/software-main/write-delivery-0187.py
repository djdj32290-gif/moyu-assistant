from pathlib import Path
import json
root=Path(__file__).resolve().parents[2];read=lambda name:json.loads((root/name).read_text(encoding='utf-8-sig'))
test=read('work/software-main/preview-standalone-0187-verification.json');review=read('work/software-main/source-review-0187.json');native=read('work/software-main/tencent-native-0187.json')
assert test['version']=='0.18.7' and len(test['checks'])==18 and not test['errors']
assert review['permissionsLibraryPlayerPairingUnchanged'] and review['sharedButtonCSSUnchanged']
text=f'''# 摸鱼助手 0.18.7：固定图片预览气泡

交付日期：2026-11-13。[下载免安装版](摸鱼助手-免安装版-0.18.7.zip)。

## 本轮修改

气泡出现后固定在初始位置，鼠标在原图片内移动不再带着气泡跑。从原图片到气泡之间保留几何连接通道，允许跨过间隙，进入气泡滚轮放大或缩小。通道只进行位置判断，没有新增透明DOM或鼠标遮挡层。移开图片、气泡和通道后关闭；Esc、网页滚动、原有选取互斥继续保留。

滚轮尺寸保存、换图与刷新记忆、小视口限制沿用0.18.6。没有新增权限、按钮样式、资料键或播放器流程。源码对比除版本号外只变动panel.js和用户MD说明；修改前源码保留在work/moyu-0187-baseline。

## 验证

- 用户提供的小黑盒真实页面，在D盘新建浏览器测试资料、仅授权该站点、无原生宿主登记的测试副本中通过18项相关检查，包括源图内移动不追随、逐步移入气泡、滚轮与尺寸记忆、独立预览、各标签、开关、选区和权限状态释放。
- 扩展及桌面包两项现有校验通过；65个交付白名单文件与构建清单逐一核对SHA-256，未包含运行资料或测试缓存。
- 失焦使用页面blur事件，不冒充操作系统焦点验证。没有运行真实MSI安装、升级、卸载，没有重新跑整套385项。
- ZIP SHA-256：`{review['packageSHA256']}`。

## 腾讯视频与登录：可行性结果，尚未正式接入

测试链接：https://v.qq.com/x/cover/mzc00200vyot3cs/z41002y9k0w.html 。公开嵌入入口：https://v.qq.com/txp/iframe/player.html?vid=z41002y9k0w 。

使用D盘独立浏览器资料，官方播放器广告结束后能显示正片并产生实际媒体解码与时间进展，但媒体可播时长约326秒。独立原生WebView2原型也显示“可试看05:00，去腾讯视频观看完整版”，页面节目总长为1:54:57。不能把试看当成完整播放；本版未将腾讯视频加入正式支持列表。

原生原型通过CDP在独立测试小窗注入官方iframe，不经过正式收藏/播放入口；移出恢复测试未完成：夹具未设置活动播放项导致隐藏检测未启用，等待armed超时。这不是腾讯播放器不支持暂停的结论，也不能声称移出隐藏/暂停恢复已验证。没有读写日常浏览器资料或登记；原型截图和记录在work/software-main的tencent-native独立目录。

助手使用自己的WebView2用户数据目录，不能自动继承Chrome/Edge登录。若以后接入登录，可优先使用助手内由用户完成的网站登录；目前没有该腾讯登录入口，且登录不能承诺解除官方嵌入试看限制。扩展通过cookies API读取登录Cookie需新增cookies权限及对应域名授权；现有网站访问授权不等于允许搬迁登录。复制Cookie也不能保证站点会认可新的客户端环境。本轮没有添加读取或复制Cookie的能力。

参考：[Chrome cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies)、[WebView2用户数据目录](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder)。

## 更新

关闭浏览器、主面板和视频后更新软件及插件文件，保留“资料库、data、导出文件”。重新加载原目录的插件并刷新网页，不先卸载或清空数据。
'''
(root/'outputs/摸鱼助手-0.18.7-交付与验证.md').write_text(text,encoding='utf-8');print('Written 0.18.7 delivery report; 18 preview checks; Tencent limits and unverified native scope documented')
