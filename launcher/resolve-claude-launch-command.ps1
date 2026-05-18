function Get-ClaudeLaunchCommand {
    $command = Get-Command claude -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
        $resolved = $command.Source
        if (-not $resolved) {
            $resolved = $command.Path
        }
        if (-not $resolved -and $command.CommandType -eq "Alias") {
            $resolved = $command.Definition
        }
        if ($resolved) {
            return @{
                found = $true
                command = $resolved
                source = "path"
            }
        }
        return @{
            found = $true
            command = "claude"
            source = "path"
        }
    }

    $appData = $env:APPDATA
    if (-not $appData) {
        $appData = [Environment]::GetFolderPath("ApplicationData")
    }
    $npmShim = Join-Path $appData "npm\claude.ps1"
    if (Test-Path $npmShim) {
        return @{
            found = $true
            command = $npmShim
            source = "appdata-npm"
        }
    }

    return @{
        found = $false
        command = $null
        source = "none"
    }
}
