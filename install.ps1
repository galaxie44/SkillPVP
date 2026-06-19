# SkillPVP Dashboard - Script d'installation
# Compatible Windows PowerShell 5.1+
# Executer : .\install.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "=== SkillPVP Dashboard - Installation ===" -ForegroundColor Cyan
Write-Host "Dossier projet : $ProjectRoot"
Write-Host ""

function Find-Node {
    $paths = @()

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $paths += $nodeCmd.Source
    }

    $paths += @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\node\node.exe"
    )

    foreach ($p in $paths) {
        if ($p -and (Test-Path $p)) {
            return $p
        }
    }

    return $null
}

# npm/cmd.exe ne supporte pas les chemins UNC (\\serveur\...)
# pushd mappe automatiquement le chemin reseau sur une lettre de lecteur temporaire
function Invoke-InProject {
    param(
        [string]$ProjectDir,
        [string]$ExePath,
        [string[]]$Arguments
    )

    $argLine = ($Arguments | ForEach-Object {
        if ($_ -match '\s') { "`"$_`"" } else { $_ }
    }) -join " "

    if ($ProjectDir -like '\\*') {
        Write-Host "Chemin reseau detecte - utilisation de pushd..." -ForegroundColor Yellow
        $cmd = "pushd `"$ProjectDir`" && `"$ExePath`" $argLine && popd"
        cmd /c $cmd
        return $LASTEXITCODE
    }

    Push-Location $ProjectDir
    try {
        & $ExePath @Arguments
        return $LASTEXITCODE
    } finally {
        Pop-Location
    }
}

$nodePath = Find-Node

if (-not $nodePath) {
    Write-Host "Node.js n'est pas installe." -ForegroundColor Yellow
    Write-Host "Installation via winget (Node.js LTS)..." -ForegroundColor Yellow

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path = "$machinePath;$userPath"
        $nodePath = Find-Node
    }

    if (-not $nodePath) {
        Write-Host ""
        Write-Host "ERREUR : Node.js introuvable." -ForegroundColor Red
        Write-Host "Installe-le manuellement : https://nodejs.org/ (version LTS)" -ForegroundColor Red
        Write-Host "Ferme et rouvre le terminal, puis relance : .\install.ps1" -ForegroundColor Red
        exit 1
    }
}

$nodeDir = Split-Path $nodePath -Parent
$npmPath = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npmPath)) {
    Write-Host "ERREUR : npm introuvable dans $nodeDir" -ForegroundColor Red
    exit 1
}

Write-Host "Node : $(& $nodePath --version)"
Write-Host "npm  : $(& $npmPath --version)"
Write-Host ""

# Creer .env.local si besoin (via PowerShell, OK sur UNC)
if (-not (Test-Path (Join-Path $ProjectRoot ".env.local"))) {
    $envExample = Join-Path $ProjectRoot ".env.example"
    $envLocal = Join-Path $ProjectRoot ".env.local"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envLocal
        Write-Host "Fichier .env.local cree depuis .env.example" -ForegroundColor Green
        Write-Host "IMPORTANT : configure Supabase dans .env.local avant de lancer l'app" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host "Installation des dependances npm..." -ForegroundColor Cyan
$exitCode = Invoke-InProject -ProjectDir $ProjectRoot -ExePath $npmPath -Arguments @("install")

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "ERREUR : npm install a echoue (code $exitCode)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Si le probleme persiste, copie le projet en local :" -ForegroundColor Yellow
    Write-Host "  xcopy `"$ProjectRoot`" `"$env:USERPROFILE\Desktop\SkillPVP`" /E /I /H" -ForegroundColor Gray
    Write-Host "  cd `"$env:USERPROFILE\Desktop\SkillPVP`"" -ForegroundColor Gray
    Write-Host "  .\install.ps1" -ForegroundColor Gray
    exit $exitCode
}

Write-Host ""
Write-Host "=== Installation terminee ===" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Cyan
Write-Host "  1. Configure Supabase (voir SUPABASE_SETUP.md)"
Write-Host "  2. Remplis .env.local avec tes cles Supabase"
Write-Host "  3. Lance : npm run dev  (depuis ce dossier)"
Write-Host "  4. Ouvre : http://localhost:3000"
Write-Host ""

if ($ProjectRoot -like '\\*') {
    Write-Host "Astuce : pour npm run dev sur un chemin reseau, utilise :" -ForegroundColor Yellow
    Write-Host "  pushd `"$ProjectRoot`"" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
    Write-Host "  popd" -ForegroundColor Gray
    Write-Host ""
}
