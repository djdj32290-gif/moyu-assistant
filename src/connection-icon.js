// Static status dots over the existing toolbar artwork; no extra permissions.
(() => {
  let revision=0,last,queue=Promise.resolve();
  const images=new Map();
  async function icon(size,connected){
    const key=size+':'+connected;if(images.has(key))return images.get(key);
    const bitmap=await createImageBitmap(await (await fetch(chrome.runtime.getURL('icons/128.png'))).blob());
    const canvas=new OffscreenCanvas(size,size),context=canvas.getContext('2d');context.drawImage(bitmap,0,0,size,size);bitmap.close();
    context.beginPath();context.arc(size*.77,size*.77,size*.205,0,Math.PI*2);context.fillStyle=connected?'#239c52':'#d34545';context.fill();context.strokeStyle='#fff';context.lineWidth=Math.max(1,size/16);context.stroke();
    const result=context.getImageData(0,0,size,size);images.set(key,result);return result;
  }
  function update(value){
    const connected=!!value;if(last===connected)return queue;last=connected;const token=++revision;
    queue=queue.catch(()=>{}).then(async()=>{
      const data=Object.fromEntries(await Promise.all([16,32,48].map(async size=>[size,await icon(size,connected)])));
      if(token!==revision)return;
      await chrome.action.setIcon({imageData:data});
      await chrome.action.setTitle({title:connected?'摸鱼助手 · 已连接（绿点）':'摸鱼助手 · 未连接（红点）'});
    }).catch(()=>{if(token===revision)last=undefined;});return queue;
  }
  globalThis.PointResizeConnectionIcon={update};update(false);
})();
