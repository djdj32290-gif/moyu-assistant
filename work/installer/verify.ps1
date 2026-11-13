$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$testRoot = $PSScriptRoot
$env:TEMP = Join-Path $testRoot 'temp'; $env:TMP = $env:TEMP
$tools = Join-Path $testRoot 'wix-3.14.1'
Add-Type -Path (Join-Path $tools 'Microsoft.Deployment.WindowsInstaller.dll')
Add-Type -Path (Join-Path $tools 'Microsoft.Deployment.WindowsInstaller.Package.dll')
$build = Get-Content -LiteralPath (Join-Path $testRoot 'build-manifest.json') -Raw | ConvertFrom-Json
$checks = [Collections.Generic.List[string]]::new()
function Check([bool]$ok, [string]$message) {
    if (-not $ok) { throw $message }
    $checks.Add($message); Write-Output "PASS $message"
}
$package = [Microsoft.Deployment.WindowsInstaller.Package.InstallPackage]::new($build.msi, [Microsoft.Deployment.WindowsInstaller.DatabaseOpenMode]::ReadOnly)
try {
    $properties = @{}
    $view = $package.OpenView('SELECT `Property`, `Value` FROM `Property`'); $view.Execute()
    while ($record = $view.Fetch()) { $properties[$record.GetString(1)] = $record.GetString(2); $record.Dispose() }; $view.Dispose()
    Check ($properties['ProductVersion'] -eq $build.version) 'MSI product version matches current extension'
    Check (-not $properties.ContainsKey('ALLUSERS')) 'MSI has per-user context, with no ALLUSERS switch'
    Check (($package.SummaryInfo.WordCount -band 8) -eq 8) 'Package summary marks installation as not requiring elevation'
    Check ($package.SummaryInfo.Template.StartsWith('x64;')) 'MSI targets x64 Windows'
    $registry = @($package.ExecuteQuery('SELECT `Root`, `Key`, `Name` FROM `Registry`'))
    Check ($registry.Count -eq 6 -and $registry[0] -eq 1 -and $registry[3] -eq 1 -and $registry[1] -eq 'Software\PointResize\VideoHelper' -and $registry[4] -eq $registry[1] -and $registry -contains 'ProductCode' -and $registry -contains 'InstallLocation') 'Registry table writes only current-user location and product identity markers'
    $actions = @{}
    $view = $package.OpenView('SELECT `Action`, `Type`, `Source`, `Target` FROM `CustomAction`'); $view.Execute()
    while ($record = $view.Fetch()) { $actions[$record.GetString(1)] = @{ Type=$record.GetInteger(2); Source=$record.GetString(3); Target=$record.GetString(4) }; $record.Dispose() }; $view.Dispose()
    Check ($actions['SetINSTALLFOLDER'].Target -eq 'D:\点选缩放\[LogonUser]\') 'Default installation directory is a D-drive folder for the current user'
    Check ($actions['PrepareProtocol'].Source -eq 'HelperExe' -and $actions['PrepareProtocol'].Target -eq '--install-prepare "[INSTALLSOURCE]"' -and ($actions['PrepareProtocol'].Type -band 2048) -eq 0) 'Registration passes captured MSI source to the installed helper as the current user'
    Check ($actions['SetINSTALLSOURCE'].Target -eq '[OriginalDatabase]') 'Source filename containing actual extension ID is captured before deployment'
    Check ($actions['RollbackPrepare'].Target -eq '--unregister' -and ($actions['RollbackPrepare'].Type -band 256) -ne 0) 'First-install rollback schedules the ownership-aware unregister command'
    Check ($actions['UnregisterHelper'].Target -eq '--uninstall-cleanup' -and ($actions['UnregisterHelper'].Type -band 2048) -eq 0 -and ($actions['UnregisterHelper'].Type -band 64) -eq 0) 'Uninstall runs ownership-aware data cleanup as current user and reports failures'
    $shortcut=@($package.ExecuteQuery('SELECT `Directory_`, `Name`, `Target`, `Arguments`, `WkDir` FROM `Shortcut`'))
    $rows=@();for($i=0;$i -lt $shortcut.Count;$i+=5){$rows+=,@($shortcut[$i..($i+4)])}
    $uninstall=@($rows|Where-Object {$_[0] -eq 'INSTALLFOLDER'})
    Check ($rows.Count -eq 3 -and $uninstall.Count -eq 1 -and $uninstall[0][1].Contains('卸载点选缩放视频助手') -and $uninstall[0][2] -eq '[#HelperExe]' -and $uninstall[0][3] -eq '--uninstall' -and $uninstall[0][4] -eq 'INSTALLFOLDER') 'Installed folder contains an ownership-checked uninstall shortcut'
    foreach($directory in @('DesktopFolder','ProgramMenuFolder')){
        $entry=@($rows|Where-Object {$_[0] -eq $directory})
        Check ($entry.Count -eq 1 -and $entry[0][1].Contains('点选缩放') -and $entry[0][2] -eq '[#HelperExe]' -and -not $entry[0][3] -and $entry[0][4] -eq 'INSTALLFOLDER') ($directory+' shortcut opens the standalone software without registration or browser arguments')
    }
    $sequence = @{}
    $view = $package.OpenView('SELECT `Action`, `Condition`, `Sequence` FROM `InstallExecuteSequence`'); $view.Execute()
    while ($record = $view.Fetch()) { $sequence[$record.GetString(1)] = @{Condition=$record.GetString(2); Number=$record.GetInteger(3)}; $record.Dispose() }; $view.Dispose()
    Check ($sequence.InstallFiles.Number -lt $sequence.RollbackPrepare.Number -and $sequence.RollbackPrepare.Number -lt $sequence.PrepareProtocol.Number -and $sequence.PrepareProtocol.Number -lt $sequence.InstallFinalize.Number) 'File deployment precedes registration and rollback is scheduled first'
    Check ($sequence.UnregisterHelper.Number -gt $sequence.InstallInitialize.Number -and $sequence.UnregisterHelper.Number -lt $sequence.RemoveRegistryValues.Number -and $sequence.UnregisterHelper.Number -lt $sequence.RemoveFiles.Number -and $sequence.UnregisterHelper.Condition.Contains('NOT UPGRADINGPRODUCTCODE')) 'Cleanup runs while ownership markers still exist and skips major upgrades'
    $cleanupCondition=$sequence.UnregisterHelper.Condition
    Check ($sequence.RejectCDrive.Condition.Contains('C:\')) 'Execute sequence rejects a C-drive target before changes'
    foreach ($table in @('ServiceInstall','ServiceControl','LockPermissions','MsiLockPermissionsEx','RemoveFile')) {
        Check (-not $package.Tables.Contains($table)) "No $table table changes services, permissions or wildcard user files"
    }
    $view=$package.OpenView('SELECT `Argument`, `Ordering` FROM `ControlEvent` WHERE `Dialog_` = ''WelcomeDlg'' AND `Control_` = ''Next'' AND `Event` = ''NewDialog'''); $view.Execute()
    $events=@();while($record=$view.Fetch()){ $events+=,@($record.GetString(1),$record.GetInteger(2));$record.Dispose() };$view.Dispose()
    $highest=$events|Sort-Object {$_[1]} -Descending|Select-Object -First 1
    Check ($highest[0] -eq 'InstallDirDlg') 'Welcome proceeds to folder selection without an invented license agreement'
    Check ($package.ExecuteScalar('SELECT `Text` FROM `Control` WHERE `Dialog_` = ''ExitDialog'' AND `Control` = ''Description''').Contains('配对并授权')) 'Completion screen explains software-first plugin installation and pairing'
    Check ($properties['ProductName'] -eq '点选缩放') 'Windows application uses the software product name'
    Check ($properties['WIXUI_EXITDIALOGOPTIONALCHECKBOXTEXT'] -eq '打开点选缩放' -and $properties['WixShellExecTarget'] -eq '[#HelperExe]') 'Finish offers opening the installed software without browser arguments'
    Check ($actions['LaunchApplication'].Source -eq 'WixCA' -and $actions['LaunchApplication'].Target -eq 'WixShellExec' -and ($actions['LaunchApplication'].Type -band 2048) -eq 0) 'Optional launch executes as the current user without elevation'
    # Extract embedded CAB only; do not run InstallExecuteSequence or register a product.
    $package.WorkingDirectory=Join-Path $testRoot 'extracted'
    $package.ExtractFiles()
    $names=@($build.files.PSObject.Properties)
    Check ($package.Files.Count -eq $names.Count -and $names.Count -eq 65 -and $names.Name -contains '这个文件夹是什么.md') 'MSI contains 25 software files and 40 matching installed plugin files, with no embedded MSI in the plugin'
    foreach($file in $names) {
        $extracted=Join-Path $package.WorkingDirectory ('PointResizeVideo\'+$file.Name.Replace('/','\'))
        $hash=(Get-FileHash -LiteralPath $extracted -Algorithm SHA256).Hash.ToLowerInvariant()
        if($hash -ne $file.Value){throw "Payload differs: $($file.Name)"}
    }
    Check $true 'Every embedded payload file matches the build manifest SHA-256'
} finally { $package.Dispose() }
# Read-only MSI session: search prerequisites and evaluate conditions, never install.
$oldUI=[Microsoft.Deployment.WindowsInstaller.Installer]::SetInternalUI([Microsoft.Deployment.WindowsInstaller.InstallUIOptions]::Silent)
$session=$null
try {
    $session=[Microsoft.Deployment.WindowsInstaller.Installer]::OpenPackage($build.msi,$true)
    $session.DoAction('AppSearch')
    Check ($session.EvaluateCondition('VersionNT64 AND WINDOWSMAJOR >= "#10"')) 'Prerequisite search correctly recognizes this 64-bit Windows 10/11 system'
    Check ($session.EvaluateCondition('NETFRAMEWORK45 >= "#394802"')) 'Prerequisite search recognizes the existing .NET Framework runtime'
    $session.DoAction('SetINSTALLFOLDER')
    Check ($session['INSTALLFOLDER'].StartsWith('D:\点选缩放\')) 'Formatted default directory resolves to D drive at runtime'
    $session.DoAction('SetINSTALLSOURCE')
    Check ($session['INSTALLSOURCE'] -eq $build.msi) 'Installer source property resolves to the original MSI path'
    $session['INSTALLFOLDER']='C:\Example\'
    Check ($session.EvaluateCondition('INSTALLFOLDER ~<< "C:\"')) 'C-drive rejection condition matches a C-drive selection'
    $session['INSTALLFOLDER']='D:\Example\'
    Check (-not $session.EvaluateCondition('INSTALLFOLDER ~<< "C:\"')) 'C-drive rejection condition accepts a D-drive selection'
    $session['REMOVE']='ALL';$session['UPGRADINGPRODUCTCODE']='{00000000-0000-0000-0000-000000000000}'
    Check (-not $session.EvaluateCondition($cleanupCondition)) 'An upgrade cannot invoke deletion of saved position, login or cache'
    $session['UPGRADINGPRODUCTCODE']=''
    Check ($session.EvaluateCondition($cleanupCondition)) 'A full uninstall invokes owned-data cleanup'
    $session['REMOVE']=''
    Check (-not $session.EvaluateCondition($cleanupCondition)) 'Install or repair does not invoke owned-data cleanup'
} finally { if($session){$session.Dispose()};[void][Microsoft.Deployment.WindowsInstaller.Installer]::SetInternalUI($oldUI) }
$actualHash=(Get-FileHash -LiteralPath $build.msi -Algorithm SHA256).Hash.ToLowerInvariant()
Check ($actualHash -eq $build.msiSHA256) 'Verified installer hash matches the delivery artifact'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot ('outputs\点选缩放-安装包-'+$build.version+'.zip')))
try {
    Check ($zip.Entries.Count -eq 2 -and @($zip.Entries|Where-Object {$_.FullName.EndsWith('安装点选缩放.msi')}).Count -eq 1) 'Software-first ZIP contains only the installer and short guide'
    Check (@($zip.Entries|Where-Object {-not $_.FullName.StartsWith('点选缩放/')}).Count -eq 0) 'Software-first ZIP opens to one product folder'
    foreach($entry in $zip.Entries) {
        $source=Join-Path (Join-Path $projectRoot 'outputs\点选缩放安装包') $entry.FullName.Split('/')[-1]
        $stream=$entry.Open();$sha=[Security.Cryptography.SHA256]::Create()
        try { $actual=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
        finally { $stream.Dispose();$sha.Dispose() }
        if($actual -ne (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()){throw "Bundle differs: $($entry.FullName)"}
    }
    Check $true 'Software-first bundle bytes match the verified MSI and short guide'
} finally { $zip.Dispose() }
$result=[ordered]@{timestamp=(Get-Date).ToString('o');version=$build.version;msiSHA256=$actualHash;checks=@($checks);installed=$false;firstConnection='Not tested: user installation pending';scope='Read-only MSI database, CAB extraction and prerequisite/condition evaluation; no installation, registry fixture or application launch.'}
[IO.File]::WriteAllText((Join-Path $testRoot 'verification.json'),($result|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
