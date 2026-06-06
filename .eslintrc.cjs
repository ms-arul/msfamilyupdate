module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'android', 'supabase'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh', 'react', '@typescript-eslint'],
  rules: {
    // React rules
    'react-refresh/only-export-components': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/no-unknown-property': 'off',

    // TypeScript rules
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',

    // General rules
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-useless-escape': 'warn',
    'no-async-promise-executor': 'warn',
    'prefer-const': 'warn',

    // Hooks — keep exhaustive-deps as warning (informational, not blocking)
    'react-hooks/exhaustive-deps': 'warn',
  },
}
