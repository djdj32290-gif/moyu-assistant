from pathlib import Path
p=Path(__file__).with_name('verify-preview-standalone.cjs')
s=p.read_text(encoding='utf-8').replace('0.18.6','0.18.7').replace('preview-standalone-verification.json','preview-standalone-0187-verification.json')
needle=" const beforeWheel="
checks=""" const fixed=await bubble.boundingBox(),sourceRect=await image.boundingBox();const start={x:sourceRect.x+sourceRect.width/2,y:sourceRect.y+sourceRect.height/2};
 await page.mouse.move(start.x+Math.min(12,sourceRect.width/4),start.y,{steps:8});const still=await bubble.boundingBox();assert(still&&Math.abs(still.x-fixed.x)<1&&Math.abs(still.y-fixed.y)<1);check('A visible preview remains fixed when the pointer moves within the original image');
 const destination={x:fixed.x+fixed.width/2,y:fixed.y+fixed.height/2};await page.mouse.move(destination.x,destination.y,{steps:35});assert(await bubble.isVisible());const arrived=await bubble.boundingBox();assert(Math.abs(arrived.x-fixed.x)<1&&Math.abs(arrived.y-fixed.y)<1);check('The pointer reaches the fixed preview gradually without chasing it or losing it across the gap');
"""
assert needle in s;s=s.replace(needle,checks+needle,1)
p.with_name('verify-preview-0187.cjs').write_text(s,encoding='utf-8')
