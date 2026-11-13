from pathlib import Path
p=Path(__file__).with_name('write-delivery-0184.py');s=p.read_text(encoding='utf-8').replace('0.18.4','0.18.5').replace('final-0184','final-0185').replace('source-review-0184','source-review-0185').replace('sidebar-live-verification.json','capture-preview-verification.json')
s=s.replace("'checks',11)","'checks',16)").replace("'checks',24),('并发", "'checks',37),('并发").replace('total==367','total==385')
s=s.replace("review['sharedButtonCSSUnchanged'] and review['permissionsUnchanged'] and review['DOMSelectionDraftsPipeSecurityMediaAgentUnchanged']", "review['existingButtonRulesUnchanged'] and review['newButtonRulesOnlyInSharedCSS'] and review['permissionsUnchanged'] and review['DOMSelectionDraftAlgorithmsUnchanged'] and review['nativePlaybackPipeSecurityRegionMediaAgentUnchanged'] and review['durableLibraryCoreUnchanged']")
a=s.index('## 使用及改动');b=s.index('## 验证',a)
s=s[:a]+'''## 使用及改动

1. “点选网页视频加入”成功后保持选取，可继续点下一个封面或标题；重复项跳过，写入期间防止重复提交。Esc 或原按钮退出。
2. 虎牙 https://www.huya.com/g/lol 分区页已用真实可见房间封面验证；点选后解析房间号并加入。使用通用链接识别；别名只读取公开房间页面的同源 canonical 标准元信息，确认数字身份后保存，不添加网站专用 DOM 选择器。解析不成功时提示打开房间后收藏，不保存未确认别名、blob 或签名流。
3. 当前页收藏合并为“收藏当前页视频／直播”，旁边注明支持 B站视频页、虎牙直播间页。原有普通 HTTP/HTTPS 媒体识别保留。
4. “粘贴链接加入”是一张默认收起卡片，展开再输入。支持 B站普通视频、虎牙数字及可解析别名房间、MP4/WebM 直链。**B站直播没有接入，斗鱼也仍未支持。** 虎牙 lpl 粘贴后与 660000 房间去重已验证。
5. 主列表、播放器侧栏增加“全部 / B站 / 虎牙 / 其他”平台标签，显示数量和选中状态，支持方向键。它们只筛选同一份资料库，未拆分收藏；完整待看、已看、标题展开/收起和原来的队列操作保留。
6. 点选缩放可见、非正在选择内容时，鼠标在原网页图片上停留约 350ms 显示放大气泡，边缘自动换位置；透明覆盖层沿用通用媒体识别。鼠标移开、Esc、切页、切标签或关闭面板时释放。设置中的“鼠标悬停预览图片”默认勾选，取消后停止图片预览。
7. 图片预览使用网页提供的图片，清晰度取决于来源。视频元素已在播放时显示实际画面副本；已暂停且有可用 HTTP/HTTPS 直链时另外创建静音预览，移开即暂停、清空来源并释放，不改变原视频播放/暂停或进度。**B站、虎牙跨域嵌入视频不能保证悬停播放，受限时只显示封面或提示**，不把封面当作播放成功。
8. 预览设置共用 canonical 键 point-resize:hover-preview:v1 的严格布尔值，由原有原子写入器保存和同步；旧 schemaVersion 1 备份仍可导入，新备份包括开关，旧备份缺少该项时保留当前值。没有新增浏览器权限。
9. 设置①②步骤放进“浏览器连接”折叠卡片，实际连接并同步成功后自动收起，未连接时展开，仍可手动展开添加浏览器。正文行高统一1.6，不同设置区块间隔20px，避免标题紧贴上一项按钮；按钮尺寸、字体、配色仍来自 BUTTON_CSS。
10. 小鱼保持朝左，在蓝底中整体居中；同源生成扩展 PNG、EXE 内嵌 ICO、主面板及播放器任务栏图标。资料库格式、连接身份和文件夹结构不变。

''' + s[b:]
s=s.replace('长标题测试核对了实际单行溢出和完整标题文本、两处同步、旧格式备份导入、新备份往返及重开后保留。','新增检查包括连续加入与去重、退出点选、真实虎牙分区封面与粘贴别名、两处平台筛选及键盘操作、图片气泡和默认开关、取消后的浏览器缓存同步、旧备份保留开关、视频实际解码预览及原播放状态不变、预览释放、设置折叠及间距。长标题仍核对单行溢出、两处同步及备份往返。')
s=s.replace('另有独立原型连续观察约 40 秒并截图核对赛事画面；原型通过不代替上述正式包检查。','本版数字房间入口、分区收藏和粘贴别名均确认指向同一个房间后才保存。')
s=s.replace('BUTTON_CSS 完全复用，原有四项强制权限和可选网站权限不变；DOM 选区/草稿、管道安全边界与媒体暂停代理源码未改。','原有 BUTTON_CSS 规则保持不变，新增平台标签选中规则集中在同一公共样式；四项强制权限和可选网站权限不变。DOM 选区/草稿算法、管道安全边界、真实 Region、原生媒体播放/暂停和资料库原子提交核心保持不变；内容脚本仅增加悬停预览的启停调用。')
a=s.index('## 预览');b=s.index("'''",a)
s=s[:a]+'''## 预览

![平台列表和折叠输入](摸鱼助手-平台列表-0.18.5.png)

![设置折叠卡片和间距](摸鱼助手-设置折叠卡片-0.18.5.png)

![原网页图片悬停气泡](摸鱼助手-网页图片预览-0.18.5.png)

![虎牙分区点选](摸鱼助手-虎牙分区点选-0.18.5.png)

![播放器侧栏平台标签](摸鱼助手-精简侧栏-0.18.5.png)
''' + s[b:]
s=s.replace('source-review-0184.json','source-review-0185.json')
Path(__file__).with_name('write-delivery-0185.py').write_text(s,encoding='utf-8')
print('Prepared verified delivery report writer')
