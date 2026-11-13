from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(n,a,b):
 p=root/n;s=p.read_text(encoding='utf-8');assert a in s,(n,a[:70]);p.write_text(s.replace(a,b),encoding='utf-8')
edit('work/software-main/verify-moyu.cjs',"assert.equal(probe(shape).topmost,false);assert.equal", "assert.equal(probe(shape).topmost,false);await panel.mouse.move(1,1);await sleep(200);assert.equal")
edit('work/software-main/verify-moyu.cjs',"assert.equal(probe(shape).topmost,true);assert.equal", "assert.equal(probe(shape).topmost,true);await panel.mouse.move(1,1);await sleep(200);assert.equal")
p=root/'work/software-main/verify-moyu.cjs';s=p.read_text(encoding='utf-8')
for suffix in ('未连接设置','靠左标签向右','插件配对页','已连接设置','右侧层级裁剪'):
 s=s.replace('摸鱼助手-'+suffix+'.png','摸鱼助手-'+suffix+'-0.18.1.png')
s=s.replace("await ui.locator('summary').filter({hasText:'连接维护'}).click();await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-未连接设置-0.18.1.png')});", "await ui.locator('summary').filter({hasText:'连接维护'}).click();")
s=s.replace("check('Disconnected launch hides the entire backup section and shows only a red light beside the top title');", "check('Disconnected launch hides the entire backup section and shows only a red light beside the top title');await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-未连接设置-0.18.1.png')});")
s=s.replace("assert(plan.clipboardSimulated);check('Selecting a browser only", "assert(plan.clipboardSimulated);await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-三步配对-0.18.1.png')});check('Selecting a browser only")
p.write_text(s,encoding='utf-8')

# Existing introductory text now describes the exact three-card interaction.
p=root/'src/desktop/这个文件夹是什么.md';s=p.read_text(encoding='utf-8');start=s.index('1. 在软件设置');end=s.index('\n未连接时',start)
s=s[:start]+'''1. 第一张卡片点“安装浏览器插件”，展开后选择谷歌浏览器或 Edge。
2. 第二张卡片点扩展管理页链接：软件会把 chrome://extensions/ 或 edge://extensions/ 复制到剪贴板，并请求打开浏览器和插件目录。若没有进入管理页，在浏览器地址栏粘贴并回车。开启开发者模式，加载软件内“浏览器插件/摸鱼助手”。复制失败会提示，可手动复制卡片里的地址。
3. 第二步请求打开后，第三张卡片自动进入配对等待。装好插件后，在插件配对网页点“配对并授权”，按浏览器提示确认。实际通信和资料同步后显示绿灯，并留在设置页；超时可在第三步重试。同一个配对按钮可以添加其他浏览器。
'''+s[end:]
s=s.replace('靠左时侧边标签会转到右侧。','拖动时外形和标签方向不变，松开后才把主面板移回屏幕边界；侧栏放不下时再换到右侧。置顶开启时图钉为深绿底。')
p.write_text(s,encoding='utf-8')
for name in ('src/desktop/使用说明.md','src/使用说明.md','src/安装说明.html','src/setup.html'):
 p=root/name;s=p.read_text(encoding='utf-8').replace('先在 EXE 点“配对浏览器插件”，显示进入配对状态后','先在 EXE 完成三步引导，显示进入配对状态后').replace('EXE 第②步','EXE 第③步').replace('靠左时翻到右边','松开拖动后按边界决定是否翻到右边')
 p.write_text(s,encoding='utf-8')
print('Documentation and interaction test expectations updated')
