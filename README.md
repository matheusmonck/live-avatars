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
2. No **Painel** (`http://localhost:8737/admin`): coloque seu **@ do TikTok**, cole a
   **chave do Euler Stream**, e — **quando você estiver ao vivo** — clique em **Iniciar**.
   O status mostra *conectado / offline / erro*.
3. No **OBS**, adicione uma **Fonte de Navegador (Browser Source)** apontando para o **overlay**:
   `http://localhost:8737`
   (largura 1080, altura 1920 — vertical). Faça isso só uma vez.
4. Na cena do OBS, deixe **sua câmera embaixo** e o **overlay por cima** (fundo transparente).
5. No OBS, clique em **"Iniciar Câmera Virtual"**.
6. No **TikTok Live Studio**, na fonte de **Câmera**, selecione **"OBS Virtual Camera"**.
7. Comece sua live. Clique **Iniciar** no Painel. Os bonequinhos aparecem por cima da câmera.

*(Alternativa: transmitir direto do OBS pro TikTok — porém exige a stream key do TikTok,
que nem toda conta libera. A Câmera Virtual evita isso.)*

## O Painel de controle (`/admin`)
Abra `http://localhost:8737/admin`:
- **Conexão** — botão *Iniciar/Parar* e o *status ao vivo* (conectado / offline / reconectando / erro).
- **Chave de API** — cole a chave do Euler Stream (fica salva localmente; nunca é exibida de volta).
- **Configuração** — @ do TikTok, limite de avatares, inatividade, volume, porta.

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
- `inatividadeSegundos` — tempo sem interagir até o bonequinho sair.
- `volumeEfeitos` — 0 a 1. (Obs.: som ainda não implementado; sem efeito por ora.)
- `porta` — porta local (padrão 8737).

A chave de API fica em `config/config.local.json` (criado pelo Painel) — **não versionado, não compartilhe**.

## Personagens (sprites)
Os avatares usam sprites definidos em `src/overlay/characters.json` (padrão, CC0) e
`src/overlay/characters.local.json` (os seus, **locais/não versionados**). Guia de como
adicionar: `docs/adicionar-sprites.md`. *(Um gerenciador visual de sprites no Painel vem numa próxima versão.)*
