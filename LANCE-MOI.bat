@echo off
title SkillPVP - LANCE ICI
color 0A
cd /d "%~dp0"

echo.
echo  SkillPVP - %CD%
echo.

REM === Trouver Node.js ===
set "NODE_EXE="
where node >nul 2>&1 && for /f "delims=" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\node\node.exe"

if not defined NODE_EXE (
  echo  Node.js introuvable - installe depuis https://nodejs.org
  pause
  exit /b 1
)

for %%D in ("%NODE_EXE%") do set "NODE_DIR=%%~dpD"

REM CRUCIAL : ajouter Node au PATH pour les scripts postinstall npm
set "PATH=%NODE_DIR%;%PATH%"

echo  Node : %NODE_EXE%
"%NODE_EXE%" --version
echo  npm  :
call "%NODE_DIR%npm.cmd" --version
echo.

REM === Install ou reparer ===
if not exist "node_modules\next\package.json" (
  echo  Nettoyage ancien node_modules casse...
  if exist node_modules rmdir /s /q node_modules 2>nul
  if exist package-lock.json del /f package-lock.json 2>nul

  echo  Installation npm - 2 a 3 minutes...
  call "%NODE_DIR%npm.cmd" install
  if errorlevel 1 (
    echo.
    echo  ECHEC - ferme Cursor et relance REPARER.bat
    pause
    exit /b 1
  )
) else (
  echo  node_modules OK
)

if not exist ".env.local" (
  if exist ".env.example" copy /y .env.example .env.local >nul
  echo  .env.local cree - configure Supabase
)

echo.
echo  ========================================
echo   http://localhost:3000
echo   Ctrl+C pour arreter
echo  ========================================
echo.
call "%NODE_DIR%npm.cmd" run dev
pause
