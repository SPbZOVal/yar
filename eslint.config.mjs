// ESLint flat config (ESLint 9 + typescript-eslint 8).
// Type-aware linting is intentionally NOT enabled: `tsc --noEmit` already does
// full type checking in a separate CI step, so we keep ESLint fast and focused
// on lint rules. Prettier formatting is checked separately via `prettier --check`
// (eslint-config-prettier disables any stylistic rules that would conflict).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Source lives under src/; tooling config files (jest/eslint/prettier) are not linted.
    ignores: ['node_modules', 'coverage', 'dist', '*.config.*', 'jest.config.cjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);
