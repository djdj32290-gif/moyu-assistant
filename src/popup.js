let currentTab;
const $ = id => document.getElementById(id);
async function init() {
  try {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = new URL(currentTab.url);
    if (!/^https?:$/.test(u.protocol) || /(^|\.)(chromewebstore\.google\.com|chrome\.google\.com|microsoftedge\.microsoft\.com)$/.test(u.hostname)) {
      $("site").textContent = "此页面不支持修改";
      $("status").textContent = "请切换到普通网站，或先打开体验页。";
      return;
    }
    $("site").textContent = u.hostname;
    $("open").disabled = false;
  } catch {
    $("status").textContent = "无法读取页面，请切换到普通网站重试。";
  }
}
$("open").addEventListener("click", async () => {
  $("open").disabled = true;
  $("status").className = "status";
  $("status").textContent = "正在打开桌面软件…";
  try {
    // Request directly in the user gesture. Keep URL/API errors inside this handler.
    const origin = PointResizeAccess.patternFor(currentTab.url);
    if (!(await chrome.permissions.request({ origins: [origin] }))) throw new Error("未启用网站权限。再次点击可重新启用。");
    const result = await chrome.runtime.sendMessage({ type: "POINT_RESIZE_OPEN", tabId: currentTab.id });
    if (!result?.ok) throw new Error(result?.error || "打开失败，请刷新网页后重试。");
    window.close();
  } catch (error) {
    $("status").textContent = error.message;
    $("status").className = "status error";
    $("open").disabled = false;
  }
});
init();
