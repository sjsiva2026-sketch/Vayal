# 📁 VAYAL — How to Add Your Images

## You need to copy 5 image files into these exact locations:

### Logo (for splash screen & app icon):
```
FROM: Logo2.jpg  (your uploaded file)
TO:   C:\Users\Guna S\Desktop\vayal\assets\icons\logo.jpg
```

### Machine Images (for category screen):
```
FROM: harvester_png.jpeg
TO:   C:\Users\Guna S\Desktop\vayal\assets\images\harvester.jpeg

FROM: tractor-rotavator_png.jpeg
TO:   C:\Users\Guna S\Desktop\vayal\assets\images\rotavator.jpeg

FROM: tractor-cultivator_png.jpeg
TO:   C:\Users\Guna S\Desktop\vayal\assets\images\cultivator.jpeg

FROM: straw-chopper_png.jpeg
TO:   C:\Users\Guna S\Desktop\vayal\assets\images\straw-chopper.jpeg
```

---

## Step-by-step:

1. Find the image files (they were uploaded to Claude, download them from the chat)
2. Open File Explorer
3. Navigate to: C:\Users\Guna S\Desktop\vayal\assets\
4. Copy Logo2.jpg → rename to logo.jpg → paste into icons\ folder
5. Copy the 4 machine images → paste into images\ folder with the names above

---

## Final folder structure should look like:

```
assets/
  icons/
    logo.jpg          ← green tractor app logo
  images/
    harvester.jpeg    ← red combine harvester
    rotavator.jpeg    ← red tractor with rotavator
    cultivator.jpeg   ← green tractor with cultivator
    straw-chopper.jpeg ← straw chopper machine
```

---

## After copying images, run:
```
npx expo start
```
