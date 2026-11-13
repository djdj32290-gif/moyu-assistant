from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
file = root / 'src/manifest.json'
manifest = json.loads(file.read_text(encoding='utf-8')); manifest['version'] = '0.12.1'
file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for name in ('src/使用说明.md', 'src/安装说明.html', 'outputs/验证说明.md'):
    file = root / name
    file.write_text(file.read_text(encoding='utf-8').replace('0.12.0', '0.12.1'), encoding='utf-8')

file = root / 'src/使用说明.md'
text = file.read_text(encoding='utf-8')
text = text.replace('左侧每行现在有“层级、子元素编号、复原”：', '左侧表头“层级”“子元素”分别与下面的数字列居中对齐，不加中间的点；每行有“层级、子元素编号、复原”：')
text = text.replace('开始同层切换后，该层及内层改为分别定位，并取消“同类内容一起调整”，避免同一个类名把几个兄弟一起改掉。未使用同层切换时，同类选项依旧默认勾选。需要时仍可手动重新勾选同类，但它会再次影响全部匹配项。', '上一个 / 下一个不会自动取消“同类内容一起调整”。新候选继承当前层的同类状态，已访问候选保留其状态。勾选时，同一个选择器匹配到的元素会一起调整，返回这些分支时显示一致的数值；想分别调整兄弟元素时，主动取消同类勾选即可。')
text = text.replace('同一层多个兄弟可以分别改动，最后一次保存会保存所有已访问分支。', '取消同类勾选后，同一层多个兄弟可以分别改动，最后一次保存会保存所有已访问分支。')
text = text.replace('点击列表下方“全部网站记录”', '保存列表的数值摘要仅显示实际改动的层，未改动的层不占列表空间；多层都有改动时只显示这些层，完全没有改动时显示“原始大小”。内部仍保留探索过的层及分支供重新编辑，自动名称和截图优先取改动内容。\n\n点击列表下方“全部网站记录”')
text = text.replace('设置页暂时留空，不加入占位说明或设置选项。', '切换标签时，右侧顶栏的名称、图标和主体一起切换；只有点选缩放显示网站副标题。设置页暂时留空，不加入占位说明或设置选项。')
file.write_text(text, encoding='utf-8')

file = root / 'src/安装说明.html'
text = file.read_text(encoding='utf-8')
text = text.replace('每行左列是层级，右列是子元素编号；', '表头“层级”“子元素”分别对齐数字列；每行左列是层级，右列是子元素编号；')
text = text.replace('各分支分别暂存，点击保存一起保留。', '切换不会自动取消同类勾选，需要分别调整时手动取消；各分支暂存，点击保存一起保留，列表只显示改动过的层。')
text = text.replace('选中时高亮；设置页先留空。', '选中时高亮，右侧顶栏标题与图标也跟着切换；设置页先留空。')
file.write_text(text, encoding='utf-8')

file = root / 'outputs/验证说明.md'
text = file.read_text(encoding='utf-8').replace('本版共 55 项', '本版共 58 项').replace('总计 55 项', '总计 58 项')
text = text.replace('本版增加左侧“层级 / 子元素”两列编号与上一个 / 下一个同层切换。分支参数独立暂存并统一保存，父区域切换后跟随新的子元素路径；保留既有按钮配色、单击截图与标题位置。', '本版对齐两列表头并去掉中间的点，保留同层切换时的同类勾选，只在保存列表展示改动层，并同步切换右侧顶栏标题、图标和主体。项目 AGENTS.md 已更新相应约束。')
text = text.replace('## 本版新增的 7 项检查', '''## 本版核对

- 表头无中间点，两个文字格的实际水平中心分别与对应数字按钮中心重合。
- 同层 Next 保留同类勾选；共享选择器的元素一起调，来回切换显示一致的数值。用户手动取消后可分别调整，后续切换保留这个选择。
- 保存了 1 层原始大小、2 层 50% 的记录，列表只显示“第2层 50%”；原始层仍能进入编辑。多层改动按改动层显示，无改动只显示原始大小。
- 设置 / 视频待看 / 点选缩放三个标签均同步顶栏标题和图标，设置与视频页隐藏网站副标题，返回点选缩放恢复网站。设置主体仍为空。

本版总计 58 项检查通过。

## 兄弟元素交互检查''')
text = text.replace('同类勾选同步取消以独立定位', '同类勾选保持；需要分别调节时由用户手动取消')
text = text.replace('已有 48 项交互检查继续通过；本版总计 58 项。', '原有交互及三项本版专项检查共 58 项通过。')
file.write_text(text, encoding='utf-8')
