import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getLocales } from 'expo-localization';

import { persistedStore } from './storage';
import { useAuth } from './auth';

/**
 * Bilingual FR/EN strings for the auth flow. FR is the default and the source of
 * truth for which keys exist — `Dict` is derived from the FR dictionary so the EN
 * one is type-checked to mirror exactly the same keys (a missing translation is a
 * compile error, not a silent fallback to the key). Subtask 03 (auth screens)
 * adds keys here as it builds each screen.
 */
export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'fr';

const fr = {
  'common.appName': 'SpotWar',
  'common.continue': 'Continuer',
  'common.back': 'Retour',
  'common.loading': 'Chargement…',
  'common.season': 'Montréal · Saison 01',

  'language.title': 'Choisis ta\nlangue',
  'language.subtitle': 'Choose your language',
  'language.step': 'Étape 1 / 6',
  'language.french': 'Français',
  'language.frenchRegion': 'Québec',
  'language.english': 'English',
  'language.englishRegion': 'Canada',

  'settings.title': 'Réglages',
  'settings.language': 'Langue',

  'auth.welcome.tag': 'Montréal · Saison 01',
  'auth.welcome.title': 'Conquiers ta\nville. Une\ncourse à la fois.',
  'auth.welcome.body':
    'Transforme tes kilomètres en territoire. Conquiers des quartiers, attaque tes rivaux, tiens la carte jusqu’à la fin de la saison.',
  'auth.welcome.create': 'Créer un compte',
  'auth.welcome.haveAccount': 'J’ai déjà un compte',
  'auth.welcome.runnersCount': '4 800 coureurs sur le terrain',

  'auth.signUp.step': 'Étape 2 / 6',
  'auth.signUp.title': 'Enrôle-toi',
  'auth.signUp.subtitle':
    'Choisis un pseudo — c’est ainsi que tes rivaux te reconnaîtront.',
  'auth.signUp.nametag': 'Pseudo',
  'auth.signUp.nametagPlaceholder': 'maxime_t',
  'auth.signUp.email': 'E-mail',
  'auth.signUp.emailPlaceholder': 'toi@spotwar.run',
  'auth.signUp.password': 'Mot de passe',
  'auth.signUp.passwordRule': 'Min. 8 caractères · 1 majuscule · 1 chiffre · 1 symbole',
  'auth.signUp.terms': 'J’accepte les Conditions & la Politique de confidentialité.',
  'auth.signUp.submit': 'Créer un compte',
  'auth.signUp.submitting': 'Création du compte…',
  'auth.signUp.footer': 'Déjà enrôlé ?',
  'auth.signUp.footerLink': 'Connexion',

  'auth.strength.weak': 'Faible',
  'auth.strength.fair': 'Moyen',
  'auth.strength.strong': 'Fort',

  'auth.login.title': 'Re-bonjour,\nsoldat',
  'auth.login.subtitle': 'La carte a bougé pendant ton absence.',
  'auth.login.email': 'E-mail',
  'auth.login.emailPlaceholder': 'toi@spotwar.run',
  'auth.login.password': 'Mot de passe',
  'auth.login.submit': 'Se connecter',
  'auth.login.submitting': 'Connexion…',
  'auth.login.forgot': 'Mot de passe oublié ?',
  'auth.login.footer': 'Nouveau dans la guerre ?',
  'auth.login.footerLink': 'Enrôle-toi',

  'auth.verify.tag': 'Vérification requise',
  'auth.verify.title': 'Vérifie ta\nboîte mail',
  'auth.verify.body':
    'Nous avons envoyé un lien de vérification à {email}. Confirme-le pour te déployer.',
  'auth.verify.openMail': 'Ouvrir l’app mail',
  'auth.verify.resend': 'Renvoyer le lien',
  'auth.verify.resendIn': 'Renvoyer le lien · {seconds}',
  'auth.verify.resent': 'E-mail renvoyé.',
  'auth.verify.changeAddress': 'Mauvaise adresse ?',
  'auth.verify.changeAddressLink': 'La modifier',

  'auth.forgot.title': 'Réinitialiser\nl’accès',
  'auth.forgot.body':
    'Entre ton e-mail et nous t’enverrons un lien pour reprendre le contrôle de ton compte.',
  'auth.forgot.email': 'E-mail',
  'auth.forgot.emailPlaceholder': 'toi@spotwar.run',
  'auth.forgot.submit': 'Envoyer le lien',
  'auth.forgot.submitting': 'Envoi…',
  'auth.forgot.sent': 'Lien envoyé. Vérifie ta boîte mail.',
  'auth.forgot.footer': 'Tu t’en souviens ?',
  'auth.forgot.footerLink': 'Retour à la connexion',

  'auth.error.invalidEmail': 'Cet e-mail ne semble pas valide',
  'auth.error.nametagTaken': 'Pseudo déjà pris — essaie un autre',
  'auth.error.emailTaken': 'Cet e-mail est déjà enrôlé',
  'auth.error.passwordWeak':
    'Min. 8 caractères · 1 majuscule · 1 chiffre · 1 symbole',
  'auth.error.invalidCredentials': 'E-mail ou mot de passe invalide',
  'auth.error.emailNotConfirmed': 'Confirme ton e-mail avant de te connecter',
  'auth.error.generic': 'Une erreur est survenue. Réessaie.',
} as const;

/** The set of valid translation keys, fixed by the FR dictionary. */
export type TranslationKey = keyof typeof fr;
type Dict = Record<TranslationKey, string>;

const en: Dict = {
  'common.appName': 'SpotWar',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'common.season': 'Montréal · Season 01',

  'language.title': 'Choose your\nlanguage',
  'language.subtitle': 'Choisis ta langue',
  'language.step': 'Step 1 / 6',
  'language.french': 'Français',
  'language.frenchRegion': 'Québec',
  'language.english': 'English',
  'language.englishRegion': 'Canada',

  'settings.title': 'Settings',
  'settings.language': 'Language',

  'auth.welcome.tag': 'Montréal · Season 01',
  'auth.welcome.title': 'Claim your\ncity. One run\nat a time.',
  'auth.welcome.body':
    'Turn your kilometres into territory. Conquer neighbourhoods, raid rivals, hold the map till the season ends.',
  'auth.welcome.create': 'Create account',
  'auth.welcome.haveAccount': 'I already have an account',
  'auth.welcome.runnersCount': '4 800 runners in the field',

  'auth.signUp.step': 'Step 2 / 6',
  'auth.signUp.title': 'Enlist',
  'auth.signUp.subtitle': 'Pick a nametag — it’s how rivals will know you.',
  'auth.signUp.nametag': 'Nametag',
  'auth.signUp.nametagPlaceholder': 'maxime_t',
  'auth.signUp.email': 'Email',
  'auth.signUp.emailPlaceholder': 'you@spotwar.run',
  'auth.signUp.password': 'Password',
  'auth.signUp.passwordRule': 'Min 8 chars · 1 uppercase · 1 number · 1 symbol',
  'auth.signUp.terms': 'I agree to the Terms & Privacy Policy.',
  'auth.signUp.submit': 'Create account',
  'auth.signUp.submitting': 'Creating account…',
  'auth.signUp.footer': 'Already enlisted?',
  'auth.signUp.footerLink': 'Log in',

  'auth.strength.weak': 'Weak',
  'auth.strength.fair': 'Fair',
  'auth.strength.strong': 'Strong',

  'auth.login.title': 'Welcome\nback, soldier',
  'auth.login.subtitle': 'The map shifted while you were gone.',
  'auth.login.email': 'Email',
  'auth.login.emailPlaceholder': 'you@spotwar.run',
  'auth.login.password': 'Password',
  'auth.login.submit': 'Log in',
  'auth.login.submitting': 'Logging in…',
  'auth.login.forgot': 'Forgot password?',
  'auth.login.footer': 'New to the war?',
  'auth.login.footerLink': 'Enlist now',

  'auth.verify.tag': 'Verification required',
  'auth.verify.title': 'Check your\ninbox',
  'auth.verify.body':
    'We dispatched a verification link to {email}. Confirm it to deploy.',
  'auth.verify.openMail': 'Open mail app',
  'auth.verify.resend': 'Resend link',
  'auth.verify.resendIn': 'Resend link · {seconds}',
  'auth.verify.resent': 'Email resent.',
  'auth.verify.changeAddress': 'Wrong address?',
  'auth.verify.changeAddressLink': 'Change it',

  'auth.forgot.title': 'Reset\naccess',
  'auth.forgot.body':
    'Enter your email and we’ll send a link to regain command of your account.',
  'auth.forgot.email': 'Email',
  'auth.forgot.emailPlaceholder': 'you@spotwar.run',
  'auth.forgot.submit': 'Send reset link',
  'auth.forgot.submitting': 'Sending…',
  'auth.forgot.sent': 'Link sent. Check your inbox.',
  'auth.forgot.footer': 'Remembered it?',
  'auth.forgot.footerLink': 'Back to login',

  'auth.error.invalidEmail': 'That doesn’t look like a valid email',
  'auth.error.nametagTaken': 'Nametag already taken — try another',
  'auth.error.emailTaken': 'That email is already enlisted',
  'auth.error.passwordWeak': 'Min 8 chars · 1 uppercase · 1 number · 1 symbol',
  'auth.error.invalidCredentials': 'Invalid email or password',
  'auth.error.emailNotConfirmed': 'Confirm your email before logging in',
  'auth.error.generic': 'Something went wrong. Try again.',
};

const dictionaries: Record<Language, Dict> = { fr, en };

/** Persisted under this key in the shared store — same store as the session. */
export const LANGUAGE_STORAGE_KEY = 'spotwar.language';

function isLanguage(value: string | null): value is Language {
  return value === 'fr' || value === 'en';
}

/**
 * First-launch language guess from the device/browser locale (works on web too).
 * `getLocales()` is ordered by user preference; we read the bare `languageCode`
 * (`'fr'`, not `'fr-CA'`) of the top entry and, since EN is our only non-FR
 * language, treat anything that isn't English as the default. Empty list (no
 * locale resolvable) falls through to `DEFAULT_LANGUAGE`. This only seeds the
 * *initial* value — a persisted choice always wins over it (see the mount effect).
 */
export function deviceDefaultLanguage(): Language {
  return getLocales()[0]?.languageCode === 'en' ? 'en' : DEFAULT_LANGUAGE;
}

/** Named `{placeholder}` substitutions passed to `t()` / `translate()`. */
export type TranslationVars = Record<string, string | number>;

/**
 * Resolve a key against a language's dictionary, substituting any `{name}`
 * placeholders from `vars`. Exported as a pure function so it is unit-testable
 * without mounting the provider; the hook wraps it with the current language.
 * Falls back to the key itself if absent (only reachable for a key that bypassed
 * the `TranslationKey` type, e.g. a dynamic string).
 */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const raw = dictionaries[language][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

type I18nContextValue = {
  language: Language;
  /** True until the persisted language has been read on first mount. */
  loading: boolean;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  setLanguage: (language: Language) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { profile, updatePreferredLanguage } = useAuth();
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(true);
  // Which profile's language we've already adopted (by user id). Declared above
  // the mount effect because that effect must defer to a profile that already
  // won the race — the two resolve asynchronously and profile out-ranks device.
  const adoptedProfileId = useRef<string | null>(null);

  // Load the persisted choice once. Until it resolves we render with the default
  // (FR); `loading` lets a consumer hold a splash if it would rather not show FR
  // for a frame before swapping to a persisted EN.
  useEffect(() => {
    let cancelled = false;
    persistedStore
      .getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        // Profile (if a signed-in user's already resolved) out-ranks the device
        // sources, so don't overwrite a language the adoption effect set — the
        // two effects race on a cold start with a restored session.
        if (adoptedProfileId.current) return;
        // A persisted choice wins; otherwise seed from the device/browser locale
        // on first launch (DEFAULT_LANGUAGE stays the final fallback inside the
        // helper). We don't persist this guess — only an explicit setLanguage does.
        setLanguageState(isLanguage(stored) ? stored : deviceDefaultLanguage());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Highest-precedence source: a signed-in user's profile language follows them
  // across devices. We adopt it exactly once per user (keyed by profile id) so a
  // language the user changes *after* login isn't clobbered by the now-stale
  // profile object (we don't refetch it on a local change). The reducer already
  // guarantees `profile` belongs to the live session, so it's safe to apply.
  useEffect(() => {
    if (!profile) {
      // Signed out: reset so the next login re-adopts its profile language.
      adoptedProfileId.current = null;
      return;
    }
    if (adoptedProfileId.current === profile.id) return;
    adoptedProfileId.current = profile.id;
    // `fetchProfile` casts the row rather than validating it, so guard against a
    // NULL/legacy `preferred_language` reaching the dictionary lookup — fall back
    // to whatever the device sources already resolved rather than a broken locale.
    if (isLanguage(profile.preferred_language)) {
      setLanguageState(profile.preferred_language);
    }
  }, [profile]);

  const setLanguage = useCallback(
    async (next: Language) => {
      // Update state first so the UI flips immediately, then persist; a failed
      // write (e.g. SecureStore unavailable) still leaves the in-memory choice.
      setLanguageState(next);
      await persistedStore.setItem(LANGUAGE_STORAGE_KEY, next);
      // Mirror onto the profile so the choice follows the user to other devices.
      // A no-op for a logged-out user (the action guards on the session).
      await updatePreferredLanguage(next);
    },
    [updatePreferredLanguage],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) =>
      translate(language, key, vars),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, loading, t, setLanguage }),
    [language, loading, t, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
