from pathlib import Path
p=Path(__file__).with_name('verify-cycle.cjs');s=p.read_text(encoding='utf-8')
old=next(line for line in s.splitlines() if line.startswith(' const edgeProbe='))
new=''' const gripHits=await player.evaluate(()=>{const w=innerWidth,h=innerHeight;return [[1,h/2],[w-2,h/2],[w/2,1],[w/2,h-2],[1,1],[w-2,1],[1,h-2],[w-2,h-2]].map(([x,y])=>Number(document.elementFromPoint(x,y)?.dataset.resize));});assert.deepEqual(gripHits,[10,11,12,15,13,14,16,17]);
 const edges=[];for(const edge of [10,11,12,15,13,14,16,17]){
  const before=read('window.json'),box=await player.locator('[data-resize="'+edge+'"]').boundingBox(),ratio=await player.evaluate(()=>devicePixelRatio),left=[10,13,16].includes(edge),right=[11,14,17].includes(edge),top=[12,13,14].includes(edge),bottom=[15,16,17].includes(edge),dx=left?16:right?-16:0,dy=top?16:bottom?-16:0;
  let after;await player.mouse.move(box.x+box.width/2,box.y+box.height/2);await player.mouse.down();
  try{await until(()=>read('window.json')?.resizing);await player.mouse.move(box.x+box.width/2+dx/ratio,box.y+box.height/2+dy/ratio);after=await until(()=>{const state=read('window.json');return state&&Math.abs(state.width-before.width-((left||right)?-16:0))<=3&&Math.abs(state.height-before.height-((top||bottom)?-16:0))<=3?state:null;},5000);}finally{await player.mouse.up();}
  await until(()=>read('window.json')?.resizing===false);edges.push({edge,widthChange:after.width-before.width,heightChange:after.height-before.height});
 }check('Move is larger, video has zero outer border, and WebView pointer drags change native bounds in all eight directions',{...layout,edges});'''
p.write_text(s.replace(old,new),encoding='utf-8')
