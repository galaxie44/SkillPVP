@echo off
REM Lance npm sur un chemin reseau UNC (\\serveur\...)
cd /d "%~dp0"
pushd "%~dp0"
call npm %*
set EXITCODE=%ERRORLEVEL%
popd
exit /b %EXITCODE%
