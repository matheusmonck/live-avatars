import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getTerrain, saveTerrain, setActiveTerrain, deleteTerrain, setTerrainOffset, setTerrainScale, type TerrainState } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

const readDataURL = (file: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });

export function TerrainTab() {
  const [state, setState] = useState<TerrainState>({ active: null, items: [] });
  const [name, setName] = useState(''); const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState('');
  const [offset, setOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const load = () => getTerrain().then((s) => {
    setState(s);
    const active = s.items.find((i) => i.file === s.active);
    setOffset(active?.offset ?? 0);
    setScale(active?.scale ?? 1);
  });
  useEffect(() => { load(); }, []);
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (!file) return;
    const image = await readDataURL(file);
    const r = await saveTerrain({ name, image });
    if (!r?.error) { setMsg('Enviado ✓ (ao vivo)'); setName(''); setFile(null); load(); } else setMsg(r.error);
  };
  const use = async (f: string | null) => { await setActiveTerrain(f); load(); };
  const remove = async (f: string) => { if (confirm(`Remover "${f}"?`)) { await deleteTerrain(f); load(); } };
  return (
    <Card title="Terreno (cenário de fundo)">
      <p>Ativo: <strong>{state.active ?? 'nenhum'}</strong> {state.active ? <Button onClick={() => use(null)}>usar nenhum</Button> : null}</p>
      {state.active ? (
        <>
          <label className="field">
            <span>Ajuste vertical: {offset}px</span>
            <input type="range" min={-400} max={400} value={offset}
              onChange={(e) => { const v = Number(e.target.value); setOffset(v); setTerrainOffset(state.active!, v); }} />
          </label>
          <label className="field">
            <span>Escala do terreno: {scale.toFixed(1)}×</span>
            <input type="range" min={0.2} max={4} step={0.1} value={scale}
              onChange={(e) => { const v = Number(e.target.value); setScale(v); setTerrainScale(state.active!, v); }} />
          </label>
        </>
      ) : null}
      <ul className="list">
        {state.items.map((t) => (
          <li key={t.file} className="row">
            <img className="thumb" src={`/assets/terrain-local/${t.file}`} height={40} alt={t.file} />
            <span>{t.file}</span>
            <Button variant="primary" onClick={() => use(t.file)} disabled={state.active === t.file}>usar</Button>
            <Button variant="danger" onClick={() => remove(t.file)}>remover</Button>
          </li>
        ))}
      </ul>
      {state.items.length === 0 ? <p className="muted">Nenhum terreno ainda — envie uma imagem.</p> : null}
      <form onSubmit={send} className="grid">
        <h3>Enviar terreno</h3>
        <Field label="Nome (a-z, 0-9, hífen)" value={name} onChange={(e) => setName(e.target.value)} placeholder="grama" />
        <label className="field"><span>Imagem (PNG/JPG)</span><input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <div className="row"><Button variant="primary" type="submit" disabled={!name || !file}>Enviar</Button> <span className="muted">{msg}</span></div>
      </form>
    </Card>
  );
}
