// utils/responsive.js
// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION RESPONSIVE SYSTEM — handles ALL Android screen ratios:
//   16:9  (1280×720)   → ratio = 1.78
//   18:9  (2160×1080)  → ratio = 2.00
//   19.5:9 (2340×1080) → ratio = 2.17
//   20:9  (2400×1080)  → ratio = 2.22
//   21:9  (2520×1080)  → ratio = 2.33
//
// STRATEGY:
//   • Width-based scaling for fonts and horizontal spacing (rs, rf)
//   • Height-based scaling for vertical spacing only (hp)
//   • Tall screens (ratio > 2.1) get slightly more vertical padding
//   • Small screens (W < 360) get tighter layout
//   • All values clamped — never too small or too large
// ─────────────────────────────────────────────────────────────────────────────

import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;   // design base width
const BASE_H = 812;   // design base height (iPhone X)

// Screen ratio: height / width
const RATIO   = H / W;
const isTall  = RATIO > 2.1;   // 20:9, 21:9
const isShort = RATIO < 1.85;  // 16:9 landscape-ish
export const isSmall  = W < 360;
export const isTablet = W >= 600;

// ── Width-proportional scale (for padding, margin, size) ──────────────────
export const rs = (n) => {
  const scaled = Math.round((W / BASE_W) * n);
  // Clamp: never go below 70% or above 130% of base
  return Math.min(Math.max(scaled, Math.round(n * 0.70)), Math.round(n * 1.30));
};

// ── Clamped responsive font ────────────────────────────────────────────────
// 80%–115% of base — prevents fonts being unreadable on small/huge screens
export const rf = (n) => {
  const scaled = (W / BASE_W) * n;
  return Math.round(Math.min(Math.max(scaled, n * 0.80), n * 1.15));
};

// ── Height percentage — use for vertical spacing only ─────────────────────
export const hp = (pct) => Math.round((H * pct) / 100);

// ── Width percentage ───────────────────────────────────────────────────────
export const wp = (pct) => Math.round((W * pct) / 100);

// ── Horizontal padding — consistent across all screens ────────────────────
export const H_PAD = rs(16);

// ── Vertical padding — taller on tall screens ─────────────────────────────
// 16:9 phones: vp(16) = 16  |  20:9 phones: vp(16) = 18
export const vp = (n) => {
  if (isTall)  return Math.round(n * 1.12);
  if (isShort) return Math.round(n * 0.90);
  return n;
};

// ── Status bar height (Android) ────────────────────────────────────────────
export const STATUS_BAR_H = Platform.OS === 'android'
  ? (StatusBar.currentHeight || 24)
  : 0;

// ── Bottom navigation height — accounts for gesture bar ───────────────────
// Taller ratio phones have larger gesture areas
export const BOTTOM_NAV_H = rs(isTall ? 68 : 60);

// ── Pre-scaled spacing ─────────────────────────────────────────────────────
export const SPACING = {
  xs:  rs(4),
  sm:  rs(8),
  md:  rs(16),
  lg:  rs(24),
  xl:  rs(32),
  xxl: rs(48),
};

// ── Pre-scaled border radii ────────────────────────────────────────────────
export const RADIUS = {
  sm:  rs(8),
  md:  rs(12),
  lg:  rs(16),
  xl:  rs(20),
  xxl: rs(28),
};

// ── Pre-scaled icon sizes ──────────────────────────────────────────────────
export const ICON = {
  xs:  rs(14),
  sm:  rs(18),
  md:  rs(22),
  lg:  rs(28),
  xl:  rs(36),
  xxl: rs(48),
};

// ── Screen info (useful for debugging) ────────────────────────────────────
export const SCREEN = { W, H, RATIO: RATIO.toFixed(2), isTall, isShort, isSmall };
