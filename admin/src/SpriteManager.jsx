import { useState, useEffect } from 'react';
import { getSprites, saveSprite, deleteSprite } from './api.js';

function Preview({ base, id, frames }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % frames), 250);
    return () => clearInterval(t);
  }, [frames]);
  return <img src={`${base}/${id}/${i + 1}.png`} width="48" height="48" style={{ imageRendering: 'pixelated' }} alt={id} />;
}

function readAsDataURL(file) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
}

export function SpriteManager() {
  const [sprites, setSprites] = useState([]);
  const [id, setId] = useState('');
  const [facing, setFacing] = useState('front');
  const [scale, setScale] = useState(2);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => getSprites().then(setSprites);
  useEffect(() => { load(); }, []);

  const onFiles = (e) => setFiles([...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
  const baseFor = (s) => s.source === 'local' ? '/assets/characters-local' : '/assets/characters';

  const adicionar = async (e) => {
    e.preventDefault();
    const frames = await Promise.all(files.map(readAsDataURL));
    const r = await saveSprite({ id, scale: Number(scale), facing, frames });
    if (r.ok) { setMsg('Adicionado! Atualize a fonte de navegador no OBS pra ver.'); setId(''); setFiles([]); load(); }
    else setMsg(r.error || 'Erro');
  };
  const remover = async (sid) => { await deleteSprite(sid); load(); };

  return (
    <section>
      <h2>Sprites de personagem</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.5rem' }}>
        {sprites.map((s) => (
          <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Preview base={baseFor(s)} id={s.id} frames={s.frames} />
            <span>{s.id} <small>({s.source === 'local' ? 'seu' : 'padrão'})</small></span>
            {s.source === 'local' ? <button onClick={() => remover(s.id)}>Remover</button> : null}
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar}>
        <h3>Adicionar sprite</h3>
        <label>Nome (a-z, 0-9, hífen)<input value={id} onChange={(e) => setId(e.target.value)} placeholder="meu-personagem" /></label>
        <label>Direção da arte
          <select value={facing} onChange={(e) => setFacing(e.target.value)}>
            <option value="front">frente</option><option value="left">esquerda</option><option value="right">direita</option>
          </select>
        </label>
        <label>Escala<input type="number" min="1" max="6" step="1" value={scale} onChange={(e) => setScale(e.target.value)} /></label>
        <label>Quadros (PNGs)<input type="file" accept="image/png" multiple onChange={onFiles} /></label>
        <button type="submit" disabled={!id || files.length === 0}>Adicionar ({files.length} quadros)</button> <span>{msg}</span>
      </form>
    </section>
  );
}
