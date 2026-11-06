@echo off
rem Removes a manual Fulla install. Close Photoshop first.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\uninstall.ps1"
pause
