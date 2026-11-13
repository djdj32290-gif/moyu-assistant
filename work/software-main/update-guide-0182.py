from pathlib import Path
p=Path(__file__).resolve().parents[2]/'src/安装说明.html'
s=p.read_text(encoding='utf-8').replace('font:15px/1.8','font:15px/1.6')
s=s.replace('软件点“① 安装浏览器插件”，下方选谷歌浏览器或 Edge 后打开浏览器与插件目录；','第一步点“安装浏览器插件”，第二步选谷歌浏览器或 Edge 后，自动复制管理页地址并打开浏览器与插件目录，同时进入第三步配对等待；')
s=s.replace('EXE 点“配对浏览器插件”，显示进入配对状态后，','第三步显示进入配对状态后，')
s=s.replace('通信和同步成功后两边亮绿灯；','通信和同步成功后两边亮绿灯，网页弹出“配对成功”；')
p.write_text(s,encoding='utf-8')
