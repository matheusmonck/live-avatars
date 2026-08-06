import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getConfig, putConfig, putConfigLive, putKey, type Config } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

export function ConfigTab() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msg, setMsg] = useState('');
  const [key, setKey] = useState('');
  const [keyMsg, setKeyMsg] = useState('');
  useEffect(() => { getConfig().then(setCfg); }, []);
  if (!cfg) return <Card title="Configuração"><p className="muted">Carregando…</p></Card>;
  const num = (k: keyof Config) => (e: ChangeEvent<HTMLInputElement>) => setCfg({ ...cfg, [k]: Number(e.target.value) });
  const check = (k: keyof Config) => (e: ChangeEvent<HTMLInputElement>) => setCfg({ ...cfg, [k]: e.target.checked });
  // Slider ao vivo: atualiza o estado local e manda um PUT parcial (o servidor
  // faz merge e rebroadcast do configFrame — aplica no overlay na hora).
  const live = (patch: Partial<Omit<Config, 'hasKey'>>) => { setCfg({ ...cfg, ...patch }); putConfigLive(patch); };
  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await putConfig({ username: cfg.username, avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, effectsVolume: cfg.effectsVolume, stageMode: cfg.stageMode, onlyInteractors: cfg.onlyInteractors, likeThreshold: cfg.likeThreshold, avatarScale: cfg.avatarScale, avatarOffsetY: cfg.avatarOffsetY, nameScale: cfg.nameScale, bubbleScale: cfg.bubbleScale, port: cfg.port });
    setMsg(r?.error ? r.error : 'Salvo ✓');
  };
  const salvarChave = async () => {
    const r = await putKey(key);
    if (!r?.error) { setKeyMsg('Chave salva ✓'); setKey(''); setCfg({ ...cfg, hasKey: true }); } else setKeyMsg(r.error);
  };
  return (
    <>
      <Card title="Configuração">
        <form onSubmit={salvar} className="grid">
          <Field label="@ do TikTok" value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} placeholder="seu_usuario" />
          <Field label="Limite de avatares" type="number" min={1} max={60} value={cfg.avatarLimit} onChange={num('avatarLimit')} />
          <Field label="Escala global dos avatares (aplica ao vivo)" type="number" min={0.2} max={6} step={0.1} value={cfg.avatarScale} onChange={num('avatarScale')} />
          <Field label="Inatividade (s)" type="number" min={10} max={3600} value={cfg.inactivitySeconds} onChange={num('inactivitySeconds')} />
          <Field label="Volume dos efeitos" type="number" min={0} max={1} step={0.1} value={cfg.effectsVolume} onChange={num('effectsVolume')} />
          <Field label="Modo palco (destaque de presente + banner)" type="checkbox" checked={cfg.stageMode} onChange={check('stageMode')} />
          <Field label="Só quem interage (comentário, coração, presente)" type="checkbox" checked={cfg.onlyInteractors} onChange={check('onlyInteractors')} />
          <Field label="Corações para aparecer" type="number" min={1} max={1000} value={cfg.likeThreshold} onChange={num('likeThreshold')} />
          <Field label="Porta" type="number" min={1024} max={65535} value={cfg.port} onChange={num('port')} />
          <div className="row"><Button variant="primary" type="submit">Salvar</Button> <span className="muted">{msg}</span></div>
        </form>
      </Card>
      <Card title="Aparência (aplica ao vivo, arrastando)">
        <label className="field">
          <span>Posição vertical dos personagens: {cfg.avatarOffsetY}px (+ sobe / − desce)</span>
          <input type="range" min={-400} max={400} step={5} value={cfg.avatarOffsetY}
            onChange={(e) => live({ avatarOffsetY: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Tamanho dos nomes: {cfg.nameScale.toFixed(1)}×</span>
          <input type="range" min={0.3} max={3} step={0.1} value={cfg.nameScale}
            onChange={(e) => live({ nameScale: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Tamanho do texto do balão: {cfg.bubbleScale.toFixed(1)}×</span>
          <input type="range" min={0.3} max={3} step={0.1} value={cfg.bubbleScale}
            onChange={(e) => live({ bubbleScale: Number(e.target.value) })} />
        </label>
      </Card>
      <Card title="Chave de API (Euler Stream)">
        <p className="muted">Status: {cfg.hasKey ? '✅ definida' : '⚠️ não definida'}</p>
        <div className="row">
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="cole sua chave" />
          <Button variant="primary" disabled={!key} onClick={salvarChave}>Salvar chave</Button> <span className="muted">{keyMsg}</span>
        </div>
      </Card>
    </>
  );
}
