export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <button key={t} className={t === active ? 'tab active' : 'tab'} onClick={() => onChange(t)}>{t}</button>
      ))}
    </nav>
  );
}
