@echo off
setlocal
set SRC=\\sobegi.local\Users\Perso_portables\l2026008\Desktop\SkillPVP
set DEST=%USERPROFILE%\Desktop\SkillPVP
set LOG=%USERPROFILE%\Desktop\skillpvp-install.log

echo [%date% %time%] Debut > "%LOG%"

if not exist "%DEST%" mkdir "%DEST%"

echo Copie des fichiers (sans node_modules)... >> "%LOG%"
robocopy "%SRC%" "%DEST%" /E /XD node_modules .next /NFL /NDL /NJH /NJS >> "%LOG%" 2>&1

cd /d "%DEST%"
echo Dossier: %CD% >> "%LOG%"

if exist node_modules (
  echo Suppression ancien node_modules... >> "%LOG%"
  rmdir /s /q node_modules
)

echo npm install... >> "%LOG%"
call npm install >> "%LOG%" 2>&1
set EC=%ERRORLEVEL%
echo npm exit code: %EC% >> "%LOG%"

if %EC% neq 0 (
  echo ECHEC >> "%LOG%"
  exit /b %EC%
)

echo SUCCES - Installation terminee >> "%LOG%"
echo DONE
