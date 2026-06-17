import { Redirect } from 'expo-router';

import { ROUTES } from '../lib/gate';

/**
 * The bare `/` route. The gate in `_layout` handles auth-based redirects once
 * the session resolves, but a concrete index route still needs to render
 * *something* on the very first frame — send it to welcome; the gate corrects
 * an already-authenticated user on the next tick.
 */
export default function Index() {
  return <Redirect href={ROUTES.welcome} />;
}
