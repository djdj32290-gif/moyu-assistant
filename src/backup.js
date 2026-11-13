(() => {
  if (globalThis.PointResizeBackup) return;
  const prefix = "point-resize:v1:", positionKey = "point-resize:panel-position";
  const maxBytes = 16 * 1024 * 1024, format = "point-resize-backup";
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  function fail(message) { throw new Error(message); }
  function siteKey(key) {
    if (!key.startsWith(prefix)) return false;
    const site = key.slice(prefix.length);
    try { return site === "local-demo" || (!!site && new URL("https://" + site).hostname === site); } catch { return false; }
  }
  function rule(value) {
    if (!object(value) || typeof value.selector !== "string" || !value.selector || value.selector.length > 2500 ||
      !["scale", "font"].includes(value.mode) || !Number.isFinite(value.value) ||
      value.value < (value.mode === "font" ? 8 : 10) || value.value > (value.mode === "font" ? 64 : 200)) fail("保存项的选区或大小无效。");
    for (const field of ["hidden", "enabled", "similar"]) if (value[field] !== undefined && typeof value[field] !== "boolean") fail("保存项的开关无效。");
    for (const field of ["id", "name", "label", "defaultLabel", "kind", "pageURL"]) if (value[field] !== undefined && (typeof value[field] !== "string" || value[field].length > 10000)) fail("保存项的文字信息无效。");
    if (value.shadowPath !== undefined && (!Array.isArray(value.shadowPath) || value.shadowPath.length > 32 || value.shadowPath.some(part => typeof part !== "string" || !part || part.length > 2500))) fail("保存项的组件路径无效。");
    if (value.textAnchor && (!object(value.textAnchor) || !Number.isInteger(value.textAnchor.index) || value.textAnchor.index < 0 || value.textAnchor.index > 1000 || typeof value.textAnchor.quote !== "string" || value.textAnchor.quote.length > 10000 || typeof value.id !== "string")) fail("保存项的文字位置无效。");
    if (globalThis.PointResizePicker && !PointResizePicker.validRule(value)) fail("保存项的选择器无效。");
    if (value.thumbnail !== undefined && value.thumbnail !== "" && (typeof value.thumbnail !== "string" || value.thumbnail.length > 240000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value.thumbnail))) fail("保存项的截图无效。");
    if (value.layers !== undefined) {
      if (!Array.isArray(value.layers) || value.layers.length > 100) fail("单项最多包含 100 个元素。");
      for (const layer of value.layers) { if (layer?.layers !== undefined) fail("保存项的层级格式无效。"); rule(layer); }
    }
    return value;
  }
  function validate(data) {
    if (!object(data)) fail("备份中的数据格式无效。");
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (siteKey(key)) {
        if (!object(value) || !Array.isArray(value.rules) || value.rules.length > 100 || (value.enabled !== undefined && typeof value.enabled !== "boolean")) fail("网站保存项格式无效，每个网站最多 100 项。");
        value.rules.forEach(rule); result[key] = value;
      } else if (key === PointResizeVideoData.key) {
        if (!Array.isArray(value) || value.length > 200) fail("视频列表格式无效，最多 200 条。");
        result[key] = value.map(entry => { if (!object(entry)) fail("视频条目无效。"); return PointResizeVideoData.item(entry); });
        if (new Set(result[key].map(entry => entry.id)).size !== value.length) fail("备份中有重复视频。");
      } else if (key === PointResizeVideoData.viewKey) {
        if (!object(value) || Object.keys(value).some(key => key !== "titles")) fail("视频显示设置无效。");
        result[key] = { titles: PointResizeVideoData.titleMode(value.titles) };
      } else if (key === PointResizeVideoData.previewKey) {
        if (!object(value)||Object.keys(value).length!==1||typeof value.images!=="boolean") fail("悬停预览设置无效。");
        result[key]={images:value.images};
      } else if (key === PointResizeVideoData.previewSizeKey) {
        if(!object(value)||Object.keys(value).length!==1)fail("预览尺寸无效。");
        result[key]={scale:PointResizeVideoData.previewScale(value.scale)};
      } else if (key === positionKey) {
        if (!object(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) fail("面板位置无效。");
        result[key] = { x: value.x, y: value.y };
      } else fail("备份含有不支持的数据项。");
    }
    return result;
  }
  const owns = key => siteKey(key) || key === PointResizeVideoData.key || key === PointResizeVideoData.viewKey || key === PointResizeVideoData.previewKey || key === PointResizeVideoData.previewSizeKey || key === positionKey;
  function create(storage, version = "") {
    const data = Object.fromEntries(Object.entries(storage).filter(([key]) => owns(key) && storage[key] != null));
    return { format, schemaVersion: 1, extensionVersion: version, exportedAt: new Date().toISOString(), data: validate(data) };
  }
  function parse(text) {
    if (new TextEncoder().encode(text).length > maxBytes) fail("备份文件不能超过 16 MB。");
    let backup;
    try { backup = JSON.parse(text); } catch { fail("不是有效的 JSON 备份文件。"); }
    if (!object(backup) || backup.format !== format || backup.schemaVersion !== 1) fail("请选择点选缩放导出的备份文件；此文件格式或版本不受支持。");
    return validate(backup.data);
  }
  function merge(current, incoming) {
    const data = validate(incoming), writes = {};
    const identity = item => item.id || JSON.stringify([item.selector, item.shadowPath || [], item.mode, item.textAnchor || null]);
    for (const [key, value] of Object.entries(data)) {
      if (siteKey(key)) {
        const old = current[key] || {}, map = new Map((Array.isArray(old.rules) ? old.rules : []).map(item => [identity(item), { ...item, enabled: old.enabled !== false && item.enabled !== false }]));
        for (const item of value.rules) map.set(identity(item), { ...item, enabled: value.enabled !== false && item.enabled !== false });
        if (map.size > 100) fail("合并后 " + key.slice(prefix.length) + " 超过 100 项，请先整理该网站的记录。");
        writes[key] = { enabled: true, rules: [...map.values()] };
      } else if (key === PointResizeVideoData.key) {
        const map = new Map(value.map(item => [item.id, item]));
        for (const item of PointResizeVideoData.clean(current[key])) if (!map.has(item.id)) map.set(item.id, item);
        if (map.size > 200) fail("合并后视频超过 200 条，请先整理待看列表。");
        writes[key] = [...map.values()];
      } else writes[key] = value;
    }
    return writes;
  }
  function counts(data) {
    const profiles = Object.entries(data).filter(([key]) => siteKey(key));
    return profiles.length + " 个网站、" + profiles.reduce((sum, [, profile]) => sum + profile.rules.length, 0) + " 个保存项、" + (data[PointResizeVideoData.key]?.length || 0) + " 条视频";
  }
  globalThis.PointResizeBackup = { create, parse, merge, counts, maxBytes, positionKey, validate, owns };
})();
