import { defineConfig } from 'vitest/config';

// O projeto raiz (servidor Node) roda só os testes de tests/. O painel React em
// admin/ tem o próprio vitest (jsdom) rodado com `cd admin && npm test`.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
  },
});
