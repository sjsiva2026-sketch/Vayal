## Namma Vayal — Fix Icon Font Error
## Run these commands in order from: C:\Users\Guna S\Desktop\vayal\

## STEP 1: Install missing packages
npx expo install expo-font expo-splash-screen

## STEP 2: Clear all caches
npx expo start --clear

## If Step 2 doesn't fix, run these:
## STEP 3: Nuclear clean (Windows)
rmdir /s /q node_modules
del package-lock.json
npm install
npx expo start --clear

## STEP 4: Clear Metro bundler cache
npx react-native start --reset-cache
