import { Platform, type TextStyle } from 'react-native';

import { colors, fonts } from './tokens';

/**
 * Typography helpers mirroring the handoff's `nf.h` / `nf.mono`. Kept as plain
 * style factories (not components) so any text element can spread them.
 *
 * `letterSpacing` in RN is an absolute px value, not the CSS `em` the mock uses;
 * the values below are the em ratios resolved against each font size.
 */

/** Display heading — Anton, uppercase, tight leading. `size` in px. */
export function heading(size: number): TextStyle {
  return {
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: size, // line-height: 1.0
    letterSpacing: size * 0.01,
    textTransform: 'uppercase',
    color: colors.text,
  };
}

/** Mono "intel" caption — Space Mono, small, wide tracking, uppercase. */
export function mono(overrides?: TextStyle): TextStyle {
  return {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.faint,
    ...overrides,
  };
}

/** Body copy — Archivo, ~1.5 line height. */
export function body(size = 15, overrides?: TextStyle): TextStyle {
  return {
    fontFamily: fonts.body,
    fontSize: size,
    lineHeight: size * 1.5,
    color: colors.muted,
    ...overrides,
  };
}

/** Button label — Archivo 700, uppercase, wide tracking. */
export function buttonLabel(): TextStyle {
  return {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    letterSpacing: 15.5 * 0.04,
    textTransform: 'uppercase',
  };
}

/**
 * `react-native-web` warns that `letterSpacing` should be a string with units on
 * web. The numeric px values above render fine on native and web; this helper is
 * exported in case a screen wants to opt into the web-string form, but is unused
 * by default to keep one code path.
 */
export const IS_WEB = Platform.OS === 'web';
