document.getElementById("start-demo").onclick = () => globalThis.PointResizeApp.open();
if (!new URLSearchParams(location.search).has("manual")) globalThis.PointResizeApp.open();
