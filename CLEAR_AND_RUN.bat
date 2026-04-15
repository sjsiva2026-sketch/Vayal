@echo off
echo ============================================
echo  VAYAL - Full Cache Clear + Restart
echo ============================================

cd /d "C:\Users\Guna S\Desktop\vayal"

echo [1/4] Killing any running Metro server...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Clearing Metro cache...
if exist "%TEMP%\metro-*" rmdir /s /q "%TEMP%\metro-*" 2>nul
if exist "%TEMP%\haste-*" rmdir /s /q "%TEMP%\haste-*" 2>nul
if exist "%LOCALAPPDATA%\Temp\metro-*" rmdir /s /q "%LOCALAPPDATA%\Temp\metro-*" 2>nul

echo [3/4] Clearing Expo cache...
if exist ".expo" (
  if exist ".expo\packager-info.json" del ".expo\packager-info.json"
)

echo [4/4] Starting Expo with full cache clear...
npx expo start --clear

pause
