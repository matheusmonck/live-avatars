# Overlay 9:16 vertical (1080×1920) como padrão

Data: 2026-08-01
Status: aprovado.
Contexto: lives do TikTok são majoritariamente verticais (9:16, 1080×1920). Queremos que esse seja o padrão.

## Constatação

O overlay **já é agnóstico de resolução**: `scene.js` usa `resizeTo: window` e posiciona tudo por
`app.screen.width/height`; `index.html` tem `#stage { inset: 0 }` preenchendo a janela. A "resolução"
é definida pela **fonte de navegador do OBS**. O `README` já instrui **1080×1920 vertical** (passo do OBS).

Logo, 9:16 **já funciona nativamente** — basta a fonte do OBS estar em 1080×1920 (como o README diz).

## Decisão

- **Nenhuma mudança no código do overlay.** Fixar um canvas 9:16 quebraria o "preencher a fonte do OBS";
  e ajustes finos de layout (posição do chão, escala) são decisões visuais que não dá pra verificar aqui
  sem olhar a tela — risco de piorar. Se o usuário quiser tuning vertical específico (avatares maiores,
  chão mais alto), é uma frente separada com direção definida por ele. Além disso, a **escala por sprite**
  já é editável (frente 4), cobrindo "avatares maiores".
- **Documentação:** reforçar no README que o overlay se adapta ao tamanho da fonte e que **1080×1920
  (9:16 vertical)** é o padrão recomendado. Aproveitar pra atualizar o README com as features de hoje
  (aba Usuários + VIP, regra "só quem interage" + corações, edição de escala de sprite) — o README estava
  desatualizado (dizia que o gerenciador de sprites "vem numa próxima versão").

## Escopo

- **Muda:** `README.md` (seção do OBS + Painel + Ajustes).
- **Fora:** qualquer mudança no `src/overlay/*` (o overlay já suporta 9:16); tuning visual de layout.
