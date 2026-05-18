Add-Type -Name Win -Namespace Native -MemberDefinition @"
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
"@

$launcherRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $launcherRoot "resolve-claude-launch-command.ps1")
$claudeLaunch = Get-ClaudeLaunchCommand

$proc = Get-Process -Name powershell,windowsterminal,cmd -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -and $_.MainWindowHandle -ne [IntPtr]::Zero}
if ($proc) {
    $h = $proc[0].MainWindowHandle
    if ([Native.Win]::IsIconic($h)) { [Native.Win]::ShowWindow($h, 9) }
    [Native.Win]::SetForegroundWindow($h)
} else {
    if ($claudeLaunch.found -and $claudeLaunch.command) {
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME; & '$($claudeLaunch.command)'"
    } else {
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME"
    }
}
