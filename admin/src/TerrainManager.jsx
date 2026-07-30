import { useState, useEffect } from 'react';
import { getTerrain, saveTerrain, setActiveTerrain, deleteTerrain } from './api.js';

function readAsDataURL(file) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
}

export function TerrainManager() {
  const [state, setState] = useState({ active: null, items: [] });
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => getTerrain().then(setState);
  useEffect(() => { load(); }, []);

  const enviar = async (e) => {
    e.preventDefault();
    const image = await readAsDataURL(file);
    const r = await saveTerrain({ name, image });
    if (r.ok) { setMsg('Enviado e ativado! Atualize a fonte no OBS.'); setName(''); setFile(null); load(); }
    else setMsg(r.error || 'Erro');
  };
  const usar = async (f) => { await setActiveTerrain(f); load(); };
  const remover = async (f) => { await deleteTerrain(f); load(); };

  return (
    <section>
      <h2>Terreno (cenário de fundo)</h2>
      <p>Ativo: <strong>{state.active ?? 'nenhum'}</strong>{state.active ? <> <button onClick={() => usar(null)}>usar nenhum</button></> : null}</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.4rem' }}>
        {state.items.map((t) => (
          <li key={t.file} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <img src={`/assets/terrain-local/${t.file}`} height="40" alt={t.file} />
            <span>{t.file}</span>
            <button onClick={() => usar(t.file)} disabled={state.active === t.file}>usar</button>
            <button onClick={() => remover(t.file)}>remover</button>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar}>
        <h3>Enviar terreno</h3>
        <label>Nome (a-z, 0-9, hífen)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="grama" /></label>
        <label>Imagem (PNG/JPG)<input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files[0])} /></label>
        <button type="submit" disabled={!name || !file}>Enviar</button> <span>{msg}</span>
      </form>
    </section>
  );
}
