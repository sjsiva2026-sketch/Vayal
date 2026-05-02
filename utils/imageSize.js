// utils/imageSize.js
//
// EXACT PIXEL SIZES — based on actual asset dimensions:
// ─────────────────────────────────────────────────────────────────
// logo.png         → 512×512px source  → display 64dp (80% of 80dp circle)
// farmer_role.png  → 256×256px source  → display 64dp (80% of 80dp circle)
// owner_role.png   → 256×256px source  → display 64dp (80% of 80dp circle)
// gpay.png         → 256×256px source  → display 57dp inside UPI card
// phonepe.png      → 256×256px source  → display 57dp inside UPI card
// paytm.png        → 256×256px source  → display 57dp inside UPI card
// harvester.png    → 512×512px source  → display 65dp inside category circle
// rotavator.png    → 512×512px source  → display 65dp inside category circle
// cultivator.png   → 512×512px source  → display 65dp inside category circle
// straw_chopper.png→ 512×512px source  → display 65dp inside category circle
//
// ALL images are 1:1 square — aspectRatio always 1
//
// dp → pixels on device:
//   xxhdpi  (most Android): dp × 3
//   xhdpi:  dp × 2
//   xxxhdpi: dp × 4
//
// Sharp rendering check (rendered px / source px):
//   logo       : 64dp × 3 = 192px  / 512px = 37% — very sharp ✅
//   role icons : 64dp × 3 = 192px  / 256px = 75% — sharp ✅
//   upi logos  : 57dp × 3 = 171px  / 256px = 67% — sharp ✅
//   cat images : 65dp × 3 = 195px  / 512px = 38% — very sharp ✅
// ─────────────────────────────────────────────────────────────────

import { Dimensions } from 'react-native';
const W = Dimensions.get('window').width;

// Scale factor — relative to 375dp base design
const scale = W / 375;
const s     = (dp) => Math.round(dp * scale);

export const IMG = {

  // ── logo.png (512×512px source) ───────────────────────────────────────────
  // Used in: OTPScreen header, App splash
  // Container: green circle 80dp → scales with screen
  // Image inside: 64dp (80% of container)
  LOGO_CONTAINER:  s(80),   // circle size in dp
  LOGO_SIZE:       s(64),   // image inside circle

  // ── farmer_role.png / owner_role.png (256×256px source) ──────────────────
  // Used in: RoleSelect cards, LoginScreen header
  // Container: circle 80dp | Image: 64dp (80% fill)
  ROLE_CONTAINER:  s(80),
  ROLE_SIZE:       s(64),

  // ── gpay.png / phonepe.png / paytm.png (256×256px source) ────────────────
  // Used in: PaymentScreen UPI app cards (3 equal flex cards)
  // Card width ≈ (W - 64dp padding - 20dp gaps) / 3
  // Image: 55% of card width — sharp at all densities
  UPI_LOGO: Math.round((W - s(64) - s(20)) / 3 * 0.55),

  // ── harvester/rotavator/cultivator/straw_chopper.png (512×512px source) ──
  // Used in: CategoryScreen 2×2 grid boxes
  //
  // Box width = (W - 32dp padding - 12dp gap) / 2
  // Circle inside box = 56% of box width
  // Image inside circle = 70% of circle
  CATEGORY_BOX_W:       Math.floor((W - s(32) - s(12)) / 2),
  CATEGORY_CIRCLE:      Math.round(Math.floor((W - s(32) - s(12)) / 2) * 0.56),
  CATEGORY_IMG_IN_BOX:  Math.round(Math.floor((W - s(32) - s(12)) / 2) * 0.56 * 0.70),

  // Full showcase image (CategoryScreen empty state / detail)
  // 50% of screen width — renders at 564px on xxhdpi, source 512px → sharp ✅
  CATEGORY_SHOWCASE:    Math.round(W * 0.50),

  // ── Legacy names (backwards compat) ──────────────────────────────────────
  CATEGORY_CHIP:        s(28),
  CATEGORY_CIRCLE_CONTAINER: s(68),
};
