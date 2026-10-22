@echo off
rem Copies the Warehouse data folder to a dated folder on the Desktop.
setlocal
title Warehouse Backup
set "DATA=%APPDATA%\Warehouse"

if not exist "%DATA%\warehouse.db" (
  echo No Warehouse data found in "%DATA%".
  echo Run Warehouse.bat at least once first.
  goto :end
)

rem Copying while the server is writing could give a broken copy.
netstat -an | find ":8000" | find "LISTENING" >nul
if not errorlevel 1 (
  echo Warehouse is still running.
  echo Close the black Warehouse window first, then run Backup.bat again.
  goto :end
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"`) do set "STAMP=%%i"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"`) do set "DESKTOP=%%i"
if not defined STAMP set "STAMP=latest"
if not defined DESKTOP set "DESKTOP=%USERPROFILE%\Desktop"

set "DEST=%DESKTOP%\Warehouse-Backup-%STAMP%"
xcopy "%DATA%" "%DEST%\" /E /I /Y /Q >nul
if errorlevel 1 (
  echo Backup failed.
  goto :end
)

echo Backup saved to:
echo   %DEST%
echo.
echo Copy this folder to a USB drive to keep it safe.
explorer "%DESKTOP%"

:end
echo.
pause
