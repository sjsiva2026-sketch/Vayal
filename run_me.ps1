# run_me.ps1
# Namma Vayal — PowerShell Clean Install Script
# Run from: C:\Users\Guna S\Desktop\vayal\
# Usage: Right-click → "Run with PowerShell"  OR  paste into PowerShell terminal

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NAMMA VAYAL — CLEAN INSTALL  v1.1.2 (versionCode 15)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1 — Remove old node_modules
Write-Host "[1/4] Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "      node_modules removed." -ForegroundColor Green
} else {
    Write-Host "      node_modules not found, skipping." -ForegroundColor Gray
}

# Step 2 — Remove package-lock.json
Write-Host "[2/4] Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "      package-lock.json removed." -ForegroundColor Green
} else {
    Write-Host "      package-lock.json not found, skipping." -ForegroundColor Gray
}

# Step 3 — npm install
Write-Host ""
Write-Host "[3/4] Running npm install..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm install failed. Fix the errors above and re-run." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "      npm install complete." -ForegroundColor Green

# Step 4 — expo install --fix (resolves exact SDK-compatible patch versions)
Write-Host ""
Write-Host "[4/4] Running expo install --fix (resolves exact compatible versions)..." -ForegroundColor Yellow
npx expo install --fix
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: expo install --fix had issues. Check output above." -ForegroundColor Yellow
} else {
    Write-Host "      expo install --fix complete." -ForegroundColor Green
}

# Done
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DONE! Now run:" -ForegroundColor Green
Write-Host ""
Write-Host "  npx expo-doctor            # should show 0 errors" -ForegroundColor White
Write-Host ""
Write-Host "  eas build --platform android --profile preview    # test APK" -ForegroundColor White
Write-Host "  eas build --platform android --profile production  # Play Store AAB" -ForegroundColor White
Write-Host ""
Write-Host "  FIREBASE CONSOLE — do this before building:" -ForegroundColor Yellow
Write-Host "  1. Authentication -> Sign-in method -> Phone -> Enable" -ForegroundColor White
Write-Host "  2. Run: eas credentials  -> copy SHA-1 fingerprint" -ForegroundColor White
Write-Host "  3. Firebase Console -> Project Settings -> Android app -> Add fingerprint" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
