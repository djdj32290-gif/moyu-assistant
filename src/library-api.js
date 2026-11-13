// Shared domain logic for extension requests and the offline desktop UI.
(() => {
  globalThis.PointResizeLibraryAPI=transport=>({
    async runtime(message) {
      const D=PointResizeVideoData,B=PointResizeBackup,type=message.type;
      if(type==="POINT_RESIZE_BACKUP_EXPORT") {const state=await transport({action:"read"});return {ok:true,backup:B.create(state.data,chrome.runtime.getManifest().version)};}
      if(type==="POINT_RESIZE_BACKUP_IMPORT") {
        const incoming=B.parse(message.text);
        for(let attempt=0;attempt<8;attempt++) {
          const state=await transport({action:"read"}),writes=B.merge(state.data,incoming);
          const result=await transport({action:"set",revision:state.revision,writes});
          if(!result.conflict)return {ok:true,summary:B.counts(incoming)};
        } throw new Error("其他窗口正在保存，请稍后重新导入。现有资料未被覆盖。");
      }
      if(type==="POINT_RESIZE_HOVER_SIZE"){await transport({action:"hover-size",scale:D.previewScale(message.scale)});return {ok:true};}
      if(type==="POINT_RESIZE_HOVER_SET") {if(typeof message.images!=="boolean")throw new Error("悬停预览设置无效。");await transport({action:"hover-preview",images:message.images});return {ok:true};}
      if(type==="VIDEO_QUEUE_VIEW") { const result=await transport({action:"video-view",mode:D.titleMode(message.mode)}); return {ok:true,view:result.data[D.viewKey]}; }
      const before=await transport({action:"read"}),old=before.data[D.key]||[];
      let args;
      if(type==="VIDEO_QUEUE_ADD") args={action:"queue-add",item:D.queueItem(message.item)};
      else if(type==="VIDEO_QUEUE_REMOVE") args={action:"queue-remove",id:message.id};
      else if(type==="VIDEO_QUEUE_WATCH") {if(typeof message.watched!=="boolean")throw new Error("已看标记无效。");args={action:"watch",id:message.id,watched:message.watched};}
      else if(type==="VIDEO_QUEUE_CLEAR_WATCHED")args={action:"clear-watched"};
      else throw new Error("不支持的资料操作。");
      const result=await transport(args),items=result.data[D.key]||[];
      return {ok:true,items,duplicate:args.item?old.some(item=>item.id===args.item.id):false,removed:Math.max(0,old.length-items.length)};
    }
  });
})();
