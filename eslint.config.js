// eslint.config.js
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'safaikart-website/**',
      'functions/**',
      'node_modules/**',
      '.expo/**',
      'production_artifacts/**',
      'scripts/**',
      'tests/e2e/**'
    ],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]);
