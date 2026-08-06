# Live Avatars

Bonequinhos que reagem à sua live do TikTok (estilo Stream Avatars).

## Primeira vez
1. Instale o [Node.js LTS](https://nodejs.org).
2. Crie uma **chave grátis** no [Euler Stream](https://www.eulerstream.com). Ela é necessária
   para conectar na sua live do TikTok — você cola ela no **Painel** (passo abaixo).

## Usar na live

> ⚠️ O recurso "Adicionar link" do TikTok Live Studio **não aceita endereço local**
> (ele exige uma URL pública `https`). Por isso o overlay entra pelo **OBS**, que
> aceita fonte de navegador local com fundo transparente. Dá pra continuar no Live
> Studio usando a **Câmera Virtual** do OBS (não precisa de stream key).

1. Dê **duplo-clique em `iniciar.bat`**. Ele sobe o programa e abre o **Painel** no navegador.
   *(macOS/Linux, ou sem o `.bat`: rode `npm install` uma vez e depois `npm run dev`, então abra `http://localhost:8737/admin`.)*
2. No **Painel** (`http://localhost:8737/admin`): coloque seu **@ do TikTok**, cole a
   **chave do Euler Stream**, e — **quando você estiver ao vivo** — clique em **Iniciar**.
   O status mostra *conectado / offline / erro*.
3. No **OBS**, adicione uma **Fonte de Navegador (Browser Source)** apontando para o **overlay**:
   `http://localhost:8737`
   (largura **1080**, altura **1920** — vertical 9:16, o padrão das lives do TikTok). Faça isso só uma vez.
   O overlay **se adapta ao tamanho da fonte** e mantém a proporção: o **mesmo** overlay serve
   **vertical 1080×1920** e **horizontal 1920×1080** — muda só a dimensão da fonte no OBS (sem 2º servidor).
4. Na cena do OBS, deixe **sua câmera embaixo** e o **overlay por cima** (fundo transparente).
5. No OBS, clique em **"Iniciar Câmera Virtual"**.
6. No **TikTok Live Studio**, na fonte de **Câmera**, selecione **"OBS Virtual Camera"**.
7. Comece sua live. Clique **Iniciar** no Painel. Os bonequinhos aparecem por cima da câmera.

*(Alternativa: transmitir direto do OBS pro TikTok — porém exige a stream key do TikTok,
que nem toda conta libera. A Câmera Virtual evita isso.)*

## O Painel de controle (`/admin`)
Abra `http://localhost:8737/admin`:
- **Conexão** — botão *Iniciar/Parar* e o *status ao vivo* (conectado / offline / reconectando / erro).
- **Configuração** — @ do TikTok, chave do Euler Stream (salva localmente; nunca é exibida de volta),
  limite de avatares, inatividade, volume, porta, **escala global dos avatares**, **"só quem interage"** e **corações para aparecer**.
- **Sprites** — adicionar/ocultar/remover personagens e **ajustar a escala** de qualquer sprite (padrão ou seu).
- **Terreno** — enviar/escolher o chão de fundo e ajustar **posição (offset)** e **escala** da faixa.
- **Usuários** — fixar o **sprite** de um @ e marcar **VIP** (coroa 👑 + aparece sempre).

> **Edições aplicam ao vivo:** mudanças no Painel refletem no overlay **sem recarregar a fonte no OBS**
> (a única exceção é a **Porta**, que reinicia o servidor). Ótimo pra calibrar tamanho/terreno durante a live.

> **Importante:** o programa **não conecta sozinho** ao ligar (modo idle). Você inicia a
> conexão pelo Painel, e a conta-alvo precisa estar **ao vivo naquele momento**.

## Testar sem estar ao vivo
Modo simulador (gera eventos falsos, sem TikTok):
```
npm run sim
```
e abra o overlay em `http://localhost:8737`.

## Ajustes
Pelo **Painel** (recomendado) ou editando `config/config.json`:
- `usuarioTikTok` — seu @ (sem o @).
- `limiteAvatares` — máximo de bonequinhos na tela.
- `escalaAvatares` — tamanho global dos avatares (padrão 2; ajustável ao vivo no Painel).
- `inatividadeSegundos` — tempo sem interagir até o bonequinho sair.
- `volumeEfeitos` — 0 a 1. (Obs.: som ainda não implementado; sem efeito por ora.)
- `soQuemInterage` — se `true` (padrão), só aparece quem comenta, manda presente ou acumula corações.
- `coracoesParaAparecer` — quantos corações somados fazem o avatar aparecer (padrão 10).
- `porta` — porta local (padrão 8737).

A chave de API fica em `config/config.local.json` (criado pelo Painel) — **não versionado, não compartilhe**.

## Personagens (sprites)
Os avatares usam sprites definidos em `src/overlay/characters.json` (11 personagens
padrão de **Luis Zuno / @ansimuz** — ver [Créditos](#créditos)) e
`src/overlay/characters.local.json` (os seus, **locais/não versionados**). Adicione, oculte, remova
e ajuste a escala pela aba **Sprites** do Painel; fixe o sprite/VIP de um @ pela aba **Usuários**.
Guia manual: [`docs/adicionar-sprites.md`](docs/adicionar-sprites.md).

## Licença
Código sob licença [MIT](LICENSE). A arte dos sprites padrão tem licença própria
(uso livre pessoal/comercial) — ver [Créditos](#créditos).

## Créditos
- **Sprites dos personagens:** Luis Zuno ([@ansimuz](https://ansimuz.itch.io/)), do
  pacote *"A Meta Data Game"* (https://ansimuz.itch.io/a-meta-data-game).
- Detalhes e demais créditos em [`CREDITS.md`](CREDITS.md).
