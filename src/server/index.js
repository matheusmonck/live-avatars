import { carregarConfig } from './config.js';
import { criarServidorEstatico } from './static-server.js';
import { criarBridge } from './bridge.js';
import { criarConnector } from './connector.js';
import { iniciarSimulador } from './simulator.js';

const MODO_SIM = process.argv.includes('--sim');

function main() {
  const cfg = carregarConfig();
  const http = criarServidorEstatico();
  const bridge = criarBridge(http, (ws) => {
    ws.send(JSON.stringify({
      tipo: 'config',
      limiteAvatares: cfg.limiteAvatares,
      inatividadeSegundos: cfg.inatividadeSegundos,
    }));
  });

  http.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  A porta ${cfg.porta} já está em uso. Feche a outra janela do Live Avatars (ou mude "porta" no config/config.json) e tente de novo.\n`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGINT', () => {
    console.log('\n  Encerrando Live Avatars...');
    bridge.fechar();
    http.close();
    process.exit(0);
  });

  http.listen(cfg.porta, () => {
    console.log(`\n  Live Avatars no ar 🎉`);
    console.log(`  Overlay:  http://localhost:${cfg.porta}`);
    console.log(`  (adicione essa URL como Fonte de Navegador no TikTok Live Studio)\n`);
  });

  if (MODO_SIM) {
    console.log('  MODO SIMULADOR: gerando eventos falsos.\n');
    iniciarSimulador((e) => bridge.broadcast(e));
    return;
  }

  conectarComRetry(cfg, bridge);
}

function conectarComRetry(cfg, bridge) {
  const connector = criarConnector(cfg.usuarioTikTok, {
    aoEvento: (e) => bridge.broadcast(e),
    aoStatus: (s) => {
      if (s.estado === 'conectado') console.log(`  Conectado à live de @${cfg.usuarioTikTok} ✅`);
      if (s.estado === 'desconectado') tentarReconectar(cfg, bridge, 'live encerrada/queda');
    },
  });
  connector.conectar().catch(() => {
    tentarReconectar(cfg, bridge, `live de @${cfg.usuarioTikTok} offline ou @ inválido`);
  });
}

function tentarReconectar(cfg, bridge, motivo) {
  console.log(`  ⚠  ${motivo}. Tentando novamente em 15s...`);
  setTimeout(() => conectarComRetry(cfg, bridge), 15000);
}

main();
