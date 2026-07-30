# Live Avatars — Design (estilo Stream Avatars para TikTok Live)

**Data:** 2026-07-29
**Status:** Aprovado (brainstorming) — pronto para plano de implementação

## Objetivo

Criar um programa que exibe bonequinhos ("avatares") na live do TikTok que reagem
automaticamente ao que os espectadores fazem (comentar, entrar, curtir, seguir,
mandar presente, compartilhar) — inspirado no Stream Avatars, adaptado para o TikTok.

## Contexto e restrições

- **Transmissão:** a live é feita pelo **TikTok Live Studio (PC / Windows)**, que
  permite adicionar fontes (inclusive fonte de navegador / captura de janela).
- **Captação de eventos:** feita pela biblioteca open-source
  [`TikTok-Live-Connector`](https://github.com/zerodytrash/TikTok-Live-Connector),
  que conecta pelo `@` da streamer em tempo real, **sem precisar de API oficial**.
  Independe do método de transmissão.
- **Público-alvo de operação:** a streamer não é técnica → iniciar precisa ser
  simples (atalho de 1 clique), sem mexer em terminal.
- **Orientação da tela:** live vertical (9:16).

## Experiência (decisões do brainstorming)

- **Modelo:** avatares **reativos automáticos** — sem comandos no chat. Cada
  espectador que interage ganha/movimenta um bonequinho que reage sozinho.
- **Estilo visual:** **misto blob + pixel art**. Ao aparecer, cada espectador
  recebe aleatoriamente um dos dois estilos, fixo durante a sessão (pra se
  reconhecer). Cada bonequinho mostra o `@` embaixo (pequeno).
- **Layout:** **chão + zona de destaque**.
  - Faixa de "chão" no rodapé: bonequinhos andam devagar de um lado a outro.
  - Zona de destaque (centro-alto): acende só quando chega **presente**, com o
    bonequinho do doador saltando pro centro por alguns segundos.

## Arquitetura

Dois processos locais + o Live Studio:

```
  TikTok (live)
        │  eventos em tempo real
        ▼
  ┌──────────────────────────┐
  │  Backend (Node.js)       │  connector + bridge
  │  - TikTok-Live-Connector │
  │  - normaliza eventos     │
  │  - servidor WebSocket    │
  └───────────┬──────────────┘
              │  eventos (JSON) via WebSocket local
              ▼
  ┌──────────────────────────┐
  │  Overlay (página web)    │  PixiJS
  │  - motor de cena         │
  │  - gerenciador de avatares│
  │  - reações/animações     │
  └───────────┬──────────────┘
              │  fonte de navegador
              ▼
  ┌──────────────────────────┐
  │  TikTok Live Studio      │
  └──────────────────────────┘
```

## Componentes

Cada componente tem uma responsabilidade única e interface bem definida.

### `connector`
- Conecta na live via `TikTok-Live-Connector` usando o `@` do `config`.
- Traduz os eventos brutos do TikTok num formato interno limpo e estável, ex:
  ```json
  { "tipo": "presente", "usuario": "@fulano", "nome": "Fulano",
    "fotoUrl": "...", "valorMoedas": 1, "presente": "rosa" }
  ```
- Não sabe nada sobre renderização.

### `bridge` (servidor WebSocket)
- Servidor local que empurra os eventos normalizados pro overlay.
- Reconexão do lado do cliente: se o overlay recarregar, reconecta sozinho.

### `overlay` (página web capturada pelo Live Studio)
- **motor de cena (PixiJS):** palco vertical, chão, zona de destaque.
- **gerenciador de avatares:** cria/remove bonequinhos, decide estilo
  (blob/pixel), controla limite máximo e saída por inatividade, mantém o mapa
  `usuario → avatar`.
- **reações:** cada tipo de evento dispara uma animação
  (pulo, coração, confete, destaque, estrelinhas).

### `config`
- Arquivo simples editável pela streamer:
  - `usuarioTikTok` (o `@`)
  - `limiteAvatares` (padrão ~15–20)
  - `inatividadeSegundos` (padrão ~120–180)
  - `volumeEfeitos`

## Fluxo de dados

1. `connector` recebe evento do TikTok → normaliza.
2. `bridge` envia o evento normalizado (JSON) pelo WebSocket.
3. `overlay` recebe → `gerenciador de avatares` localiza/cria o avatar do usuário
   → dispara a `reação` correspondente.

## Mapeamento de reações

| Evento | Reação do bonequinho |
|---|---|
| 💬 Comentário | Se não existe, entra andando e acena; se existe, dá um pulinho. |
| 👋 Entrar na live | Aparece caminhando pra dentro da cena. |
| ❤️ Curtida | Solta coraçõezinhos subindo. |
| ⭐ Seguir | Confete + faixa "novo seguidor: @fulano 💖". |
| 🎁 Presente | Salta pra zona de destaque; **efeito escala com o valor** (rosa = pequeno/rápido; leão/foguete = explosão de confete, mais longo). |
| 🔁 Compartilhar | Estrelinhas / efeito de onda. |

## Regras de tela ("não lotar")
- Máximo ~15–20 avatares visíveis (config).
- Quem fica ~2–3 min sem interagir sai andando (config).
- Enxurrada de eventos (muitos comentários/curtidas juntos): agrupar/limitar
  (throttle) pra não travar a animação.

## Configuração e operação (pra streamer)
1. Duplo-clique em **`iniciar.bat`** → sobe backend + overlay.
2. No Live Studio, adicionar **uma vez** a fonte de navegador em
   `http://localhost:PORTA`.
3. Abrir a live normalmente. O `@` fica salvo no `config`.

## Tratamento de erros
- **Live offline / `@` errado:** avisa e fica tentando reconectar até a live começar.
- **Queda de conexão:** reconecta automático; overlay não trava nem some.
- **Overlay recarregado:** reconecta ao WebSocket e recomeça limpo (sem "fantasmas").
- **Enxurrada de eventos:** throttle/agrupamento.

## Estratégia de testes
- **Simulador de eventos:** modo que dispara comentários/presentes/follows falsos
  pra testar animações **sem estar ao vivo** (essencial pro desenvolvimento e pra
  demonstrar antes).
- Testes automatizados na lógica: normalização de eventos, regras de
  limite/inatividade, throttle.

## Escopo

### MVP
- Conexão com a live (via `@`).
- Os 6 tipos de reação.
- Layout chão + zona de destaque.
- Estilo misto blob/pixel.
- Limite de avatares + saída por inatividade.
- `config` editável.
- Simulador de eventos.
- Launcher `iniciar.bat`.

### Fora de escopo (YAGNI — possível depois)
- Comandos no chat (`!dançar`, etc.).
- Minigames / apostas.
- Foto do perfil como avatar.
- Personalização por espectador.
- Ranking de quem mais mandou presente.
- Empacotamento como `.exe` (Electron).

## Stack técnica
- **Backend:** Node.js + `TikTok-Live-Connector` + `ws` (WebSocket).
- **Overlay:** HTML + PixiJS (render 2D WebGL, bom pra muitos sprites e animação fluida).
- **Launcher:** script `.bat` (Windows).

## Estrutura de pastas (proposta)
```
live-avatars/
  config/            # config editável pela streamer
  connector/         # conexão + normalização de eventos
  bridge/            # servidor WebSocket
  overlay/           # página + PixiJS (cena, avatares, reações)
  simulador/         # gerador de eventos falsos
  iniciar.bat        # launcher de 1 clique
  docs/
```
