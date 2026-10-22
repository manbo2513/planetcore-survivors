@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0play.ps1"
if errorlevel 1 (
  echo.
  echo Game failed to start. See launcher-error.txt for details.
  if exist "%~dp0launcher-error.txt" type "%~dp0launcher-error.txt"
  pause
)
