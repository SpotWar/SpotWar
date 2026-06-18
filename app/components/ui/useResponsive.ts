import { useWindowDimensions } from 'react-native';

/**
 * The breakpoint at which the auth screens switch from the phone layout to the
 * web split-screen shell. 900px comfortably clears a phone in landscape while
 * catching tablets/desktop, matching the handoff's 1280-wide web mocks.
 */
export const WIDE_BREAKPOINT = 900;

/**
 * `true` once the viewport is wide enough for the two-column web shell. Driven by
 * `useWindowDimensions` so it reacts to resize on web (and rotation on native).
 */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
