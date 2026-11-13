(() => {
  if (globalThis.PointResizeAccess) return;
  function patternFor(url) {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("请在普通网页上打开扩展。");
    // Match one declared scheme. A combined *:// request is not covered by
    // two separate http://*/* and https://*/* optional-host declarations.
    return `${u.protocol}//${u.hostname}/*`;
  }
  globalThis.PointResizeAccess = { patternFor };
})();
