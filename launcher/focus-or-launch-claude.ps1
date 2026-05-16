Add-Type -Name Win -Namespace Native -MemberDefinition @"
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
"@

$proc = Get-Process -Name powershell,windowsterminal,cmd -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -and $_.MainWindowHandle -ne [IntPtr]::Zero}
if ($proc) {
    $h = $proc[0].MainWindowHandle
    if ([Native.Win]::IsIconic($h)) { [Native.Win]::ShowWindow($h, 9) }
    [Native.Win]::SetForegroundWindow($h)
} else {
    $claudeScript = Join-Path $env:APPDATA "npm\claude.ps1"
    if (Test-Path $claudeScript) {
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME; & '$claudeScript'"
    } else {
        Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME"
    }
}
