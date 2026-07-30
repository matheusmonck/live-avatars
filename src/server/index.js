import { UserOfflineError } from 'tiktok-live-connector';
import { loadConfig } from './config.js';
import { createStaticServer } from './static-server.js';
import { createBridge } from './bridge.js';
import { createConnector } from './connector.js';
import { iniciarSimulador } from './simulator.js';

const MODO_SIM = process.argv.includes('--sim');

function main() {
  const cfg = loadConfig();
  const http = createStaticServer();
  const bridge = createBridge(http, (ws) => {
    ws.send(JSON.stringify({
      tipo: 'config',
      limiteAvatares: cfg.avatarLimit,
      inatividadeSegundos: cfg.inactivitySeconds,
    }));
  });

  http.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  A porta ${cfg.port} já está em uso. Feche a outra janela do Live Avatars (ou mude "porta" no config/config.json) e tente de novo.\n`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGINT', () => {
    console.log('\n  Encerrando Live Avatars...');
    bridge.close();
    http.close();
    process.exit(0);
  });

  http.listen(cfg.port, () => {
    console.log(`\n  Live Avatars no ar 🎉`);
    console.log(`  Overlay:  http://localhost:${cfg.port}`);
    console.log(`  (adicione essa URL como Fonte de Navegador no TikTok Live Studio)\n`);
  });

  if (MODO_SIM) {
    console.log('  MODO SIMULADOR: gerando eventos falsos.\n');
    iniciarSimulador((e) => bridge.broadcast(e));
    return;
  }

  if (!cfg.signApiKey) {
    console.warn('  ⚠  Sem chave de API (config/config.local.json). A conexão real com o TikTok vai falhar.');
    console.warn('     Crie uma chave grátis em https://www.eulerstream.com e cole em config/config.local.json.');
    console.warn('     Para testar o overlay sem TikTok, rode com --sim.\n');
  }

  connectWithRetry(cfg, bridge);
}

function connectWithRetry(cfg, bridge) {
  const connector = createConnector(cfg.username, {
    signApiKey: cfg.signApiKey,
    onEvent: (e) => bridge.broadcast(e),
    onStatus: (s) => {
      if (s.state === 'connected') console.log(`  Conectado à live de @${cfg.username} ✅`);
      if (s.state === 'disconnected') retryConnection(cfg, bridge, 'live encerrada/queda');
    },
  });
  connector.connect().catch((err) => {
    const offline = err instanceof UserOfflineError;
    const reason = offline
      ? `@${cfg.username} não está ao vivo agora`
      : `falha ao conectar em @${cfg.username} (${String(err?.message ?? err).slice(0, 120)})`;
    retryConnection(cfg, bridge, reason);
  });
}

function retryConnection(cfg, bridge, reason) {
  console.log(`  ⚠  ${reason}. Tentando novamente em 15s...`);
  setTimeout(() => connectWithRetry(cfg, bridge), 15000);
}

main();
