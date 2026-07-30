import { UserOfflineError } from 'tiktok-live-connector';
import { loadConfig } from './config.js';
import { createStaticServer } from './static-server.js';
import { createBridge } from './bridge.js';
import { criarConnector } from './connector.js';
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

  conectarComRetry(cfg, bridge);
}

function conectarComRetry(cfg, bridge) {
  const connector = criarConnector(cfg.username, {
    signApiKey: cfg.signApiKey,
    aoEvento: (e) => bridge.broadcast(e),
    aoStatus: (s) => {
      if (s.estado === 'conectado') console.log(`  Conectado à live de @${cfg.username} ✅`);
      if (s.estado === 'desconectado') tentarReconectar(cfg, bridge, 'live encerrada/queda');
    },
  });
  connector.conectar().catch((err) => {
    const offline = err instanceof UserOfflineError;
    const motivo = offline
      ? `@${cfg.username} não está ao vivo agora`
      : `falha ao conectar em @${cfg.username} (${String(err?.message ?? err).slice(0, 120)})`;
    tentarReconectar(cfg, bridge, motivo);
  });
}

function tentarReconectar(cfg, bridge, motivo) {
  console.log(`  ⚠  ${motivo}. Tentando novamente em 15s...`);
  setTimeout(() => conectarComRetry(cfg, bridge), 15000);
}

main();
