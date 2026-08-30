// eslint.config.js — flat config (required by ESLint 9+).
//
// Replaces the old .eslintrc.json, which ESLint 9 no longer reads by
// default. Kept the same rule set / env split that .eslintrc.json had:
// browser globals for site/js, node globals for scripts + test, and
// eslint-config-prettier last so formatting rules never fight Prettier.

import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const rules = {
  'no-console': 'warn',
  'no-debugger': 'warn',
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'no-var': 'error',
  'prefer-const': 'warn',
  eqeqeq: ['warn', 'always'],
};

export default [
  js.configs.recommended,
  {
    files: ['site/js/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules,
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules,
  },
  {
    files: ['scripts/debug/**/*.{mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...rules,
      'no-console': 'warn', // Debug scripts are verbose, console is OK
    },
  },
  {
    files: ['api/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules,
  },
  {
    // Playwright evaluate callbacks run in browser context, not Node
    // These files contain page.evaluate(() => { ... }) which runs in the browser
    files: [
      'scripts/create-article.mjs',
      'scripts/customize-escal-theme.mjs',
      'scripts/probe-escal-fields.mjs',
      'scripts/probe-rubriques.mjs',
      'scripts/manage-article-status.mjs',
      'scripts/list-draft-articles.mjs',
      'scripts/debug/**/*.mjs',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules,
  },
  {
    // test/*.test.mjs run under plain Node but install a happy-dom Window's
    // globals (document, localStorage, ...) onto the global object to shim
    // renderCard()/parseJson(), so they need both node and browser globals.
    files: ['test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules,
  },
  prettierConfig,
];
