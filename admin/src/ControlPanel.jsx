import { useState, useEffect } from 'react';
import { startConnection, stopConnection, onStatus } from './api.js';

const LABEL = {
  idle: '⏸️ parado', connecting: '⏳ conectando…', connected: '🟢 conectado',
  reconnecting: '🔄 reconectando…', offline: '🔴 offline (não está ao vivo)', error: '⚠️ erro',
};

export function ControlPanel() {
  const [status, setStatus] = useState({ state: 'idle' });
  const [msg, setMsg] = useState('');
  useEffect(() => onStatus(setStatus), []);
  const iniciar = async () => { const r = await startConnection(); if (!r.ok) setMsg(r.error || 'Erro'); else setMsg(''); };
  const parar = async () => { await stopConnection(); setMsg(''); };
  const ligado = status.state !== 'idle';
  return (
    <section>
      <h2>Conexão</h2>
      <p>Status: <strong>{LABEL[status.state] ?? status.state}</strong>
        {status.username ? ` — @${status.username}` : ''}{status.room ? ` (sala ${status.room})` : ''}</p>
      {status.reason ? <p style={{ color: '#a00' }}>{status.reason}</p> : null}
      <button onClick={iniciar} disabled={ligado}>Iniciar</button>{' '}
      <button onClick={parar} disabled={!ligado}>Parar</button> <span style={{ color: '#a00' }}>{msg}</span>
    </section>
  );
}
