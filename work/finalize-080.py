from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
guide = root / 'src/安装说明.html'
text = guide.read_text(encoding='utf-8').replace('0.7.0', '0.8.0')
def gray(match):
    raw = match[0][1:]
    if len(raw) == 3:
        raw = ''.join(c * 2 for c in raw)
    if len(raw) != 6:
        return match[0]
    value = round(sum(int(raw[i:i+2], 16) * weight for i, weight in zip((0,2,4), (.2126,.7152,.0722))))
    return '#' + f'{value:02x}' * 3
text = re.sub(r'#[0-9a-fA-F]{3,6}\b', gray, text)
text = text.replace('采用通用识别，没有网站专属规则。复杂遮罩和特殊布局仍可能需要切换候选范围。', '采用通用识别，没有网站专属规则。支持进入开放的多层 Shadow DOM 组件选取评论文字、图片等内容，保存后也会应用到后续加载的同类组件。封闭组件、跨域 iframe 等仍不支持。复杂遮罩和特殊布局仍可能需要切换候选范围。')
text = text.replace('点击面板的<b>选择网页内容</b>', '点击面板上方的<b>选择网页内容</b>（无记录时显示“还没有保存项，点击开始调整”）')
text = text.replace('关闭面板会撤销尚未保存的预览；', '界面改为黑白灰，红色选区框保留。没有保存项时显示静态骨架框；页面分组之间只保留一条分隔线。<br>关闭面板会撤销尚未保存的预览；')
guide.write_text(text, encoding='utf-8')

report = root / 'outputs/验证说明.md'
text = report.read_text(encoding='utf-8').replace('0.7.0', '0.8.0').replace('本版共 39 项检查通过', '本版共 45 项检查通过')
text = text.replace('本版移除调整时的保存数量按钮，名称下显示选区截图，大图加黑色边框，并在网站下按页面类型分组保存记录。保留精简界面及简短反馈。', '''本版取消页面分组外边距及重复分隔线，空列表使用静态骨架占位，把开始调整提示移入按钮，面板与图标改为黑白灰，并补充开放 Shadow DOM 的通用选取、保存和自动应用。

## 本版新增验证

- 当前网站页面组没有上下外边距，组内最后一项不显示底边，组间仅保留一条分隔线。全部网站记录复用相同分组结构。
- 没有记录时，按钮内直接显示“还没有保存项，点击开始调整”；移除按钮外说明。当前网站、全部网站的空记录区域显示无动画的灰色骨架框，不是加载状态。
- 面板文字、按钮、开关、滑杆和工具栏图标采用黑白灰，选区实线框、同类虚线框和截图范围继续保留红色。
- 真实 MV3 扩展在三层开放 Shadow DOM 组件中命中评论的文字节点，文字显示红框；默认选中两个同类评论，取消同类后只改一条。普通页面中同名样式及组件内另一行文字不受影响。
- 保存包含三层组件定位路径的记录；刷新后不开面板也会自动应用到两条评论。后续添加的同类评论、已连接到页面后才 attachShadow 的组件，也会自动恢复字号。
- 单项停用后移除内部样式及文字包裹，恢复原字号；重新启用、编辑和取消草稿保持正确的保存值。
- 层级扩大可跨过组件边界，外层组件缩放至 50%，单独复原后保留内部已保存的字号。数值框失焦时不重建层级按钮，防止首次点击复原失效。

这些检查使用本地通用组件测试页，没有添加 B 站标签名或专属选择器，未在真实 B 站登录页面上验证所有评论版本。B 站新版组件使用 Shadow DOM 的开发者记录可参考 https://github.com/the1812/Bilibili-Evolved/discussions/4804 。开放组件支持已通过上述测试；封闭 Shadow DOM 与跨域 iframe 内部仍不支持。''')
report.write_text(text, encoding='utf-8')
