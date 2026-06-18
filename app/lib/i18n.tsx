import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { persistedStore } from './storage';

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
  'language.title': 'Choisis ta langue',
  'language.french': 'Français',
  'language.english': 'English',
  'auth.welcome.title': 'Bienvenue',
  'auth.signUp.title': 'Créer un compte',
  'auth.signUp.nametag': 'Pseudo',
  'auth.signUp.email': 'E-mail',
  'auth.signUp.password': 'Mot de passe',
  'auth.signUp.submit': "S'inscrire",
  'auth.login.title': 'Connexion',
  'auth.login.submit': 'Se connecter',
  'auth.login.forgot': 'Mot de passe oublié ?',
  'auth.verify.title': 'Vérifie ton e-mail',
  'auth.verify.body':
    "Nous t'avons envoyé un lien de confirmation. Clique dessus pour activer ton compte.",
  'auth.verify.resend': 'Renvoyer l’e-mail',
  'auth.forgot.title': 'Réinitialiser le mot de passe',
  'auth.forgot.submit': 'Envoyer le lien',
} as const;

/** The set of valid translation keys, fixed by the FR dictionary. */
export type TranslationKey = keyof typeof fr;
type Dict = Record<TranslationKey, string>;

const en: Dict = {
  'common.appName': 'SpotWar',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.loading': 'Loading…',
  'language.title': 'Choose your language',
  'language.french': 'Français',
  'language.english': 'English',
  'auth.welcome.title': 'Welcome',
  'auth.signUp.title': 'Create an account',
  'auth.signUp.nametag': 'Nametag',
  'auth.signUp.email': 'Email',
  'auth.signUp.password': 'Password',
  'auth.signUp.submit': 'Sign up',
  'auth.login.title': 'Log in',
  'auth.login.submit': 'Log in',
  'auth.login.forgot': 'Forgot password?',
  'auth.verify.title': 'Verify your email',
  'auth.verify.body':
    'We sent you a confirmation link. Tap it to activate your account.',
  'auth.verify.resend': 'Resend email',
  'auth.forgot.title': 'Reset password',
  'auth.forgot.submit': 'Send link',
};

const dictionaries: Record<Language, Dict> = { fr, en };

/** Persisted under this key in the shared store — same store as the session. */
export const LANGUAGE_STORAGE_KEY = 'spotwar.language';

function isLanguage(value: string | null): value is Language {
  return value === 'fr' || value === 'en';
}

/**
 * Resolve a key against a language's dictionary. Exported as a pure function so
 * it is unit-testable without mounting the provider; the hook wraps it with the
 * current language. Falls back to the key itself if absent (only reachable for a
 * key that bypassed the `TranslationKey` type, e.g. a dynamic string).
 */
export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key] ?? key;
}

type I18nContextValue = {
  language: Language;
  /** True until the persisted language has been read on first mount. */
  loading: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (language: Language) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(true);

  // Load the persisted choice once. Until it resolves we render with the default
  // (FR); `loading` lets a consumer hold a splash if it would rather not show FR
  // for a frame before swapping to a persisted EN.
  useEffect(() => {
    let cancelled = false;
    persistedStore
      .getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isLanguage(stored)) setLanguageState(stored);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    // Update state first so the UI flips immediately, then persist; a failed
    // write (e.g. SecureStore unavailable) still leaves the in-memory choice.
    setLanguageState(next);
    await persistedStore.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(language, key),
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
