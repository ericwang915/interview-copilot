'use strict';

// ESLint flat config. Pragmatic rules: real bugs are errors, style is warn.

const baseRules = {
  'no-undef': 'error',
  'no-unused-vars': [
    'warn',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-var': 'error',
  'prefer-const': 'warn',
  eqeqeq: ['warn', 'smart'],
  'no-console': 'off',
};

const timers = {
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

const webApis = {
  fetch: 'readonly',
  TextDecoder: 'readonly',
  TextEncoder: 'readonly',
  AbortController: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  WebSocket: 'readonly',
  Blob: 'readonly',
  console: 'readonly',
};

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  globalThis: 'readonly',
  ...timers,
  ...webApis,
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  AudioContext: 'readonly',
  AudioWorkletNode: 'readonly',
  MediaStream: 'readonly',
  requestAnimationFrame: 'readonly',
  ...timers,
  ...webApis,
};

const workletGlobals = {
  AudioWorkletProcessor: 'readonly',
  registerProcessor: 'readonly',
  sampleRate: 'readonly',
  currentTime: 'readonly',
};

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'build/**', '.electron-cache/**'] },
  {
    files: ['src/main/**/*.js', 'test/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: nodeGlobals },
    rules: baseRules,
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...browserGlobals, ...workletGlobals },
    },
    rules: baseRules,
  },
];
