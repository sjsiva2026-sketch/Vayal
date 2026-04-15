import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../../constants/colors';

export const globalStyles = StyleSheet.create({
  // ── Layout ─────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ── Cards ──────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },

  // ── Buttons ────────────────────────────────────────
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 6,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 6,
  },

  // ── Typography ─────────────────────────────────────
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },

  // ── Inputs ─────────────────────────────────────────
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  // ── Badges / Tags ──────────────────────────────────
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── Divider ────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  // ── Error ──────────────────────────────────────────
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: 4,
  },

  // ── Info boxes ─────────────────────────────────────
  infoBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    marginVertical: 8,
  },
  successBox: {
    backgroundColor: '#E8FAF0',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    marginVertical: 8,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    marginVertical: 8,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    marginVertical: 8,
  },
});
