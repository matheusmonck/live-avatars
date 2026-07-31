import { useState } from 'react';
import { startConnection, stopConnection, restartConnection, type Status, type ApiResult } from '../api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function ConnectionTab({ status }: { status: Status }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const on = status.state !== 'idle';
  const run = (fn: () => Promise<ApiResult>) => async () => {
    setBusy(true); setMsg('');
    const r = await fn();
    if (r?.error) setMsg(r.error);
    setBusy(false);
  };
  return (
    <Card title="Conexão">
      <div className="row">
        <Button variant="primary" disabled={on || busy} onClick={run(startConnection)}>Iniciar</Button>
        <Button variant="danger" disabled={!on || busy} onClick={run(stopConnection)}>Parar</Button>
        <Button disabled={!on || busy} onClick={run(restartConnection)}>Reiniciar</Button>
      </div>
      {status.reason ? <p className="err">{status.reason}</p> : null}
      {msg ? <p className="err">{msg}</p> : null}
      <p className="muted">Inicie a conexão quando estiver ao vivo no TikTok. Reiniciar aplica mudanças de @ / porta.</p>
    </Card>
  );
}
