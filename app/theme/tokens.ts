/**
 * Nightfall design tokens (dark tactical war-room), translated from the design
 * handoff's `N` object (`nightfall.jsx`) into a typed token set.
 *
 * The whole palette is derived from one swappable `ACCENT` hex — the default is
 * army green `#9DAE3C` (ember red `#FF5A3C` is the documented alternate). Reskin
 * the entire app by changing `ACCENT` in one place: the accent-derived tints
 * (`accentDim`, `accentErrBg`, `accentShadow`) recompute from it.
 *
 * Fixed, NON-themeable colors — they must NOT follow the accent:
 *  - `strava` `#FC4C02` (Strava brand button / tiles),
 *  - `blue` (rival team / privacy chips),
 *  - `ok` (valid pace / success / "strong"),
 *  - `warn` (password "fair").
 * Folding any of these into the accent token is a design bug (see subtask
 * pitfalls), so they live here as their own constants.
 */

/** Build an `rgba(...)` string from a `#rrggbb` hex and an alpha. */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The two documented accents. `army` is the default; `ember` is the alternate. */
export const ACCENTS = {
  army: '#9DAE3C',
  ember: '#FF5A3C',
} as const;

/**
 * The single swappable accent. Changing this one value reskins every CTA, focus
 * ring, error tint, and the wordmark mark. Defaults to army green per the
 * handoff README (the JSX mock ships ember as its live value, but the captured
 * screens — the visual target — are army green).
 */
export const ACCENT: string = ACCENTS.army;

export const colors = {
  bg: '#0E1014',
  surface: '#171A21',
  surface2: '#1F232D',
  line: 'rgba(255, 255, 255, 0.09)',
  lineStrong: 'rgba(255, 255, 255, 0.16)',
  text: '#F3F4F6',
  muted: '#8B919E',
  faint: '#5C616C',

  // Accent-derived — recompute if ACCENT changes.
  accent: ACCENT,
  accentDim: rgba(ACCENT, 0.14),
  accentErrBg: rgba(ACCENT, 0.07),

  // Fixed semantic colors — never folded into the accent.
  blue: '#3D7BFF',
  blueDim: rgba('#3D7BFF', 0.14),
  ok: '#27E08A',
  okDim: rgba('#27E08A', 0.14),
  warn: '#FFB13C',
  strava: '#FC4C02',

  /** Text/icon color that sits on top of an accent-filled button. */
  onAccent: '#140A07',
  onStrava: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Font *family* names. These are the names the `@expo-google-fonts/*` packages
 * register under (see `theme/fonts.ts`); until the fonts load, RN falls back to
 * the platform default, which is acceptable for a frame.
 */
export const fonts = {
  display: 'Anton_400Regular',
  body: 'Archivo_400Regular',
  bodyMedium: 'Archivo_600SemiBold',
  bodyBold: 'Archivo_700Bold',
  bodyHeavy: 'Archivo_800ExtraBold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const radius = {
  /** Cards, inputs, and buttons. The handoff is explicit: buttons are 10px, NOT pill. */
  control: 10,
  /** Large media / illustration blocks. */
  media: 16,
  /** Small chips / tags. */
  chip: 4,
} as const;

/** Standard control height (mobile). */
export const CONTROL_HEIGHT = 54;
/** Screen horizontal padding (mobile content). */
export const SCREEN_PADDING = 26;

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
} as const;

export const theme = { colors, fonts, radius, space, CONTROL_HEIGHT, SCREEN_PADDING };
export type Theme = typeof theme;
