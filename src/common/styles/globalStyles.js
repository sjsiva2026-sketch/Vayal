// src/common/styles/globalStyles.js
// ANDROID-ONLY global styles
// All screens use these as base — no iOS-specific overrides

import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { rs, rf, H_PAD, STATUS_BAR_H, BOTTOM_NAV_H } from '../../../utils/responsive';
import { COLORS } from '../../../constants/colors';

const { width: W, height: H } = Dimensions.get('window');

export const G = StyleSheet.create({
  // ── Safe containers ─────────────────────────────────────────────────────
  safe: {
    flex:            1,
    backgroundColor: COLORS.background,
  },
  safeWhite: {
    flex:            1,
    backgroundColor: '#fff',
  },

  // ── Screen root ──────────────────────────────────────────────────────────
  // Use this as the outermost View inside SafeAreaView
  screen: {
    flex:       1,
    paddingTop: STATUS_BAR_H, // Android status bar fix
  },

  // ── Scroll containers ────────────────────────────────────────────────────
  scroll: {
    flexGrow:      1,
    paddingBottom: rs(40),
    paddingHorizontal: H_PAD,
  },
  scrollNoPad: {
    flexGrow:      1,
    paddingBottom: rs(40),
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius:    rs(16),
    padding:         rs(16),
    elevation:       2,
    marginBottom:    rs(12),
    borderWidth:     1,
    borderColor:     '#F0F0F0',
  },
  cardFlat: {
    backgroundColor: '#fff',
    borderRadius:    rs(16),
    padding:         rs(16),
    marginBottom:    rs(12),
  },

  // ── Rows ──────────────────────────────────────────────────────────────────
  row:       { flexDirection: 'row', alignItems: 'center' },
  rowBetween:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius:    rs(14),
    paddingVertical: rs(15),
    alignItems:      'center',
  },
  btnPrimaryTxt: {
    color:      '#fff',
    fontSize:   rf(15),
    fontWeight: '800',
  },
  btnOutline: {
    borderRadius:    rs(14),
    paddingVertical: rs(15),
    alignItems:      'center',
    borderWidth:     rs(1.5),
    borderColor:     COLORS.primary,
    backgroundColor: '#fff',
  },
  btnOutlineTxt: {
    color:      COLORS.primary,
    fontSize:   rf(15),
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#EF4444',
    borderRadius:    rs(14),
    paddingVertical: rs(15),
    alignItems:      'center',
  },
  btnDangerTxt: {
    color:      '#fff',
    fontSize:   rf(15),
    fontWeight: '800',
  },

  // ── Typography ────────────────────────────────────────────────────────────
  h1: { fontSize: rf(24), fontWeight: '900', color: COLORS.textPrimary },
  h2: { fontSize: rf(20), fontWeight: '800', color: COLORS.textPrimary },
  h3: { fontSize: rf(17), fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: rf(14), color: COLORS.textPrimary, lineHeight: rf(21) },
  bodySmall: { fontSize: rf(12), color: COLORS.textSecondary, lineHeight: rf(18) },
  caption: { fontSize: rf(11), color: COLORS.textSecondary },
  label: { fontSize: rf(13), fontWeight: '700', color: COLORS.textSecondary, marginBottom: rs(6) },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    backgroundColor:  '#F9FAFB',
    borderWidth:      rs(1.5),
    borderColor:      '#E5E7EB',
    borderRadius:     rs(12),
    paddingVertical:  rs(13),
    paddingHorizontal:rs(14),
    fontSize:         rf(14),
    color:            '#111827',
  },
  inputFocused: {
    borderColor:     COLORS.primary,
    backgroundColor: '#FAFFFE',
  },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionTitle: {
    fontSize:        rf(16),
    fontWeight:      '800',
    color:           '#111827',
    marginBottom:    rs(12),
  },
  sectionLabel: {
    fontSize:     rf(12),
    fontWeight:   '700',
    color:        '#9CA3AF',
    marginBottom: rs(8),
    letterSpacing: 0.5,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  emptyContainer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        H_PAD * 2,
  },
  emptyIcon:  { fontSize: rf(48), marginBottom: rs(12) },
  emptyTitle: { fontSize: rf(18), fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptySub:   { fontSize: rf(13), color: '#6B7280', textAlign: 'center', marginTop: rs(8) },

  // ── Android-specific ─────────────────────────────────────────────────────
  // Add this paddingTop to views that need Android status bar spacing
  androidTop:  { paddingTop: STATUS_BAR_H },
  // Add this paddingBottom to views above bottom nav
  androidBottom:{ paddingBottom: BOTTOM_NAV_H },

  // ── Images ────────────────────────────────────────────────────────────────
  // Responsive images — no stretching on any Android ratio
  imgResponsive: {
    width:       '100%',
    height:      undefined,
    aspectRatio: 1.5,
    resizeMode:  'contain',
  },
  imgSquare: {
    width:       '100%',
    height:      undefined,
    aspectRatio: 1,
    resizeMode:  'cover',
  },
  imgPortrait: {
    width:       '100%',
    height:      undefined,
    aspectRatio: 0.75,
    resizeMode:  'contain',
  },

  // ── Separators ───────────────────────────────────────────────────────────
  divider: {
    height:          1,
    backgroundColor: '#F0F0F0',
  },

  // ── Shadows (Android elevation) ───────────────────────────────────────────
  shadow1: { elevation: 1 },
  shadow2: { elevation: 2 },
  shadow3: { elevation: 3 },
  shadow4: { elevation: 4 },
  shadow6: { elevation: 6 },
});
