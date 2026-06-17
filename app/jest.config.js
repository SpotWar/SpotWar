/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Leave jest-expo's default transformIgnorePatterns in place. @supabase/* ships
  // CJS that runs fine untransformed; whitelisting it for transform pulled a
  // second React resolution into the test bundle and silently no-op'd RTL's
  // renderer, so it is intentionally NOT added here.
};
