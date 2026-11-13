if (location.protocol === "file:") {
  const folder = decodeURIComponent(new URL(".", location.href).pathname).replace(/^\/([a-z]:)/i, "$1").replaceAll("/", "\\");
  document.getElementById("folder").textContent = "要加载的文件夹：" + folder;
} else document.getElementById("folder").hidden = true;
