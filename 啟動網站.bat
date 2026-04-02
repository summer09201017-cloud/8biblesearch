@echo off
cd /d "%~dp0"

set PORT=8081
echo.
echo Bible app local server
echo Folder: %cd%
echo URL:    http://localhost:%PORT%/
echo Close this window or press Ctrl+C to stop.
echo.

start "" "http://localhost:%PORT%/"
timeout /t 1 /nobreak >nul

python -m http.server %PORT% 2>nul
if errorlevel 1 (
  echo Trying py launcher...
  py -3 -m http.server %PORT% 2>nul
)
if errorlevel 1 (
  echo ERROR: Install Python 3 and add to PATH, then run:
  echo   cd /d "%~dp0"
  echo   python -m http.server %PORT%
  echo.
  pause
  exit /b 1
)

pause
