from pathlib import Path
import json
import re
root = Path(__file__).resolve().parents[2]
version = json.loads((root/'src/manifest.json').read_text(encoding='utf-8'))['version']
section = '''## 视频待看与跨应用小窗

左侧第三个播放图标是“视频待看”。视频列表全局保存在本机，与各网站的缩放设置分开；切换网页后仍能看到同一份列表。

1. 在 B 站完整视频页，点击“收藏当前 B 站视频”，会保存链接、页面标题和可用封面。也可以点击“点选网页视频加入”，再点击页面中的 B 站视频卡片或链接；不会跳转原链接，Esc 退出点选。
2. 在任意已启用扩展的普通网页，可粘贴 `https://www.bilibili.com/video/BV…` 或 `/video/av…` 完整链接加入。链接去掉跟踪参数后去重，`p=2` 等分集单独保存。列表最多 200 条。`b23.tv` 短链接须先在浏览器打开并复制完整链接。
3. **直接点击某条视频的“播放”**，立即弹出独立的置顶小窗并加载该视频，不打开播放器网页或新标签页，也不需要再点一次开启小窗。
4. 默认小窗只显示视频和简短控制条。可以拖动窗口、拉动边缘调整大小，切到 Excel 等其他应用后继续观看；在小窗里点“展开列表”可选其他视频，或点“下一条”切换。暂停、音量、进度和倍速由 B 站播放器提供。
5. 原面板里再点另一条视频的“播放”会复用已经打开的小窗；关闭小窗立即卸载视频。保留打开小窗时的原网页标签和浏览器即可，刷新、跳转或关闭这个原标签会关闭小窗；收藏列表保留，下次仍可直接点击播放。

使用 B 站公开嵌入播放器，不要求先登录。本次用新 Chromium 资料验证了未登录时从真实扩展面板点击播放，直接出现小窗，媒体进度持续前进，尺寸为 640×360。画质、试看范围、地区和登录要求由 B 站决定，不保证所有视频都能在未登录状态完整播放。网络失败、视频失效或嵌入受限时，可选择其他视频，或主动点击“原网页”查看；不会自动替你打开其他网页。

从当前视频页或视频卡片加入时尽量保留标题和封面；直接粘贴链接时先以 BV / av 编号显示。此版本不自动下载视频、不解析高清地址，也不提供离线播放或自动连播。收藏信息在本机；播放时直接访问 B 站及其媒体服务。

离线体验页支持列表界面和本地收藏，播放需要联网；体验页与真实扩展的列表分别存储。桌面版 Chrome / Edge 120 及以上为目标环境。在安全的普通网页使用；浏览器不支持画中画或页面禁止此功能时，会在原面板显示失败原因，不另开网页作为替代。

'''
p=root/'src/使用说明.md';s=p.read_text(encoding='utf-8');s=re.sub(r'^# 点选缩放 [\d.]+', '# 点选缩放 '+version,s);s=re.sub(r'## 视频待看与跨应用小窗\n.*?(?=## 面板位置)',section,s,flags=re.S);p.write_text(s,encoding='utf-8')
p=root/'src/安装说明.html';s=p.read_text(encoding='utf-8');s=re.sub(r'\d+\.\d+\.\d+ · Chrome / Edge',version+' · Chrome / Edge',s)
s=s.replace('点击“打开悬浮播放器”，在打开的承载页点击“开启跨应用小窗”。','直接点击列表中某条视频的“播放”，立即弹出小窗；不打开播放器网页，也不需要再点一次开启。')
s=s.replace('切到 Excel 或其他网页，在小窗列表里选视频。请保留承载标签页。','切到 Excel 或其他网页继续看。小窗中可以展开列表、切换下一条和关闭。保留打开小窗时的原网页标签即可。')
p.write_text(s,encoding='utf-8')
p=root/'work/verify-package.py';s=p.read_text(encoding='utf-8');s=re.sub(r"assert manifest\['version'\] == '[\d.]+'", "assert manifest['version'] == json.loads((source / 'manifest.json').read_text(encoding='utf-8'))['version']",s);s=s.replace("root / 'outputs/点选缩放-0.10.1.zip'", "root / ('outputs/点选缩放-' + manifest['version'] + '.zip')");s=s.replace('version 0.10.1','version {manifest[\"version\"]}');p.write_text(s,encoding='utf-8')
p=root/'outputs/视频待看使用与验证.md';p.write_text(f'''# 视频待看 {version}：点播放直接弹小窗

更新扩展后刷新原网页，进入左侧“视频待看”，在视频条目中点一次“播放”即可。

- 已移除播放器网页及“再点一次开启小窗”的流程，不创建额外的承载标签页。
- 小窗默认 480×370，只看视频；可展开同一份待看列表、切换下一条、关闭。再次从原面板播放会复用小窗。
- 切换到 Excel 或其他网页后，小窗继续保留。请保留打开它时的原网页标签；刷新或关闭原标签会关闭小窗。
- 收藏存储格式未变，旧列表继续使用。没有新增扩展权限，按钮继续复用公共 BUTTON_CSS。

## 验证证据

在项目内独立 Chromium、新浏览器资料和真实 MV3 扩展中，直接点击原网页面板里的“播放”，观察到原网页地址、原窗口标签页数量均不变，单独出现画中画窗口。未打开 watchroom 或其他普通网页。播放器真实解码尺寸为 640×360，6 秒以上进度持续前进，未登录。

已核对：换页面后小窗保留、原面板换视频复用同一小窗、小窗内展开列表和下一条、关闭卸载、关闭后再次一键打开、没有未捕获异常。另用限制 frame-src / style-src / script-src 的本地页面检查扩展小窗，仍加载到 B 站播放器和视频元素。

直接播放测试代码和原始记录在项目 work/video-direct/；未包含在安装包内。

未登录画质、可看范围及可用性由 B 站决定；样例成功不代表所有视频均可未登录完整观看。失败时留在原面板提示，不自动打开其他网页。
''',encoding='utf-8')
print('Updated direct-play documentation:',version)
