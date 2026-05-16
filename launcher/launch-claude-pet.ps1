$ErrorActionPreference = "Stop"

$launcherRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $launcherRoot
$electronCli = Join-Path $projectRoot "node_modules\electron\cli.js"
$claudeScript = Join-Path $env:APPDATA "npm\claude.ps1"
$lockFile = Join-Path $projectRoot "launcher\.pet-lock"

# --- Deduplicate pet process ---
$petAlreadyRunning = $false
if (Test-Path $lockFile) {
    try {
        $pid = [int](Get-Content $lockFile -Raw).Trim()
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) { $petAlreadyRunning = $true }
    } catch {}
}
if (-not $petAlreadyRunning) {
    # Also check WMI as fallback
    $petProjectPattern = [WildcardPattern]::Escape($projectRoot)
    $existingPet = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.Name -eq "node.exe" -or $_.Name -eq "electron.exe") -and
        $_.CommandLine -like "*$petProjectPattern*"
    }
    if ($existingPet) { $petAlreadyRunning = $true }
}

if ((Test-Path $electronCli) -and (-not $petAlreadyRunning)) {
    $proc = Start-Process -FilePath "node" `
        -ArgumentList $electronCli, "." `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -PassThru
    $proc.Id | Out-File -FilePath $lockFile -Encoding ASCII
}

# --- Deduplicate Claude CLI ---
$existingClaude = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -eq "node.exe" -or $_.Name -eq "powershell.exe") -and
    ($_.CommandLine -like "*claude*" -or $_.CommandLine -like "*anthropic*") -and
    $_.CommandLine -notlike "*$petProjectPattern*"
}

if (-not $existingClaude) {
    if (Test-Path $claudeScript) {
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME; & '$claudeScript'"
    } else {
        Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoExit", "-Command", "Set-Location `$HOME"
    }
}
