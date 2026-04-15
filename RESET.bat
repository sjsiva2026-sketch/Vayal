@echo off
echo ================================================
echo   VAYAL - NUCLEAR CACHE RESET
echo ================================================

echo [1] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM expo.exe 2>nul
timeout /t 3 /nobreak >nul

echo [2] Deleting Metro cache from TEMP...
for /d %%i in ("%TEMP%\metro-*") do rmdir /s /q "%%i" 2>nul
for /d %%i in ("%TEMP%\haste-*") do rmdir /s /q "%%i" 2>nul
for /d %%i in ("%LOCALAPPDATA%\Temp\metro-*") do rmdir /s /q "%%i" 2>nul
for /d %%i in ("%USERPROFILE%\.metro-cache") do rmdir /s /q "%%i" 2>nul

echo [3] Deleting Expo packager info...
cd /d "C:\Users\Guna S\Desktop\vayal"
if exist ".expo\packager-info.json" del /f /q ".expo\packager-info.json"
if exist ".expo\settings.json" del /f /q ".expo\settings.json"

echo [4] Deleting node_modules/.cache...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo [5] Starting Expo fresh...
npx expo start --clear

pause
