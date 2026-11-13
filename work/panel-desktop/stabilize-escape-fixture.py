from pathlib import Path
p=Path(__file__).with_name('verify.cjs');s=p.read_text(encoding='utf-8')
old="await exitPage.bringToFront();await exitPage.keyboard.press('Escape');"
new="""await exitPage.bringToFront();await until(async()=>await worker.evaluate(async()=>{const target=panelTarget;if(!target?.documentId)return false;const [row]=await chrome.scripting.executeScript({target:{tabId:target.tabId},func:()=>({id:globalThis.PointResizePanelBridge?.documentId,visible:globalThis.PointResizeApp?.state.visible,tab:globalThis.PointResizeApp?.state.tab,view:globalThis.PointResizeApp?.state.view,desktop:globalThis.PointResizeApp?.state.desktopPanel})});return row?.result?.id===target.documentId&&row.result.visible&&row.result.desktop&&row.result.tab==='resize'&&row.result.view==='current';}));await sleep(150);await exitPage.keyboard.press('Escape');"""
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
