import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';

/**
 * Loads the three Nightfall typefaces (Anton / Archivo / Space Mono) via the
 * Google-fonts packages. The keys must match the family names referenced in
 * `theme/tokens.ts` `fonts`.
 *
 * Returns `[loaded, error]` from expo-font. The root layout renders the app even
 * before fonts resolve — text simply falls back to the system font for a frame
 * — so a slow font load never blocks the auth flow.
 */
export function useNightfallFonts() {
  return useFonts({
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
}
