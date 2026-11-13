// Geometry comes only from the bundled UI, never from page-provided markup.
globalThis.PointResizePanelShape=(ui,bridge)=>{
  let scheduled=false,last="";
  function schedule(force=false){if(force===true)last="";if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;
    const preview=!ui.$("image-viewer").hidden;
    const nodes=[[ui.$("panel"),"panel"],[ui.$("panel-tabs"),"tabs"],[ui.$("level-rail"),"rail"]];
    if(preview)nodes.push([ui.$("image-viewer").querySelector(".preview-dialog"),"preview"]);
    const shapes=nodes.filter(([node])=>node&&!node.hidden&&node.getClientRects().length).map(([node,kind])=>{
      const r=node.getBoundingClientRect(),css=getComputedStyle(node);
      const scale=parseFloat(css.zoom)||1;
      return {kind,x:Math.max(0,r.x),y:Math.max(0,r.y),width:Math.min(r.width,innerWidth-Math.max(0,r.x)),height:Math.min(r.height,innerHeight-Math.max(0,r.y)),radius:(kind==="tabs"?8:parseFloat(css.borderTopRightRadius)||0)*scale};
    }).filter(r=>r.width>0&&r.height>0);
    const message={type:"panel-geometry",viewportWidth:innerWidth,viewportHeight:innerHeight,shapes};
    const json=JSON.stringify(message);if(json!==last){last=json;bridge.send(message);}
  });}
  new ResizeObserver(schedule).observe(ui.$("panel"));new ResizeObserver(schedule).observe(ui.$("level-rail"));
  new MutationObserver(schedule).observe(ui.root,{subtree:true,childList:true,attributes:true,attributeFilter:["hidden","style","class"]});
  window.addEventListener("resize",schedule);
  ui.root.addEventListener("pointerdown",event=>{
    if(event.button!==0||!ui.$("image-viewer").hidden)return;
    const r=ui.$("panel").getBoundingClientRect(),x=event.clientX,y=event.clientY;
    if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;
    const grip=6*(parseFloat(getComputedStyle(ui.$('panel')).zoom)||1);
    const l=x-r.left<grip,right=r.right-x<grip,t=y-r.top<grip,b=r.bottom-y<grip;
    const hit=t?(l?13:right?14:12):b?(l?16:right?17:15):l?10:right?11:0;
    if(hit){event.preventDefault();event.stopImmediatePropagation();bridge.send({type:"panel-resize",hit});}
  },true);
  schedule();return ()=>schedule(true);
};
