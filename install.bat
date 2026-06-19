@echo off
title SkillPVP - Installation locale
cd /d "%~dp0"
echo === SkillPVP - Installation (dossier local) ===
echo Dossier: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERREUR: Node.js introuvable. Installe-le depuis https://nodejs.org
  pause
  exit /b 1
)

echo Node:
node --version
echo npm:
call npm --version
echo.

if not exist .env.local (
  if exist .env.example copy .env.example .env.local
  echo .env.local cree
)

if exist node_modules (
  echo Suppression de l ancien node_modules...
  rmdir /s /q node_modules
)

echo Installation npm en cours (2-3 min)...
call npm install
if errorlevel 1 (
  echo ECHEC npm install
  pause
  exit /b 1
)

echo.
echo === SUCCES ===
echo Lance l app avec: npm run dev
echo Puis ouvre: http://localhost:3000
echo.
pause
