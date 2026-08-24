# Contribuindo para o Live Avatars

Obrigado por querer ajudar o projeto. Este guia cobre o ambiente de desenvolvimento, as regras de contribuicao e como abrir uma boa issue ou pull request.

## Setup

Requisitos:

- Node.js LTS
- npm

Instale e rode localmente:

```bash
npm install
npm run dev
```

Abra o Painel em `http://localhost:8737/admin` e o overlay em `http://localhost:8737`.

Para testar sem estar ao vivo, use o simulador:

```bash
npm run sim
```

## Testes

Antes de abrir um pull request, rode a suite completa:

```bash
npm test
```

Se o seu cambio afeta comportamento ao vivo, use o modo simulador e descreva no PR como reproduzir a situacao.

## Seguranca e credenciais

- A chave do Euler Stream fica em `config/config.local.json`, criado pelo Painel.
- Nunca versione `config/config.local.json`, chaves, tokens ou dados reais de uma live.
- A chave nunca deve aparecer em issues, pull requests, logs ou screenshots.

## Como contribuir

### Issues

- Descreva o comportamento esperado e o comportamento atual.
- Inclua passos para reproduzir, versao do Node.js e, quando possivel, logs sem dados sensiveis.
- Use os templates de issue para reportar bugs e pedir melhorias.

### Pull requests

- Faca um fork, crie uma branch descritiva e abra um PR para `main`.
- Mantenha o PR pequeno e focado em um problema.
- Escreva commits claros e mensagens que expliquem o motivo da mudanca.
- Rode `npm test` e informe o resultado no PR.
- Nao inclua mudancas de configuracao local ou credenciais.

## Estrutura rapida

- `src/server/` — servidor, conexao e API.
- `src/overlay/` — overlay, sprites e logica de personagens.
- `tests/` — testes com Vitest.
- `docs/` — guias de uso e manutencao.

## Codigo de conduta

Todos os espacos do projeto seguem o [Codigo de Conduta](CODE_OF_CONDUCT.md).
