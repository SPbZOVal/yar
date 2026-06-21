// Two jest projects: the pure-TS core under ts-jest/node (domain + store + persistence) and the
// RN screens under the jest-expo preset (RNTL). Coverage config stays at the root so a single
// `jest --coverage` aggregates both; the threshold is enforced on `src/domain`.
const expo = require('jest-expo/jest-preset');

// Widen jest-expo's transform allowlist so our ESM deps (zustand, immer) are transpiled too.
const uiTransformIgnore = (expo.transformIgnorePatterns ?? []).map((p) =>
  typeof p === 'string' && p.includes('node_modules/(?!')
    ? p.replace(/\)\)\s*$/, '|zustand|immer))')
    : p,
);

/** @type {import('jest').Config} */
const core = {
  displayName: 'core',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/ui/'],
};

const ui = {
  ...expo,
  displayName: 'ui',
  testMatch: ['<rootDir>/src/ui/**/*.test.tsx'],
  transformIgnorePatterns: uiTransformIgnore,
  // Resolve react-native-worklets to its non-native files so Reanimated 4 loads under jest.
  resolver: '<rootDir>/jest.resolver.ui.cjs',
  // setupFilesAfterEnv (not setupFiles) so jest-expo's own RN setup is preserved.
  setupFilesAfterEnv: [...(expo.setupFilesAfterEnv ?? []), '<rootDir>/jest.setup.ui.js'],
  // The screens load domain/store/persistence code, so without this the ui project
  // (babel/jest-expo) would instrument those pure-TS files too — and merging them with
  // the `core` project's ts-jest instrumentation corrupts the report (domain branch/
  // function coverage collapses well below its real value). Coverage of everything
  // outside src/ui is owned solely by `core`; skip it here.
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/(?!ui/)'],
};

module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/persistence/mmkvStore.ts',
    '!src/ui/**',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    'src/domain/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  projects: [core, ui],
};
