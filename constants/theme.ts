/**
 * Design system tokens for Campus Eats
 * Single source of truth — derived from DESIGN.md (Stitch project 221969943980033188)
 */

// ─── Color Tokens ────────────────────────────────────────────────────────────

export const Colors = {
  // Brand primaries (from user spec)
  primary: '#F97316',       // Orange — CTAs, active states, prices
  green: '#166534',         // Deep green — links, veg tags, success
  background: '#FFF7ED',    // Warm cream — app background canvas
  surface: '#FFFFFF',       // White — cards, sheets, modals
  text: '#1F2937',          // Charcoal — headlines, body text
  inputBg: '#F3F4F6',       // Light gray — input fills, chips unselected

  // Semantic / state
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  success: '#166534',

  // Convenience aliases for UI components
  card: '#FFFFFF',
  border: '#E5E7EB',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  primaryLight: '#FFF0E6',

  // Stitch DESIGN.md named tokens
  primaryContainer: '#F97316',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#582200',
  secondary: '#1F6C3A',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#A4F1B2',
  onSecondaryContainer: '#24703E',
  tertiary: '#625E56',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#A09A91',
  onTertiaryContainer: '#36322C',

  // Surface hierarchy
  surfaceDim: '#D0DBED',
  surfaceBright: '#F8F9FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainer: '#E6EEFF',
  surfaceContainerHigh: '#DEE9FC',
  surfaceContainerHighest: '#D9E3F6',
  onSurface: '#121C2A',
  onSurfaceVariant: '#584237',
  inverseSurface: '#27313F',
  inverseOnSurface: '#EAF1FF',

  // Outline
  outline: '#8C7164',
  outlineVariant: '#E0C0B1',

  // Tab bar
  tabActive: '#F97316',
  tabInactive: '#8C7164',
} as const;

export type ColorKey = keyof typeof Colors;

// ─── Typography Tokens ───────────────────────────────────────────────────────

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Typography = {
  displayLg: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64, // -0.02em at 32px
  },
  headlineLg: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.36, // -0.015em
  },
  headlineMd: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2, // -0.01em
  },
  headlineSm: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyLg: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMd: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  labelLg: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.15, // 0.01em
  },
  labelMd: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.13, // 0.01em
  },
  labelSm: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.44, // 0.04em
  },
} as const;

// ─── Spacing Tokens ───────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,    // space-xs: 0.25rem
  sm: 8,    // space-sm: 0.5rem
  md: 16,   // space-md / gutter: 1rem
  lg: 24,   // space-lg / margin-lg: 1.5rem
  xl: 32,   // space-xl: 2rem
  xxl: 40,
  gutter: 16,
  gutterSm: 12,
  margin: 16,
  marginLg: 24,
} as const;

// ─── Border Radius Tokens ─────────────────────────────────────────────────────

export const Radii = {
  sm: 4,    // 0.25rem
  md: 8,    // 0.5rem — DEFAULT
  lg: 12,   // 0.75rem
  xl: 16,   // 1rem
  xxl: 24,  // 1.5rem
  full: 9999, // pill
  pill: 9999,
} as const;

// ─── Shadow / Elevation Tokens ────────────────────────────────────────────────

export const Shadows = {
  /** Level 1 — Resting cards & vendor tiles */
  card: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  /** Level 2 — Floating / interactive (Cart bar, active cards) */
  floating: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  /** Level 3 — Modals / bottom sheets */
  modal: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 16,
  },
  /** CTA button orange glow */
  cta: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

// ─── Touch Target Sizes ───────────────────────────────────────────────────────

export const TouchTarget = {
  min: 48,
  primary: 52,
  cta: 56,
} as const;

// ─── Bottom Tab Config ────────────────────────────────────────────────────────

export const BottomTabs = {
  height: 64,
  tabs: ['Explore', 'Search', 'Orders', 'Profile'] as const,
} as const;
