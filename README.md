# Live Avatars

Bonequinhos que reagem à sua live do TikTok (estilo Stream Avatars).

## Primeira vez
1. Instale o [Node.js LTS](https://nodejs.org).
2. Abra o arquivo `config/config.json` e coloque o seu @ do TikTok em `usuarioTikTok`.

## Usar na live

> ⚠️ O recurso "Adicionar link" do TikTok Live Studio **não aceita endereço local**
> (ele exige uma URL pública `https`). Por isso o overlay entra pelo **OBS**, que
> aceita fonte de navegador local com fundo transparente. Dá pra continuar no Live
> Studio usando a **Câmera Virtual** do OBS (não precisa de stream key).

1. Dê **duplo-clique em `iniciar.bat`**. Ele sobe o programa e abre o overlay no navegador.
2. No **OBS**, adicione uma **Fonte de Navegador (Browser Source)** apontando para:
   `http://localhost:8737`
   (largura 1080, altura 1920 — vertical). Faça isso só uma vez.
3. Na cena do OBS, deixe **sua câmera embaixo** e o **overlay por cima** (fundo transparente).
4. No OBS, clique em **"Iniciar Câmera Virtual"**.
5. No **TikTok Live Studio**, na fonte de **Câmera**, selecione **"OBS Virtual Camera"**.
6. Comece sua live normalmente. Os bonequinhos aparecem sozinhos por cima da câmera.

*(Alternativa: transmitir direto do OBS pro TikTok — porém exige a stream key do TikTok,
que nem toda conta libera. A Câmera Virtual evita isso.)*

## Testar sem estar ao vivo
Rode o modo simulador (gera eventos falsos):
```
npm run sim
```
e abra `http://localhost:8737`.

## Ajustes (`config/config.json`)
- `usuarioTikTok` — seu @ (sem o @).
- `limiteAvatares` — máximo de bonequinhos na tela.
- `inatividadeSegundos` — tempo sem interagir até o bonequinho sair.
- `volumeEfeitos` — 0 a 1. (Obs.: som ainda não implementado nesta versão; este ajuste ainda não tem efeito.)
- `porta` — porta local (padrão 8737).
