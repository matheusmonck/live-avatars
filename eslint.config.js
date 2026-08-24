import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// Flat config (ESLint v9). Cobre o servidor Node (src/server), o overlay do
// browser (src/overlay) e os testes. O painel em admin/ é TypeScript/React com
// tooling próprio (tsc) e fica fora daqui por enquanto.
export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'admin/**', 'coverage/**', '**/*.min.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // catch vazio é usado de propósito em várias operações best-effort
      // (fechar socket, ler config/pasta opcional). Permitido no projeto.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // Node: servidor, testes e arquivos de config na raiz.
  {
    files: ['src/server/**/*.js', 'tests/**/*.js', 'vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // Browser: overlay (PixiJS é carregado como global via <script>).
  {
    files: ['src/overlay/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, PIXI: 'readonly' },
    },
  },
  // Desliga regras de estilo que conflitam com o Prettier (deve ficar por último).
  prettier,
];
