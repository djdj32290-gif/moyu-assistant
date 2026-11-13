from pathlib import Path
p=Path(__file__).resolve().parents[2]/'work/panel-desktop/verify.cjs'
s=p.read_text(encoding='utf-8')
old="await exitPage.keyboard.press('Escape');"
new="await reopened.locator('#point-resize-ui #tab-resize').click();await until(async()=>(await exitPage.locator('#point-resize-ui #tab-resize').getAttribute('aria-selected'))==='true');await exitPage.bringToFront();await exitPage.keyboard.press('Escape');"
assert old in s
p.write_text(s.replace(old,new),encoding='utf-8')
