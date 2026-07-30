import { useState, useEffect } from 'react';
import { getConfig, putKey } from './api.js';

export function KeyField() {
  const [hasKey, setHasKey] = useState(false);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { getConfig().then((c) => setHasKey(c.hasKey)); }, []);
  const salvar = async () => {
    const r = await putKey(value);
    setMsg(r.ok ? 'Chave salva!' : 'Erro');
    if (r.ok) { setHasKey(true); setValue(''); }
  };
  return (
    <section>
      <h2>Chave de API (Euler Stream)</h2>
      <p>Status: {hasKey ? '✅ definida' : '⚠️ não definida'}</p>
      <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="cole sua chave aqui" />
      <button onClick={salvar} disabled={!value}>Salvar chave</button> <span>{msg}</span>
    </section>
  );
}
