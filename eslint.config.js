import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['coverage/**/*', 'dist/**/*', 'dist-backend/**/*', 'node_modules/**/*']
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': [
        'error',
        {
          'paths': [
            {
              'name': '@google/generative-ai',
              'message': 'BẢO MẬT: Không được dùng AI SDK ở Client. Hãy sử dụng src/services/ai-proxy.service.ts thay thế.'
            }
          ]
        }
      ]
    }
  },
  {
    // Override restriction for server files
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  }
];
