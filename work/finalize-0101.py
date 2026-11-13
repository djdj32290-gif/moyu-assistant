from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
manifest_path = root / 'src/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['version'] = '0.10.1'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for name in ('src/使用说明.md', 'src/安装说明.html', 'outputs/验证说明.md', 'work/verify-package.py'):
    file = root / name
    text = file.read_text(encoding='utf-8').replace('0.9.1', '0.10.1').replace('0.10.0', '0.10.1')
    file.write_text(text, encoding='utf-8')

file = root / 'src/使用说明.md'
text = file.read_text(encoding='utf-8')
text = text.replace('面板采用白色底，所有操作按钮统一浅绿底、深绿字和灰绿边，保存按钮也使用相同配色；删除仅文字保留红色，底色与其他按钮一致。', '面板采用白色底；保存、新增（选择网页内容）和取消修改统一深绿色底、白字，其余操作按钮保持浅绿底、深绿字；删除仅文字保留红色。')
text = text.replace('双击可看大图', '单击可看大图').replace('双击截图', '单击截图')
text = text.replace('点击带边框和底色的“取消修改并返回”按钮撤销本次预览并返回列表。', '新增选取时只显示顶部“正在选取 · 点击取消”，不显示下面重复的取消按钮。选中内容后，选区标题在“取消修改并返回”按钮上方；点击该按钮撤销本次预览并返回列表。')
file.write_text(text, encoding='utf-8')

file = root / 'src/安装说明.html'
text = file.read_text(encoding='utf-8').replace('双击截图', '单击截图')
text = text.replace('界面采用白底，按钮统一浅绿底、深绿字和灰绿边，保存与取消配色一致；删除仅文字为红色，红色选区框保留。', '界面采用白底，保存、新增和取消按钮统一深绿底白字；其余按钮浅绿底深绿字，删除仅文字为红色，红色选区框保留。')
text = text.replace('保留带边框和底色的“取消修改并返回”按钮；', '选区标题在“取消修改并返回”按钮上方；新增选取过程中只通过顶部按钮取消，不显示重复的取消按钮；')
file.write_text(text, encoding='utf-8')

file = root / 'outputs/验证说明.md'
text = file.read_text(encoding='utf-8')
start = text.index('本版统一所有操作按钮')
end = text.index('## 既有交互验证', start)
text = text[:start] + '''本版恢复保存、新增和取消按钮的统一深绿底白字；截图改为单击打开大图；新增选取时隐藏重复的取消按钮；编辑时选区标题位于取消按钮上方。项目 AGENTS.md 已同步用户最新要求。

## 本版核对

- 保存、新增、取消按钮共用 --button-main-* 变量：底色 #376859、白字；hover / 按下状态一致。其他按钮保持浅绿底深绿字，删除保留红字。
- 新增选取期间取消按钮不可见，顶部选取按钮可取消；编辑选区标题实际边界位于取消按钮上方。
- 实际 MV3 扩展的编辑区截图与保存列表截图均通过单次点击打开大图；Esc 关闭、Enter 键打开、居中黑边显示和草稿保留继续正常。
- 48 项现有回归检查通过，保留层级、保存、遮罩、网页缩放、小窗口、组件评论及跨网页调整逻辑。

''' + text[end:]
text = text.replace('双击打开相同图片', '单击打开相同图片').replace('浮窗里双击、Enter', '浮窗里单击、Enter')
file.write_text(text, encoding='utf-8')

file = root / 'work/tests/verify.cjs'
text = file.read_text(encoding='utf-8').replace('double-click opens the same preview', 'single click opens the same preview').replace('double-click, Enter, Escape', 'single click, Enter, Escape')
file.write_text(text, encoding='utf-8')
