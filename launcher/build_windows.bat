@echo off
rem Builds dist\Warehouse.exe on Windows. Needs Python 3.13 from python.org.
rem web-dist must already be built (it is included in the zip made on the Mac).
setlocal
cd /d "%~dp0.."

if not exist web-dist\index.html (
  echo web-dist is missing. Build the frontend first: cd web ^&^& npm run build
  pause
  exit /b 1
)

if not exist venv-win\Scripts\python.exe (
  echo Creating virtual environment...
  py -3 -m venv venv-win || python -m venv venv-win || goto :fail
)

echo Installing packages...
venv-win\Scripts\python -m pip install --quiet -r requirements.txt pyinstaller pillow || goto :fail

echo Building Warehouse.exe...
venv-win\Scripts\pyinstaller launcher\desktop.py ^
  --name Warehouse ^
  --onefile ^
  --console ^
  --noconfirm ^
  --icon web\public\icons\icon-512.png ^
  --paths . ^
  --hidden-import main ^
  --hidden-import sqlalchemy.dialects.sqlite ^
  --collect-submodules uvicorn ^
  --add-data "web-dist;web-dist" || goto :fail

echo.
echo Done: %CD%\dist\Warehouse.exe
pause
exit /b 0

:fail
echo.
echo Build failed. See the messages above.
pause
exit /b 1
