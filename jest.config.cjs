// CommonJS config (.cjs) so Jest can read it without pulling in ts-node.
// Test files are transformed by the ts-jest preset; `isolatedModules` is read
// from tsconfig.json.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
    // Native-only / app-only modules can't load under node — exclude from coverage.
    '!src/persistence/mmkvStore.ts',
    '!src/ui/**',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    'src/domain/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
