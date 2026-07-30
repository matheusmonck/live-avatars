import { ConfigForm } from './ConfigForm.jsx';
import { KeyField } from './KeyField.jsx';
import { ControlPanel } from './ControlPanel.jsx';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1.5rem' }}>
      <h1>Live Avatars — Painel</h1>
      <ControlPanel />
      <KeyField />
      <ConfigForm />
    </main>
  );
}
