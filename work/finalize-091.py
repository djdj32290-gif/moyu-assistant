from pathlib import Path

root = Path(__file__).resolve().parent.parent
for name in ('src/使用说明.md', 'src/安装说明.html', 'outputs/验证说明.md', 'work/verify-package.py'):
    file = root / name
    file.write_text(file.read_text(encoding='utf-8').replace('0.9.0', '0.9.1'), encoding='utf-8')

file = root / 'src/使用说明.md'
text = file.read_text(encoding='utf-8')
text = text.replace('面板采用白色底与柔和灰绿色强调色，删除操作用红色，网页选区仍显示红框。', '面板采用白色底，所有操作按钮统一浅绿底、深绿字和灰绿边，保存按钮也使用相同配色；删除仅文字保留红色，底色与其他按钮一致。选中状态通过边框和标记区分，网页选区仍显示红框。')
file.write_text(text, encoding='utf-8')

file = root / 'src/安装说明.html'
text = file.read_text(encoding='utf-8').replace('界面采用白底与柔和灰绿色，删除为红色，红色选区框保留。', '界面采用白底，按钮统一浅绿底、深绿字和灰绿边，保存与取消配色一致；删除仅文字为红色，红色选区框保留。')
file.write_text(text, encoding='utf-8')

file = root / 'outputs/验证说明.md'
text = file.read_text(encoding='utf-8')
text = text.replace('本版增加面板左侧“点选缩放 / 设置”竖向标签及选中效果，设置页留空；改用白底、柔和灰绿色和红色删除操作。调整时隐藏顶部新增按钮，把取消操作改成带边框和底色的按钮。', '本版统一所有操作按钮的底色、字色和边框：保存、取消、范围、预设、列表与图标操作均使用浅绿底、深绿字和灰绿边；删除仅字色保留红色。移除旧的实心白字、白底和透明底操作按钮规则，公共按钮外观集中在 src/panel.js 的 BUTTON_CSS。项目根目录 AGENTS.md 明确记录按钮配色约束，禁止后续逐个覆盖或重新引入混用配色。')
text = text.replace('## 本版新增验证', '''## 本版配色核对

- 常态操作按钮底色 #edf4f1、字色 #376859、边框 #cbdad1。保存与取消、范围调整使用相同配色；删除底色及边框相同，仅字色 #b44242。
- 统一 hover、按下与焦点状态；选中预设、层级、标签只加强边框和指示，不改成实心色或白字。拖动标题和图片内容仍按自身功能呈现。
- 查看实际编辑和列表截图；原有 48 项回归检查继续通过，保留小窗口、网页缩放、禁用按钮和键盘操作。

## 既有交互验证''')
file.write_text(text, encoding='utf-8')
