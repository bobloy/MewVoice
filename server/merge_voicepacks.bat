@echo off
echo Merging Voice Packs...
powershell -ExecutionPolicy Bypass -File "%~dp0merge_voice_packs.ps1"
echo.
echo Process complete.
pause
