import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getSprites, saveSprite, deleteSprite, setSpriteHidden, type SpriteItem } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

function Preview({ base, id, frames }: { base: string; id: string; frames: number }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % frames), 250); return () => clearInterval(t); }, [frames]);
  return <img className="pixel" src={`${base}/${id}/${i + 1}.png`} width={48} height={48} alt={id} />;
}
const readDataURL = (file: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });

export function SpritesTab() {
  const [sprites, setSprites] = useState<SpriteItem[]>([]);
  const [id, setId] = useState(''); const [facing, setFacing] = useState('front'); const [scale, setScale] = useState(2);
  const [files, setFiles] = useState<File[]>([]); const [msg, setMsg] = useState('');
  const load = () => getSprites().then(setSprites);
  useEffect(() => { load(); }, []);
  const baseFor = (s: SpriteItem) => s.source === 'local' ? '/assets/characters-local' : '/assets/characters';
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const frames = await Promise.all(files.map(readDataURL));
    const r = await saveSprite({ id, scale: Number(scale), facing, frames });
    if (!r?.error) { setMsg('Adicionado ✓ (atualize a fonte no OBS)'); setId(''); setFiles([]); load(); } else setMsg(r.error);
  };
  const remove = async (sid: string) => { if (confirm(`Remover o sprite "${sid}"?`)) { await deleteSprite(sid); load(); } };
  const toggleHidden = async (s: SpriteItem) => { await setSpriteHidden(s.id, !s.hidden); load(); };
  const hasLocal = sprites.some((s) => s.source === 'local');
  return (
    <Card title="Sprites de personagem">
      <ul className="list">
        {sprites.map((s) => (
          <li key={s.id} className="row" style={s.hidden ? { opacity: 0.5 } : undefined}>
            <Preview base={baseFor(s)} id={s.id} frames={s.frames} />
            <span>{s.id} <small className="muted">({s.source === 'local' ? 'seu' : 'padrão'}{s.hidden ? ', oculto' : ''})</small></span>
            {s.source === 'local'
              ? <Button variant="danger" onClick={() => remove(s.id)}>Remover</Button>
              : <Button onClick={() => toggleHidden(s)}>{s.hidden ? 'Restaurar' : 'Ocultar'}</Button>}
          </li>
        ))}
      </ul>
      {!hasLocal ? <p className="muted">Nenhum sprite seu ainda — envie PNGs abaixo.</p> : null}
      <form onSubmit={add} className="grid">
        <h3>Adicionar sprite</h3>
        <Field label="Nome (a-z, 0-9, hífen)" value={id} onChange={(e) => setId(e.target.value)} placeholder="meu-personagem" />
        <label className="field"><span>Direção da arte</span>
          <select value={facing} onChange={(e) => setFacing(e.target.value)}>
            <option value="front">frente</option><option value="left">esquerda</option><option value="right">direita</option>
          </select>
        </label>
        <Field label="Escala" type="number" min={1} max={6} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        <label className="field"><span>Quadros (PNGs)</span>
          <input type="file" accept="image/png" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))} />
        </label>
        <div className="row"><Button variant="primary" type="submit" disabled={!id || files.length === 0}>Adicionar ({files.length})</Button> <span className="muted">{msg}</span></div>
      </form>
    </Card>
  );
}
