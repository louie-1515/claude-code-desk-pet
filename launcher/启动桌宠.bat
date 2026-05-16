@echo off
cd /d "%~dp0..\"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "launcher\launch-claude-pet.ps1"
