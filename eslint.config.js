import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] }
  },
  {
    files: ['src/modules/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['**/application/**', '**/infrastructure/**', '**/interfaces/**', '**/bootstrap/**', 'node:*'],
        paths: ['express', 'jose', 'zod', 'pino']
      }]
    }
  },
  {
    files: ['src/modules/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['**/infrastructure/**', '**/interfaces/**', '**/bootstrap/**'],
        paths: ['express', 'jose', 'zod', 'pino']
      }]
    }
  }
);
