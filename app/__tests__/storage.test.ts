/**
 * storage.ts picks its backend off `Platform.OS` at module load, so each case
 * mocks `react-native` to a chosen OS, isolates the module registry, then
 * re-imports storage so it re-reads the platform.
 */
const loadStore = (os: 'web' | 'ios') => {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../lib/storage')
    .persistedStore as typeof import('../lib/storage').persistedStore;
};

afterEach(() => {
  jest.dontMock('react-native');
});

describe('persistedStore — web', () => {
  it('reads and writes through localStorage', async () => {
    // The RN test environment has no `localStorage`; inject a minimal one so the
    // web branch has its real backend to exercise.
    const backing = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    };

    const store = loadStore('web');
    await store.setItem('k', 'v');
    expect(await store.getItem('k')).toBe('v');
    await store.removeItem('k');
    expect(await store.getItem('k')).toBeNull();

    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

describe('persistedStore — native', () => {
  it('reads and writes through SecureStore', async () => {
    const store = loadStore('ios');
    // The SecureStore mock is re-created by resetModules, so re-require it from
    // the same fresh registry the store sees.
    const SecureStore = require('expo-secure-store');
    await store.setItem('token', 'abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'abc');
    expect(await store.getItem('token')).toBe('abc');
    await store.removeItem('token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
  });
});
