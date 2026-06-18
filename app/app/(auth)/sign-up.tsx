import { AuthPlaceholder } from './_placeholder';

export default function SignUp() {
  return (
    <AuthPlaceholder
      titleKey="auth.signUp.title"
      links={[{ labelKey: 'auth.login.title', href: '/(auth)/login' }]}
    />
  );
}
