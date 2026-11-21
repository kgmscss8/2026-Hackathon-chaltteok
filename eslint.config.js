import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '.vercel', '.taskmaster', '.claude', 'chalddeok-prd-split'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['api/**/*.ts', 'lib/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['api/**/*.ts', 'lib/**/*.ts'],
    rules: {
      // 서버·공통 코드에서는 민원 내용이 로그에 남지 않도록 console 사용 금지
      'no-console': 'error',
      // Vercel 함수는 Node ESM으로 돌기 때문에 상대 경로 import에 확장자가 필요하다.
      // 빠지면 로컬 테스트는 통과해도 배포에서 500으로 죽는다(PR #7).
      'no-restricted-syntax': [
        'error',
        ...['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].map((node) => ({
          selector: `${node}[source.value=/^\\.\\.?\\//]:not([source.value=/\\.(js|json)$/])`,
          message:
            "api/·lib/의 상대 경로 import는 '.js'로 끝나야 합니다. 예: '../lib/schema.js' (없으면 Vercel에서 500)",
        })),
      ],
    },
  },
  prettier,
);
