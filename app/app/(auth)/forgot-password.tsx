import { AuthPlaceholder } from './_placeholder';

export default function ForgotPassword() {
  return (
    <AuthPlaceholder
      titleKey="auth.forgot.title"
      links={[{ labelKey: 'auth.login.title', href: '/(auth)/login' }]}
    />
  );
}
