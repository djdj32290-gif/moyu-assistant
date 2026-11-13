from pathlib import Path
root=Path(__file__).resolve().parents[2]
for p in (root/'src').rglob('*'):
 if p.is_file() and p.suffix in {'.json','.cs','.md','.py','.js'}:
  s=p.read_text(encoding='utf-8-sig')
  if '0.18.5' in s:p.write_text(s.replace('0.18.5','0.18.6'),encoding='utf-8')
p=root/'src/desktop/这个文件夹是什么.md';s=p.read_text(encoding='utf-8').replace('点选缩放页打开时，网页图片悬停可放大预览','扩展启用且网站已授权时，网页图片悬停可放大预览，无需打开软件或面板');p.write_text(s,encoding='utf-8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf-8');s+='''

- 按用户 2026-11-13 最新明确要求，0.18.6 悬停图片预览在扩展启用、网站已授权且开关勾选时自动工作，与软件是否打开、主面板是否显示或当前标签无关；此条替代0.18.5的点选缩放可见限制。点选或拖动期间临时避让，切换网页、失去焦点、撤销授权时关闭；未授权网页和浏览器受限页不注入。按已授予的HTTP/HTTPS站点登记内容脚本，包括没有保存规则的站点，更新后处理现有已授权标签；不申请新权限或自动确认授权。预览沿用原页面自己的零尺寸UI宿主和同一ShadowRoot，单独管理临时popover可见状态，不能因此打开点选面板或原生软件，不新增承载页面。
- 验证按实际改动范围选择：小范围问题运行直接复现和受影响回归，共享样式仍核对相邻按钮与实际截图；数据、配对、通信改动扩大对应回归。完整历史检查用于需要整体交付验证的较大改动，不把累积检查点数量当作每次必须全跑的清单，也不能用数量代替用户给出的真实页面复现。本轮优先真实小黑盒页面、面板关闭/各标签、预览开关、已授权站点自动注入和原有页面规则隔离；不重复整套385项。
''';p.write_text(s,encoding='utf-8')
print('Prepared 0.18.6 preview lifecycle correction')
