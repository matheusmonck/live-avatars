import { useState, useEffect } from 'react';
import { getUsers, putUser, deleteUser, getSprites, type UserEntry, type SpriteItem } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

export function UsersTab() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [sprites, setSprites] = useState<SpriteItem[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newSprite, setNewSprite] = useState('');
  const [newVip, setNewVip] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => Promise.all([getUsers(), getSprites()]).then(([u, s]) => { setUsers(u); setSprites(s); });
  useEffect(() => { load(); }, []);

  const visibleSprites = sprites.filter((s) => !s.hidden);

  const save = async (username: string, sprite: string | null, vip: boolean) => {
    const r = await putUser({ username, sprite, vip });
    if (!r.error) { setMsg('Salvo ✓ (atualize a fonte no OBS)'); load(); } else setMsg(r.error ?? 'Erro desconhecido');
  };

  const remove = async (username: string) => {
    if (confirm(`Remover o usuário "@${username}"?`)) { await deleteUser(username); load(); }
  };

  const handleAdd = async () => {
    const r = await putUser({ username: newUser, sprite: newSprite === '' ? null : newSprite, vip: newVip });
    if (!r.error) { setMsg('Salvo ✓ (atualize a fonte no OBS)'); setNewUser(''); setNewSprite(''); setNewVip(false); load(); } else setMsg(r.error ?? 'Erro desconhecido');
  };

  const spriteOptions = (
    <>
      <option value="">— automático</option>
      {visibleSprites.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
    </>
  );

  return (
    <Card title="Usuários">
      <ul className="list">
        {users.map((u) => (
          <li key={u.username} className="row">
            <span>@{u.username}</span>
            <label className="field">
              <span>Sprite</span>
              <select value={u.sprite ?? ''} onChange={(e) => save(u.username, e.target.value === '' ? null : e.target.value, u.vip)}>
                {spriteOptions}
              </select>
            </label>
            <label className="row">
              <input type="checkbox" checked={u.vip} onChange={(e) => save(u.username, u.sprite, e.target.checked)} /> VIP 👑
            </label>
            <Button variant="danger" onClick={() => remove(u.username)}>Remover</Button>
          </li>
        ))}
      </ul>
      <form className="grid" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
        <h3>Adicionar usuário</h3>
        <Field label="@" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="nomedousuario" />
        <label className="field">
          <span>Sprite</span>
          <select value={newSprite} onChange={(e) => setNewSprite(e.target.value)}>
            {spriteOptions}
          </select>
        </label>
        <label className="row">
          <input type="checkbox" checked={newVip} onChange={(e) => setNewVip(e.target.checked)} /> VIP 👑
        </label>
        <div className="row">
          <Button variant="primary" type="submit" disabled={!newUser}>Adicionar</Button>
          <span className="muted">{msg}</span>
        </div>
      </form>
    </Card>
  );
}
