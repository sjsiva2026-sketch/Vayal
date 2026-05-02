/**
 * utils/responsive.js  — Single source of truth for ALL responsive values
 *
 * HOW RESPONSIVENESS WORKS:
 * ─────────────────────────────────────────────────────────────────
 * BASE_WIDTH = 375dp  (iPhone SE / standard small-phone design base)
 *
 * rs(n)  → proportional scale: n × (screenW / 375)
 *          320dp phone: rs(16) = 13.7  |  414dp: 17.6  |  375dp: 16
 *
 * rf(n)  → clamped font:  same scale but clamped to 80%–120% of n
 *          Prevents fonts being too tiny on small or huge on large phones
 *
 * wp(%)  → exact % of screen width     e.g. wp(50) = half screen
 * hp(%)  → exact % of screen height
 *
 * SPACING / RADIUS / ICON → pre-scaled constant objects
 *          Use these everywhere instead of raw numbers
 *
 * isTablet → W >= 600dp   (not used for Android-only but exported)
 * isSmall  → W < 360dp    (tighter layout on very small phones)
 * ─────────────────────────────────────────────────────────────────
 */
import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const BASE = 375;

/** Proportional scale */
export const rs = (n) => Math.round((W / BASE) * n);

/** Clamped responsive font */
export const rf = (n) => {
  const s = (W / BASE) * n;
  return Math.round(Math.min(Math.max(s, n * 0.80), n * 1.20));
};

/** Width percentage */
export const wp = (pct) => (W * pct) / 100;

/** Height percentage */
export const hp = (pct) => (H * pct) / 100;

/** Device flags */
export const isTablet = W >= 600;
export const isSmall  = W < 360;

/** Pre-scaled spacing */
export const SPACING = {
  xs:   rs(4),
  sm:   rs(8),
  md:   rs(16),
  lg:   rs(24),
  xl:   rs(32),
  xxl:  rs(48),
};

/** Pre-scaled border radii */
export const RADIUS = {
  sm:   rs(8),
  md:   rs(12),
  lg:   rs(16),
  xl:   rs(20),
  xxl:  rs(28),
};

/** Pre-scaled icon sizes */
export const ICON = {
  xs:   rs(14),
  sm:   rs(18),
  md:   rs(22),
  lg:   rs(28),
  xl:   rs(36),
  xxl:  rs(48),
};

/** Horizontal screen padding (used in every screen) */
export const H_PAD = rs(16);
