@echo off
echo Creating placeholder PNG files for VAYAL assets...
echo (Replace these with your real generated images)

REM ── 1x1 transparent PNG in base64 ──
REM We use certutil to decode a tiny valid PNG

set "B64=iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

echo %B64% > "%TEMP%\tiny.b64"
certutil -decode "%TEMP%\tiny.b64" "%TEMP%\tiny.png" >nul 2>&1

REM ── Icons ──
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\logo.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\farmer_role.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\owner_role.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\gpay.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\phonepe.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\icons\paytm.png" >nul

REM ── Images ──
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\images\harvester.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\images\rotavator.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\images\cultivator.png" >nul
copy "%TEMP%\tiny.png" "C:\Users\Guna S\Desktop\vayal\assets\images\straw_chopper.png" >nul

echo.
echo Done! All 10 placeholder PNG files created.
echo.
echo NOW REPLACE THEM with your real AI-generated images:
echo.
echo  assets\icons\logo.png          ^<-- App logo (512x512)
echo  assets\icons\farmer_role.png   ^<-- Farmer character (256x256)
echo  assets\icons\owner_role.png    ^<-- Owner character (256x256)
echo  assets\icons\gpay.png          ^<-- GPay logo (256x256)
echo  assets\icons\phonepe.png       ^<-- PhonePe logo (256x256)
echo  assets\icons\paytm.png         ^<-- Paytm logo (256x256)
echo  assets\images\harvester.png    ^<-- Harvester machine (512x512)
echo  assets\images\rotavator.png    ^<-- Rotavator machine (512x512)
echo  assets\images\cultivator.png   ^<-- Cultivator machine (512x512)
echo  assets\images\straw_chopper.png^<-- Straw chopper (512x512)
echo.
pause
