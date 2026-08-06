import { loadConfig, configFrame } from './config.js';
import { createStaticServer } from './static-server.js';
import { createBridge } from './bridge.js';
import { createConnectionManager } from './connection-manager.js';
import { createAdminApi } from './admin-api.js';
import { startSimulator } from './simulator.js';

const MODO_SIM = process.argv.includes('--sim');

function main() {
  const cfg = loadConfig();
  let manager;
  let adminApi;
  const http = createStaticServer({ adminApi: (req, res) => adminApi.handle(req, res) });

  const bridge = createBridge(http, (ws) => {
    const c = loadConfig();
    ws.send(JSON.stringify(configFrame(c)));
    ws.send(JSON.stringify({ type: 'status', ...manager.getStatus() }));
  });

  manager = createConnectionManager({ bridge });
  adminApi = createAdminApi({ manager, bridge });

  http.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  A porta ${cfg.port} já está em uso. Feche a outra janela do Live Avatars (ou mude "porta" no config/config.json) e tente de novo.\n`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGINT', () => {
    console.log('\n  Encerrando Live Avatars...');
    manager.stop();
    bridge.close();
    http.close();
    process.exit(0);
  });

  http.listen(cfg.port, () => {
    console.log(`\n  Live Avatars no ar 🎉`);
    console.log(`  Overlay:  http://localhost:${cfg.port}`);
    console.log(`  Painel:   http://localhost:${cfg.port}/admin`);
    console.log(`  (abra o Painel pra configurar e iniciar a conexão)\n`);
  });

  if (MODO_SIM) {
    console.log('  MODO SIMULADOR: gerando eventos falsos.\n');
    startSimulator((e) => bridge.broadcast(e));
  }
  // Modelo idle: não conecta no boot; o painel inicia via /admin/api/start.
}

main();
