from pathlib import Path
root=Path(__file__).resolve().parents[2]
for name in ['src/video-common.js','src/desktop/这个文件夹是什么.md','src/desktop/使用说明.md']:
 p=root/name;s=p.read_text(encoding='utf-8');s=s.replace('收藏当前页直播','收藏当前页视频／直播');p.write_text(s,encoding='utf-8')
p=root/'src/desktop/这个文件夹是什么.md';s=p.read_text(encoding='utf-8');s+='''

## 本版操作

- “点选网页视频加入”可连续点选多个封面或标题；加入后继续选，Esc 或原按钮退出。虎牙分区页可点选直播间卡片；别名地址须解析确认房间号，失败请打开房间页再收藏。
- “收藏当前页视频／直播”适用于 B站视频页、虎牙直播间页。链接加入卡片默认收起，支持 B站普通视频、虎牙房间和 MP4/WebM 直链；B站直播尚不支持。
- 待看列表和播放器侧栏可用“全部 / B站 / 虎牙 / 其他”筛选，仍共用同一份资料库。
- 点选缩放页打开时，网页图片悬停可放大预览，设置中的“鼠标悬停预览图片”默认勾选，可关闭。视频可显示原网页画面或静音直链预览，来源受限时只显示封面/提示，不改变原视频播放状态；移开或 Esc 关闭。跨域嵌入视频不保证悬停播放。
- 设置步骤连接成功后自动收起；展开仍可配对其他浏览器。设置区块间距已统一，小鱼图标保持向左并居中。
''';p.write_text(s,encoding='utf-8')
p=root/'src/video-page.js';s=p.read_text(encoding='utf-8').replace('包含视频的区域或 B 站链接','包含视频的区域、B站视频链接或虎牙房间链接').replace('包含 B 站链接或视频直链的区域','包含 B站视频、虎牙房间链接或视频直链的区域');p.write_text(s,encoding='utf-8')
for name in ['verify-live-data.cjs','verify-capture-data.cjs']:
 p=root/'work/software-main'/name;s=p.read_text(encoding='utf-8').replace('/收藏当前页直播/','/收藏当前页视频／直播/');p.write_text(s,encoding='utf-8')
print('Updated release instructions and matching action labels')
