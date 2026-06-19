@echo off
title SkillPVP - REPARATION
color 0E
cd /d "%~dp0"

echo.
echo  REPARATION SkillPVP
echo  Ferme Cursor avant de continuer !
echo.
pause

set "NODE_EXE="
where node >nul 2>&1 && for /f "delims=" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\node\node.exe"

if not defined NODE_EXE (
  echo Node introuvable
  pause
  exit /b 1
)

for %%D in ("%NODE_EXE%") do set "NODE_DIR=%%~dpD"
set "PATH=%NODE_DIR%;%PATH%"

echo Suppression node_modules...
if exist node_modules (
  rmdir /s /q node_modules
  if exist node_modules (
    echo ERREUR: impossible de supprimer node_modules
    echo Ferme Cursor / VS Code puis relance ce script
    pause
    exit /b 1
  )
)

if exist package-lock.json del /f package-lock.json

echo Installation propre...
call "%NODE_DIR%npm.cmd" install
if errorlevel 1 (
  echo ECHEC
  pause
  exit /b 1
)

echo.
echo SUCCES ! Lance LANCE-MOI.bat
pause
