module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      // Ignore enum members as they're exports
      args: 'after-used',
      vars: 'all',
      ignoreRestSiblings: true,
    }],
    'prefer-const': 'error',
    'no-console': 'off', // Allow console.log for now
  },
  env: {
    node: true,
    es2022: true,
  },
  // Ignore enum member unused vars
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'no-unused-vars': 'off', // TypeScript handles this better
      },
    },
  ],
};