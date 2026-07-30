import { useState, useEffect } from 'react';
import { getConfig, putConfig } from './api.js';

export function ConfigForm({ onSaved }) {
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { getConfig().then(setCfg); }, []);
  if (!cfg) return <p>Carregando…</p>;
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const salvar = async (e) => {
    e.preventDefault();
    const r = await putConfig({ username: cfg.username, avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, effectsVolume: cfg.effectsVolume, port: cfg.port });
    setMsg(r.ok ? 'Salvo!' : (r.error || 'Erro'));
    if (r.ok) onSaved?.();
  };
  return (
    <form onSubmit={salvar}>
      <h2>Configuração</h2>
      <label>@ do TikTok<input value={cfg.username} onChange={set('username')} placeholder="seu_usuario" /></label>
      <label>Limite de avatares<input type="number" min="1" max="60" value={cfg.avatarLimit} onChange={set('avatarLimit')} /></label>
      <label>Inatividade (s)<input type="number" min="10" max="3600" value={cfg.inactivitySeconds} onChange={set('inactivitySeconds')} /></label>
      <label>Volume dos efeitos<input type="number" min="0" max="1" step="0.1" value={cfg.effectsVolume} onChange={set('effectsVolume')} /></label>
      <label>Porta<input type="number" min="1024" max="65535" value={cfg.port} onChange={set('port')} /></label>
      <button type="submit">Salvar</button> <span>{msg}</span>
    </form>
  );
}
