(() => {
  if (globalThis.PointResizeVideoData) return;
  const key = "point-resize:video-queue:v1";
  const viewKey = "point-resize:video-view:v1";
  const previewKey = "point-resize:hover-preview:v1";
  const previewSizeKey="point-resize:hover-size:v1";
  function previewScale(value){if(typeof value!=="number"||!Number.isFinite(value)||value<.5||value>3)throw new Error("预览尺寸无效。");return Math.round(value*100)/100;}
  function candidate(input) {
    try { return parse(input); } catch(error) {
      const text=String(input).trim(),url=webURL(/^https?:\/\//i.test(text)?text:"https://"+text);
      if(["www.bilibili.com","bilibili.com","m.bilibili.com"].includes(url.hostname)&&/^\/bangumi\/play\/ss[1-9][0-9]{0,11}\/?$/.test(url.pathname)){
        const season=url.pathname.match(/ss([0-9]+)/)[1];return {kind:"bilibili-pending",id:"bilibili-season:"+season,url:"https://www.bilibili.com/bangumi/play/ss"+season};
      }
      if(!["www.huya.com","huya.com"].includes(url.hostname)||!/^\/[A-Za-z][A-Za-z0-9_-]{0,79}\/?$/.test(url.pathname))throw error;
      url.protocol="https:";url.hostname="www.huya.com";url.search="";url.hash="";
      return {kind:"live-pending",id:"huya-alias:"+url.pathname.replace(/\/$/,""),url:url.href};
    }
  }
  function group(item){return item.kind==="bilibili"?"bilibili":item.kind==="live"&&item.provider==="huya"?"huya":"other";}
  function titleMode(value) { if (!["expanded", "collapsed"].includes(value)) throw new Error("标题显示方式无效。"); return value; }
  function webURL(input) {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("请使用 HTTP / HTTPS 视频地址。");
    return url;
  }
  function locator(input) {
    if (!input || typeof input.selector !== "string" || !input.selector || input.selector.length > 2500) return null;
    const shadowPath = input.shadowPath || [];
    if (!Array.isArray(shadowPath) || shadowPath.length > 32 || shadowPath.some(part => typeof part !== "string" || !part || part.length > 2500)) return null;
    return { selector: input.selector, ...(shadowPath.length ? { shadowPath: [...shadowPath] } : {}) };
  }
  function media(input) {
    const sourceUrl = input.sourceUrl ? webURL(input.sourceUrl).href : "";
    const mediaLocator = locator(input.locator);
    let mediaUrl = String(input.mediaUrl ?? input.url ?? "");
    const dependent = !mediaUrl || mediaUrl.startsWith("blob:");
    if (dependent) {
      if (!sourceUrl || !mediaLocator) throw new Error("临时视频流需要从原网页点选加入。");
      if (mediaUrl && new URL(mediaUrl).origin !== new URL(sourceUrl).origin) throw new Error("临时视频流与原网页不匹配。");
    } else mediaUrl = webURL(mediaUrl).href;
    return { kind: "media", id: dependent ? "media-page:" + sourceUrl + "|" + JSON.stringify(mediaLocator) : "media:" + mediaUrl,
      url: mediaUrl || sourceUrl, mediaUrl, sourceUrl, ...(mediaLocator ? { locator: mediaLocator } : {}), dependent };
  }
  function parse(input) {
    const text = String(input || "").trim();
    const url = webURL(/^https?:\/\//i.test(text) ? text : "https://" + text);
    if (["www.huya.com","huya.com","liveshare.huya.com"].includes(url.hostname)) {
      const match=url.pathname.match(url.hostname==="liveshare.huya.com"?/^\/iframe\/(\d{1,12})\/?$/:/^\/(\d{1,12})\/?$/);
      if(!match)throw new Error("请在虎牙直播间点击“收藏当前页视频／直播”，获取真实房间编号。");
      const room=String(Number(match[1]));if(room==='0')throw new Error("直播房间编号无效。");
      return {kind:"live",provider:"huya",room,id:"huya-live:"+room,url:"https://www.huya.com/"+room,embed:"https://liveshare.huya.com/iframe/"+room};
    }
    if (url.hostname === "player.bilibili.com" && url.pathname === "/player.html") {
      const episode=url.searchParams.get("episodeId");if(/^[1-9][0-9]{0,11}$/.test(episode||""))return parse("https://www.bilibili.com/bangumi/play/ep"+episode);
      const bvid = url.searchParams.get("bvid"), aid = url.searchParams.get("aid");
      const code = /^BV[0-9A-Za-z]{10}$/.test(bvid || "") ? bvid : /^\d+$/.test(aid || "") ? "av" + aid : "";
      if (!code) throw new Error("嵌入播放器没有有效的视频编号。");
      return parse("https://www.bilibili.com/video/" + code + "?p=" + (url.searchParams.get("page") || 1));
    }
    if (/\.(mp4|webm|ogv|ogg|m4v)$/i.test(url.pathname)) return media({ mediaUrl: url.href });
    if (!["www.bilibili.com", "bilibili.com", "m.bilibili.com"].includes(url.hostname)) throw new Error("请点选网页中的实际视频，或粘贴 B 站完整链接、MP4 / WebM 视频直链；普通帖子链接不能直接播放。");
    const episode=url.pathname.match(/^\/bangumi\/play\/ep([1-9][0-9]{0,11})\/?$/);
    if(episode){const code="ep"+episode[1],embed=new URL("https://player.bilibili.com/player.html");Object.entries({episodeId:episode[1],autoplay:1,muted:0,high_quality:0}).forEach(([k,v])=>embed.searchParams.set(k,v));return {kind:"bilibili",category:"bangumi",id:"bilibili-ep:"+episode[1],code,page:1,url:"https://www.bilibili.com/bangumi/play/"+code,embed:embed.href};}
    const match = url.pathname.match(/^\/video\/(BV[0-9A-Za-z]{10}|av\d+)\/?$/i);
    if (!match) throw new Error("支持 B站 BV/av 视频和番剧影视 ep/ss 链接；短链接请先在浏览器打开。");
    const code = /^bv/i.test(match[1]) ? "BV" + match[1].slice(2) : match[1].toLowerCase();
    const rawPage = Number(url.searchParams.get("p") || 1);
    const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
    const canonical = "https://www.bilibili.com/video/" + code + (page > 1 ? "?p=" + page : "");
    const embed = new URL("https://player.bilibili.com/player.html");
    embed.searchParams.set(code.startsWith("BV") ? "bvid" : "aid", code.startsWith("BV") ? code : code.slice(2));
    Object.entries({ page, autoplay: 1, muted: 0, high_quality: 0 }).forEach(([name, value]) => embed.searchParams.set(name, value));
    return { kind: "bilibili", id: code + ":" + page, code, page, url: canonical, embed: embed.href };
  }
  function cover(input, generic = false) {
    try {
      const url = new URL(String(input || "").replace(/^\/\//, "https://"));
      return !url.username && !url.password && (generic ? ["http:", "https:"].includes(url.protocol) : url.protocol === "https:" && /(^|\.)hdslb\.com$/.test(url.hostname)) ? url.href : "";
    } catch { return ""; }
  }
  function item(input) {
    if (input.watched !== undefined && typeof input.watched !== "boolean") throw new Error("视频的已看状态无效。");
    const parsed = input.kind === "media" ? media(input) : parse(input.url);
    const fallback = parsed.kind === "media" ? "网页视频" : parsed.kind === "live" ? "虎牙直播 · "+parsed.room : parsed.code + (parsed.page > 1 ? " · P" + parsed.page : "");
    return { ...parsed, title: String(input.title || "").trim().slice(0, 180) || fallback, cover: cover(input.cover, parsed.kind !== "bilibili"), addedAt: Number(input.addedAt) || Date.now(), watched: input.watched === true };
  }
  function clean(data) {
    const result = [], seen = new Set();
    for (const entry of Array.isArray(data) ? data : []) {
      try { const value = item(entry); if (!seen.has(value.id)) { seen.add(value.id); result.push(value); } } catch { /* Ignore obsolete or malformed records. */ }
      if (result.length >= 200) break;
    }
    return result;
  }
  function queueItem(input) {
    const value = item(input);
    if (value.dependent) throw new Error("临时视频流不会加入待看列表，请选择 B 站视频链接或可保存的视频直链。");
    return value;
  }
  function watch(items, id, watched) {
    if (typeof watched !== "boolean") throw new Error("视频的已看状态无效。");
    const entry = items.find(item => item.id === id);
    if (entry) entry.watched = watched;
  }
  function clearWatched(items) {
    let removed = 0;
    for (let i = items.length - 1; i >= 0; i--) if (items[i].watched) { items.splice(i, 1); removed++; }
    return { removed };
  }
  globalThis.PointResizeVideoData = { key, viewKey, previewKey, previewSizeKey, previewScale, candidate, group, titleMode, parse, cover, item, clean, queueItem, watch, clearWatched };
})();
