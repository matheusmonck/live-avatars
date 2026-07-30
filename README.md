# Live Avatars

Bonequinhos que reagem à sua live do TikTok (estilo Stream Avatars).

## Primeira vez
1. Instale o [Node.js LTS](https://nodejs.org).
2. Abra o arquivo `config/config.json` e coloque o seu @ do TikTok em `usuarioTikTok`.

## Usar na live
1. Dê **duplo-clique em `iniciar.bat`**. Ele sobe o programa e abre o overlay no navegador.
2. No **TikTok Live Studio**, adicione uma **Fonte de Navegador** apontando para:
   `http://localhost:8737`
   (largura 1080, altura 1920 — vertical). Faça isso só uma vez.
3. Comece sua live normalmente. Os bonequinhos aparecem sozinhos.

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
