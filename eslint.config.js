// eslint.config.js
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: [
      '**/node_modules/**',
      'headless/**',
      'node_modules/**',
      'pdf-parser/**',
      'share/**',
      'src-tauri/**',
      'summary-rs/**',
      'target/**',
      '**/dist/**',
      '**/dist-electron/**',
    ],
  },
  {
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // 浏览器环境
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
        // Node.js 环境
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import/no-unresolved': [
        'error',
        {
          commonjs: true,
          caseSensitive: true,
          ignore: ['electron', '\\.s?css$'],
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': [
        1,
        {
          argsIgnorePattern: '^_|^config$',
        },
      ],
      'react-refresh/only-export-components': ['error'],
      'prefer-const': ['error'], // 鼓励使用 const 而非 let
      eqeqeq: ['error', 'always'], // 强制使用 === 代替 ==
      '@typescript-eslint/consistent-type-imports': ['error'], // 统一类型导入风格
    },
  },
]
