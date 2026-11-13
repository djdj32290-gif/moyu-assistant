from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'work/software-main/verify-extension-manager.cjs'
p.write_text(p.read_text(encoding='utf-8').replace('0.17.3','0.17.4'),encoding='utf-8')
p=root/'src/待修问题.md'
with p.open('a',encoding='utf-8') as f:
    f.write('''

## PR-002：EXE 已显示等待，但协议回调拒绝配对且没有界面反馈

- 用户报告：0.17.3 已点软件配对，插件授权打开 EXE 后没有继续。
- 2026-11-12 15:23:52 的本目录日志显示 RegisterConnection 抛出“请先打开 EXE，点击配对浏览器插件”；因此实际被等待状态校验拒绝，并非已经配对成功。原等待校验吞掉跨进程 PID/启动时间查询失败；本次没有保留下该查询的底层异常，不能断言具体为何返回 false。
- 只读检查还发现：协议入口已指向 0.17.3 目录，Chrome Native Messaging 宿主仍指向已不在交付目录中的 0.17.2 路径；未代用户修改这些登记。
- 0.17.4：等待状态改为本目录原子文件与主面板心跳，不再依赖外部启动进程查询主面板启动时间。协议回调按尝试 ID 写登记结果，EXE 显示具体成功阶段或失败原因；旧版本宿主可通过现有协议重登记。端口就绪不算连接完成，新配对需资料同步与主面板确认，失败保持红灯。
- 验证新增实际 --connect 子进程成功/失败回调、实际旧 0.17.2 宿主、主面板确认失败、重试与数据保留；注册表使用专用夹具，--connect 在测试模式只写本目录计划。真实普通用户首次系统登记与浏览器提示仍须独立实测，不改变系统安全策略、隔离标签或管道安全边界。
''')
