@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Script para hacer respaldo y subir a GitHub (Versión Batch para Windows)

cd /d "%~dp0"

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   🚀 RutaObra - Respaldo y GitHub Sync
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Generar timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
for /f "tokens=1,2 delims=/:" %%A in ('powershell -NoProfile -Command "Get-Date -Format HHmmss"') do (set timestamp=!mydate!_%%A)

echo 📦 Creando respaldo...
powershell -NoProfile -Command "Copy-Item index.html 'backups\index_!timestamp!.html'" 2>nul
if exist "backups\index_!timestamp!.html" (
    echo ✓ Respaldo: backups\index_!timestamp!.html
) else (
    echo ✗ Error al crear respaldo
    pause
    exit /b 1
)

echo.
echo 📝 Agregando cambios a Git...
git add -A 2>nul

echo 💾 Haciendo commit...
git commit -m "✨ Actualización RutaObra (!mydate! !mytime!)" -q 2>nul

echo 🚀 Subiendo a GitHub...
git pull origin main -q 2>nul
git push origin main -q 2>nul

if errorlevel 1 (
    echo ✗ Error al subir a GitHub
    echo.
    echo Intenta ejecutar en PowerShell:
    echo   .\sync-backup.ps1
    pause
    exit /b 1
)

echo.
echo ✅ ¡Actualización completa!
echo.
echo 📱 Puedes verlo en tu teléfono:
echo    https://crespobonjour.github.io/rutaobra/
echo.
echo 💾 Respaldo guardado:
echo    backups\index_!timestamp!.html
echo.
pause
