// RTL doesn't auto-unmount between tests in this jest-expo setup, so trees pile
// up and the next test's `getByTestId` can't find its (freshly rendered) nodes.
// Unmount, then let any still-pending microtasks (the i18n persisted-load and
// the auth provider's async effects) settle before the next test renders —
// otherwise a promise from the prior test resolves mid-render and React refuses
// to commit ("overlapping act() calls").
const { cleanup } = require('@testing-library/react-native');
afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setImmediate(resolve));
});

// Stub lucide-react-native so tests don't load react-native-svg's native
// renderer (irrelevant to behavior, and a needless second dependency tree in the
// test bundle). The icons are purely decorative — behavior tests assert on
// labels/testIDs, not glyphs — so a proxy that returns a no-op <View> for any
// icon name is a faithful stand-in.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Drop the icon-specific props (size/color/strokeWidth/name) and keep only
  // testID/style, so the stub is a plain <View> that won't warn on unknown props.
  const Stub = ({ testID, style }) => React.createElement(View, { testID, style });
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return Stub;
      },
    },
  );
});

// expo-linking's createURL needs the expo-constants manifest at runtime (a
// scheme to build deep links from), which jest doesn't provide — so it throws.
// Mock it to a deterministic scheme so the redirect helpers resolve to a stable
// `spotwar://<path>` in tests.
jest.mock('expo-linking', () => ({
  createURL: (path) => `spotwar://${String(path).replace(/^\//, '')}`,
}));

// expo-secure-store is a native module with no JS fallback under jest; mock it
// with an in-memory map so storage.ts's native branch is exercisable in tests.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
  };
});
