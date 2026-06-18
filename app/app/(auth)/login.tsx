import { AuthPlaceholder } from './_placeholder';

export default function Login() {
  return (
    <AuthPlaceholder
      titleKey="auth.login.title"
      links={[
        { labelKey: 'auth.login.forgot', href: '/(auth)/forgot-password' },
        { labelKey: 'auth.signUp.title', href: '/(auth)/sign-up' },
      ]}
    />
  );
}
