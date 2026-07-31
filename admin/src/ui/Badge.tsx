import type { Status } from '../api';
const COLOR: Record<string, string> = { idle: 'var(--idle)', connecting: 'var(--warn)', connected: 'var(--ok)', reconnecting: 'var(--warn)', offline: 'var(--err)', error: 'var(--err)' };
const LABEL: Record<string, string> = { idle: 'parado', connecting: 'conectando…', connected: 'conectado', reconnecting: 'reconectando…', offline: 'offline', error: 'erro' };
export function Badge({ status }: { status: Status }) {
  return (
    <span className="badge">
      <span className="dot" style={{ color: COLOR[status.state], background: COLOR[status.state] }} />
      {LABEL[status.state] ?? status.state}
      {status.username ? ` · @${status.username}` : ''}{status.room ? ` · sala ${status.room}` : ''}
    </span>
  );
}
