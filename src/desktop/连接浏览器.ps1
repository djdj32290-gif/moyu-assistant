param(
    [string[]]$ExtensionId,
    [ValidateSet('com.pointresize.video', 'com.pointresize.video.test')]
    [string]$HostName = 'com.pointresize.video'
)
$ErrorActionPreference = 'Stop'
$helperRoot = $PSScriptRoot
$helperExe = Join-Path $helperRoot 'PointResizeVideo.exe'
if (-not (Test-Path -LiteralPath $helperExe)) { throw '请先完整解压助手文件夹，再运行连接配置。' }
if (-not $ExtensionId) {
    Write-Host '打开 chrome://extensions 或 edge://extensions，开启开发者模式。'
    Write-Host '复制“点选缩放”的扩展 ID（32 个小写字母）。多个 ID 可用空格分开。'
    $ExtensionId = @((Read-Host '粘贴扩展 ID') -split '[,;\s]+')
}
$helperIds = @($ExtensionId | Where-Object { $_ } | Select-Object -Unique)
if (-not $helperIds.Count -or @($helperIds | Where-Object { $_ -cnotmatch '^[a-p]{32}$' }).Count) { throw '扩展 ID 格式不正确，请从扩展管理页完整复制。' }
$helperManifest = Join-Path $helperRoot ($HostName + '.json')
$helperConfig = [ordered]@{
    name = $HostName
    description = '点选缩放桌面视频助手'
    path = $helperExe
    type = 'stdio'
    allowed_origins = @($helperIds | ForEach-Object { 'chrome-extension://' + $_ + '/' })
}
[IO.File]::WriteAllText($helperManifest, ($helperConfig | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))
foreach ($helperBrowser in @('Google\Chrome', 'Microsoft\Edge')) {
    $helperKey = 'HKCU:\Software\' + $helperBrowser + '\NativeMessagingHosts\' + $HostName
    New-Item -Path $helperKey -Force | Out-Null
    Set-Item -LiteralPath $helperKey -Value $helperManifest
}
Write-Host '已连接 Chrome / Edge。回到扩展待看列表，点击播放即可。'
Write-Host '移动助手文件夹后，请重新运行本配置；不需要开机启动。'
