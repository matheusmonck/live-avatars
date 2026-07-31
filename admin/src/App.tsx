import { useState } from 'react';
import { useStatus } from './hooks/useStatus';
import { Badge } from './ui/Badge';
import { Tabs } from './ui/Tabs';
import { ConnectionTab } from './tabs/ConnectionTab';
import { ConfigTab } from './tabs/ConfigTab';
import { SpritesTab } from './tabs/SpritesTab';
import { TerrainTab } from './tabs/TerrainTab';

const TABS = ['Conexão', 'Configuração', 'Sprites', 'Terreno'];

export function App() {
  const status = useStatus();
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div className="app">
      <header className="header"><h1>Live Avatars</h1><Badge status={status} /></header>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <main>
        {tab === 'Conexão' && <ConnectionTab status={status} />}
        {tab === 'Configuração' && <ConfigTab />}
        {tab === 'Sprites' && <SpritesTab />}
        {tab === 'Terreno' && <TerrainTab />}
      </main>
    </div>
  );
}
