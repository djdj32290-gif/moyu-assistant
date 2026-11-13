from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ('src/desktop/安装包说明.md','src/desktop/使用说明.md','src/安装说明.html','src/使用说明.md'):
 p=root/name;s=p.read_text(encoding='utf-8')
 s=s.replace('点选缩放 0.17.4：兼容安装版','摸鱼助手 0.18.0：兼容安装版').replace('点选缩放-免安装版-0.17.4.zip','摸鱼助手-免安装版-0.18.0.zip').replace('点选缩放.exe','摸鱼助手.exe')
 s=s.replace('以后再次运行软件会重新准备登记。','清理成功后，普通重开不会自动恢复登记；需要连接时再次点击配对。')
 s=s.replace('浏览器未连接时只开放设置与备份，另外两个标签禁用','浏览器未连接时只开放设置，导入导出在连接并同步后显示，另外两个标签禁用')
 s=s.replace('设置中的导入、导出不需要浏览器打开。','设置中的导入、导出在浏览器连接并同步后显示。')
 s=s.replace('<h2>卸载</h2><p>双击安装目录的“卸载摸鱼助手视频助手”，按 Windows 提示操作。卸载清理软件自己的缓存、登录和连接登记，保留“资料库”和“导出文件”；先确认备份，再自行删除残留资料。浏览器扩展需另行删除，软件不读取或清理现有浏览器资料。</p>', '<h2>移除软件</h2><p>先备份需要的数据，在软件点“清除注册表记录”并确认成功，再从所有浏览器移除插件，关闭浏览器和全部软件窗口，删除整个软件文件夹。文件夹内资料库、软件登录与缓存会一起删除。其他位置的备份、旧副本、ZIP 和快捷方式需自行处理；旧 MSI 版仍需从 Windows 设置单独卸载。</p>')
 p.write_text(s,encoding='utf-8')
print('Updated current portable removal/backup documentation; runtime code unchanged.')
