from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
def edit(name,old,new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,name;p.write_text(s.replace(old,new),encoding='utf-8')
# One content rhythm; operation-button line height remains 20px in BUTTON_CSS.
p=root/'src/panel.js';s=p.read_text(encoding='utf-8');a,b=s.split('  const CSS_TEXT = `',1)
b=b.replace(':host{color-scheme',':host{--content-line-height:1.6;color-scheme')
b=re.sub(r'line-height:1\.(?:4|5|55|65|7)(?!\d)', 'line-height:var(--content-line-height,1.6)', b)
p.write_text(a+'  const CSS_TEXT = `'+b,encoding='utf-8')
for name in ['src/video-page.js','src/desktop/player.css']:
 p=root/name;s=p.read_text(encoding='utf-8');s=re.sub(r'line-height:1\.(?:5|6|65|8)(?!\d)', 'line-height:var(--content-line-height,1.6)', s)
 if name.endswith('player.css'):s=s.replace(':root{',':root{--content-line-height:1.6;line-height:var(--content-line-height);',1)
 p.write_text(s,encoding='utf-8')
edit('src/desktop/panel-app.js','line-height:1.5','line-height:var(--content-line-height,1.6)')
edit('src/desktop/panel-app.js','line-height:1.6','line-height:var(--content-line-height,1.6)')
edit('src/desktop/panel-app.js','.setup-step p{margin:8px 0 0}', '.setup-step p{margin:8px 0 0}.setup-step p:empty{display:none}')
edit('src/desktop/panel-app.js','margin:10px 0;background:#f4f6f5','margin:12px 0;background:#f4f6f5')
edit('src/setup.css','font:12px/1.7','font:12px/1.6')
p=root/'src/setup.css';p.write_text(p.read_text(encoding='utf-8')+'\ndialog{max-width:min(360px,calc(100vw - 48px));box-sizing:border-box;padding:24px;border:1px solid #cbdad1;border-radius:12px;background:#fff;color:#293c38}dialog::backdrop{background:#14231e55}dialog h2{font-size:16px;line-height:1.6;margin:0 0 8px}dialog .actions{justify-content:flex-end;margin-top:16px}\n',encoding='utf-8')
for p in (root/'src').rglob('*'):
 if p.suffix in ['.md','.js','.html','.json','.cs']:
  s=p.read_text(encoding='utf-8');n=s.replace('0.18.1','0.18.2')
  if n!=s:p.write_text(n,encoding='utf-8')
edit('src/desktop/这个文件夹是什么.md','1. 第一张卡片点“安装浏览器插件”，展开后选择谷歌浏览器或 Edge。','1. 第一张卡片点“安装浏览器插件”，进入第二步。')
edit('src/desktop/这个文件夹是什么.md','2. 第二张卡片点扩展管理页链接：','2. 第二张卡片选择谷歌浏览器或 Edge：')
edit('src/desktop/这个文件夹是什么.md','复制失败会提示，可手动复制卡片里的地址。','卡片里保留可手动复制的地址。')
edit('src/desktop/这个文件夹是什么.md','实际通信和资料同步后显示绿灯，并留在设置页；','实际通信和资料同步后显示绿灯，插件网页弹出“配对成功”，软件留在设置页；')
edit('src/desktop/使用说明.md','点击“① 安装浏览器插件”只展开下方“谷歌浏览器 / Edge”；','第一步点“安装浏览器插件”进入第二步，第二步选择“谷歌浏览器 / Edge”；')
edit('src/desktop/使用说明.md','选定浏览器后才打开浏览器并选中插件文件夹，','选定浏览器后自动复制管理页地址、打开浏览器并选中插件文件夹，同时进入第三步配对等待，')
edit('src/desktop/使用说明.md','在 EXE 点“③ 配对浏览器插件”，','第三步已自动进入等待，也可在 EXE 点“配对浏览器插件”重试，')
edit('src/desktop/使用说明.md','按钮变为“③ 配对中…”','按钮变为“配对中…”')
p=root/'AGENTS.md';p.write_text(p.read_text(encoding='utf-8')+'\n- 按用户最新要求，0.18.2 的第一步“安装浏览器插件”只进入第二步；第二步选择 Chrome / Edge 后自动复制管理页地址并请求打开浏览器与插件目录，随后进入第三步配对等待，去掉重复的长说明与额外链接点击。失败只保留简短真实反馈。正文行高统一 1.6，按钮仍保持 BUTTON_CSS 的 20px。手动启动直接复用单实例主面板，先绘制真实圆角原生准备区域，再异步创建运行目录及初始化 WebView；不新增独立启动窗口。插件配对网页在用户操作后的实际连接、同步与主面板确认成功时弹出一次完成提醒，自动重连和仅打开浏览器/目录不弹成功。\n',encoding='utf-8')
