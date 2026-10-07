param(
    [ValidateSet('start','artifacts','dependencies')]
    [string]$Mode = 'start'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Artifacts = Join-Path $Root 'artifacts'
$Resources = Join-Path $Root 'resources'
$Temp = Join-Path $Root '.setup-temp'
$ServerCfg = Join-Path $Root 'server.cfg'
$ArtifactMeta = Join-Path $Artifacts '.build'
$RecommendedPage = 'https://docs.fivem.net/docs/server-download/?branch=recommended&os=windows&platform=legacy'
$FallbackBuild = '35245'
$FallbackUrl = 'https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/35245-6efb47dff473c0e2a12fb50b08d74c0eb24a50d5/server.zip'

function Write-Rumble([string]$Text) {
    Write-Host "[RUMBLE] $Text"
}

function Reset-Temp {
    if (Test-Path $Temp) {
        Remove-Item $Temp -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Temp -Force | Out-Null
}

function Get-RecommendedArtifact {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $RecommendedPage -TimeoutSec 30
        $html = [string]$response.Content
        $match = [regex]::Match($html, 'https://runtime\.fivem\.net/artifacts/fivem/build_server_windows/master/([0-9]+)-[^"''<>\s]+/server\.7z')
        if ($match.Success) {
            $url = $match.Value -replace 'server\.7z$', 'server.zip'
            return [pscustomobject]@{ Build = $match.Groups[1].Value; Url = $url }
        }
    } catch {
        Write-Rumble 'Could not automatically detect the Recommended build. Using the verified fallback.'
    }
    return [pscustomobject]@{ Build = $FallbackBuild; Url = $FallbackUrl }
}

function Install-Artifacts {
    $artifact = Get-RecommendedArtifact
    $installedBuild = ''
    if (Test-Path $ArtifactMeta) {
        $installedBuild = (Get-Content $ArtifactMeta -Raw).Trim()
    }
    if ((Test-Path (Join-Path $Artifacts 'FXServer.exe')) -and $installedBuild -eq $artifact.Build) {
        Write-Rumble "FXServer Recommended build $($artifact.Build) is already installed."
        return
    }
    Write-Rumble "Downloading FXServer Recommended build $($artifact.Build)..."
    Reset-Temp
    $zip = Join-Path $Temp 'server.zip'
    $extract = Join-Path $Temp 'artifacts'
    Invoke-WebRequest -UseBasicParsing -Uri $artifact.Url -OutFile $zip -TimeoutSec 300
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    if (-not (Test-Path (Join-Path $extract 'FXServer.exe'))) {
        throw 'FXServer.exe was not found in the downloaded archive.'
    }
    if (Test-Path $Artifacts) {
        Get-ChildItem $Artifacts -Force | Remove-Item -Recurse -Force
    } else {
        New-Item -ItemType Directory -Path $Artifacts -Force | Out-Null
    }
    Copy-Item (Join-Path $extract '*') $Artifacts -Recurse -Force
    Set-Content -Path $ArtifactMeta -Value $artifact.Build -NoNewline
    Write-Rumble "FXServer build $($artifact.Build) was installed."
}

function Test-BaseResources {
    $required = @(
        '[managers]\mapmanager\fxmanifest.lua',
        '[managers]\spawnmanager\fxmanifest.lua',
        '[system]\chat\fxmanifest.lua',
        '[system]\sessionmanager\fxmanifest.lua',
        '[system]\hardcap\fxmanifest.lua',
        '[core]\core\fxmanifest.lua'
    )
    foreach ($item in $required) {
        $path = Join-Path $Resources $item
        if (-not (Test-Path -LiteralPath $path)) {
            throw "Required resource is missing: $item"
        }
    }
    Write-Rumble 'FiveM base resources are included and verified.'
}

function Install-OxMySql {
    $targetParent = Join-Path $Resources '[standalone]'
    $target = Join-Path $targetParent 'oxmysql'
    if (Test-Path -LiteralPath (Join-Path $target 'fxmanifest.lua')) {
        Write-Rumble 'oxmysql is already installed.'
        return
    }
    Write-Rumble 'Downloading the latest oxmysql release...'
    Reset-Temp
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    $zip = Join-Path $Temp 'oxmysql.zip'
    $extract = Join-Path $Temp 'oxmysql-extract'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/overextended/oxmysql/releases/latest/download/oxmysql.zip' -OutFile $zip -TimeoutSec 180
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    $manifest = Get-ChildItem $extract -Filter 'fxmanifest.lua' -Recurse -File | Where-Object { $_.Directory.Name -eq 'oxmysql' } | Select-Object -First 1
    if (-not $manifest) {
        $manifest = Get-ChildItem $extract -Filter 'fxmanifest.lua' -Recurse -File | Select-Object -First 1
    }
    if (-not $manifest) {
        throw 'fxmanifest.lua was not found in the oxmysql archive.'
    }
    if (Test-Path $target) {
        Remove-Item $target -Recurse -Force
    }
    Copy-Item $manifest.Directory.FullName $target -Recurse -Force
    Write-Rumble 'oxmysql was installed.'
}

function Test-ServerConfig {
    if (-not (Test-Path $ServerCfg)) {
        throw 'server.cfg is missing.'
    }
    $cfg = Get-Content $ServerCfg -Raw
    if ($cfg -match 'CHANGE_ME_CFX_LICENSE_KEY') {
        Write-Rumble 'Set your Cfx license key in server.cfg at sv_licenseKey.'
        throw 'The Cfx license key is not configured.'
    }
    if ($cfg -match 'CHANGE_ME_ADMIN_LICENSE') {
        Write-Rumble 'The admin license is not configured. The server can start, but admin commands will not work.'
    }
}

function Test-DatabasePort {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect('127.0.0.1', 3306, $null, $null)
        $ok = $result.AsyncWaitHandle.WaitOne(1200, $false)
        if ($ok -and $client.Connected) {
            $client.EndConnect($result)
            $client.Close()
            Write-Rumble 'MySQL/MariaDB is responding on 127.0.0.1:3306.'
            return
        }
        $client.Close()
    } catch {
    }
    Write-Rumble 'MySQL/MariaDB is not responding on 127.0.0.1:3306. Start MySQL in XAMPP before starting the server.'
}

try {
    if ($Mode -eq 'artifacts') {
        Install-Artifacts
    } elseif ($Mode -eq 'dependencies') {
        Test-BaseResources
        Install-OxMySql
    } else {
        Install-Artifacts
        Test-BaseResources
        Install-OxMySql
        Test-ServerConfig
        Test-DatabasePort
    }
    if (Test-Path $Temp) {
        Remove-Item $Temp -Recurse -Force
    }
    exit 0
} catch {
    Write-Host "[RUMBLE] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $Temp) {
        Remove-Item $Temp -Recurse -Force
    }
    exit 1
}
