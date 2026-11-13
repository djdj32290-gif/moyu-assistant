// Content scripts only submit domain operations. Browser storage is a cache.
(() => {
  if(globalThis.PointResizeData) return;
  globalThis.PointResizeData={
    async profile(key,command,args={}) {
      const result=await chrome.runtime.sendMessage({type:"POINT_RESIZE_DATA_PROFILE",key,command,...args});
      if(!result?.ok) throw new Error(result?.error||"软件资料库未连接，草稿已保留，请打开软件后重试。");
      return result;
    }
  };
})();
