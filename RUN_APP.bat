@echo off
echo =============================================
echo  VAYAL App - Install and Start
echo =============================================
echo.
cd /d "C:\Users\Guna S\Desktop\vayal"

echo [Step 1] Installing packages...
echo This takes 2-5 minutes on first run.
echo.
call npm install

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR during npm install. Trying with --legacy-peer-deps...
  call npm install --legacy-peer-deps
)

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo npm install FAILED. Please check your internet connection.
  pause
  exit /b 1
)

echo.
echo [Step 2] Starting Expo...
echo.
echo NEXT STEPS after QR code appears:
echo  1. Install "Expo Go" on your Android phone
echo  2. Scan the QR code
echo  3. App opens!
echo.
echo NOTE: Edit firebase/config.js with your Firebase credentials
echo       before logging in.
echo.
call npx expo start

pause
