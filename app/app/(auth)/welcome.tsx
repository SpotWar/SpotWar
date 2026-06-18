import { AuthPlaceholder } from './_placeholder';

export default function Welcome() {
  return (
    <AuthPlaceholder
      titleKey="auth.welcome.title"
      links={[
        { labelKey: 'language.title', href: '/(auth)/language' },
        { labelKey: 'auth.signUp.title', href: '/(auth)/sign-up' },
        { labelKey: 'auth.login.title', href: '/(auth)/login' },
      ]}
    />
  );
}
