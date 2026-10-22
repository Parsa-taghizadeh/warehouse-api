@echo off
rem Restores a folder made by Backup.bat. Drag the backup folder onto this file.
setlocal
title Warehouse Restore
set "DATA=%APPDATA%\Warehouse"
set "SRC=%~1"

if "%SRC%"=="" (
  echo To restore, drag a Warehouse-Backup folder onto Restore.bat.
  goto :end
)

if not exist "%SRC%\warehouse.db" (
  echo This folder is not a Warehouse backup, warehouse.db was not found:
  echo   %SRC%
  goto :end
)

netstat -an | find ":8000" | find "LISTENING" >nul
if not errorlevel 1 (
  echo Warehouse is still running.
  echo Close the black Warehouse window first, then try again.
  goto :end
)

echo This will replace the current Warehouse data with:
echo   %SRC%
echo.
set /p "ANSWER=Type YES and press Enter to continue: "
if /i not "%ANSWER%"=="YES" (
  echo Cancelled. Nothing was changed.
  goto :end
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"`) do set "STAMP=%%i"
if not defined STAMP set "STAMP=old"

rem Keep the current data instead of deleting it, in case the wrong folder was chosen.
set "KEPT=Warehouse-before-restore-%STAMP%"
if exist "%DATA%" (
  ren "%DATA%" "%KEPT%"
  if errorlevel 1 (
    echo Could not move the current data aside. Nothing was changed.
    goto :end
  )
)

xcopy "%SRC%" "%DATA%\" /E /I /Y /Q >nul
if errorlevel 1 (
  echo Restore failed. Your previous data is in:
  echo   %APPDATA%\%KEPT%
  goto :end
)

echo Restore complete. Run Warehouse.bat to open the program.
if exist "%APPDATA%\%KEPT%" (
  echo The data you had before is kept in:
  echo   %APPDATA%\%KEPT%
)

:end
echo.
pause
