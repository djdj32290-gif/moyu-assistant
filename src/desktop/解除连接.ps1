param(
    [ValidateSet('com.pointresize.video', 'com.pointresize.video.test')]
    [string]$HostName = 'com.pointresize.video'
)
$ErrorActionPreference = 'Stop'
$helperManifest = Join-Path $PSScriptRoot ($HostName + '.json')
foreach ($helperBrowser in @('Google\Chrome', 'Microsoft\Edge')) {
    $helperKey = 'HKCU:\Software\' + $helperBrowser + '\NativeMessagingHosts\' + $HostName
    if (Test-Path -LiteralPath $helperKey) {
        $helperCurrent = (Get-Item -LiteralPath $helperKey).GetValue('')
        if ($helperCurrent -eq $helperManifest) { Remove-Item -LiteralPath $helperKey }
    }
}
$helperProtocol = if ($HostName -eq 'com.pointresize.video.test') { 'pointresize-video-test' } else { 'pointresize-video' }
$helperProtocolKey = 'HKCU:\Software\Classes\' + $helperProtocol
$helperCommandKey = $helperProtocolKey + '\shell\open\command'
$helperExpectedCommand = '"' + (Join-Path $PSScriptRoot 'PointResizeVideo.exe') + '" --connect "%1"'
if (Test-Path -LiteralPath $helperCommandKey) {
    if ((Get-Item -LiteralPath $helperCommandKey).GetValue('') -eq $helperExpectedCommand) {
        # Remove only this helper's known protocol keys, never a different path.
        Remove-Item -LiteralPath $helperCommandKey
        foreach ($helperPart in @('\shell\open', '\shell', '')) {
            $helperOwnedKey = $helperProtocolKey + $helperPart
            if ((Get-Item -LiteralPath $helperOwnedKey).SubKeyCount -eq 0) { Remove-Item -LiteralPath $helperOwnedKey }
        }
    }
}
Write-Host '已解除本目录助手的连接。关闭视频窗口后，可删除整个助手文件夹。'
