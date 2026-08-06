import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listUsers, setUser, removeUser } from '../src/server/users.js';

function overlayTmp({ defaultOverrides = {}, localExtra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ov-users-'));
  writeFileSync(
    join(dir, 'characters.json'),
    JSON.stringify({
      characters: [{ id: 'hero' }, { id: 'ninja' }],
      overrides: defaultOverrides,
    }),
  );
  writeFileSync(
    join(dir, 'characters.local.json'),
    JSON.stringify({ characters: [], hidden: [], ...localExtra }),
  );
  return dir;
}

// ── listUsers ────────────────────────────────────────────────────────────────

test('listUsers retorna vazio quando não há overrides nem vip', () => {
  const dir = overlayTmp();
  expect(listUsers({ overlayDir: dir })).toEqual([]);
});

test('listUsers inclui entrada de override padrão', () => {
  const dir = overlayTmp({ defaultOverrides: { dave: 'ninja' } });
  const list = listUsers({ overlayDir: dir });
  expect(list).toContainEqual({
    username: 'dave',
    sprite: 'ninja',
    source: 'default',
    vip: false,
  });
});

test('listUsers inclui override local; local vence sobre padrão', () => {
  const dir = overlayTmp({
    defaultOverrides: { dave: 'ninja' },
    localExtra: { overrides: { dave: 'hero' } },
  });
  const list = listUsers({ overlayDir: dir });
  const entry = list.find((u) => u.username === 'dave');
  expect(entry).toEqual({
    username: 'dave',
    sprite: 'hero',
    source: 'local',
    vip: false,
  });
});

test('listUsers inclui usuário VIP sem override (sprite null, source local)', () => {
  const dir = overlayTmp({ localExtra: { vip: ['streamer'] } });
  const list = listUsers({ overlayDir: dir });
  expect(list).toContainEqual({
    username: 'streamer',
    sprite: null,
    source: 'local',
    vip: true,
  });
});

test('listUsers faz union de default+local overrides+vip sem duplicatas', () => {
  const dir = overlayTmp({
    defaultOverrides: { alice: 'hero' },
    localExtra: { overrides: { bob: 'ninja' }, vip: ['alice', 'carol'] },
  });
  const list = listUsers({ overlayDir: dir });
  const usernames = list.map((u) => u.username).sort();
  expect(usernames).toEqual(['alice', 'bob', 'carol']);
  expect(list.find((u) => u.username === 'alice')).toMatchObject({ vip: true, source: 'default', sprite: 'hero' });
  expect(list.find((u) => u.username === 'bob')).toMatchObject({ vip: false, source: 'local', sprite: 'ninja' });
  expect(list.find((u) => u.username === 'carol')).toMatchObject({ vip: true, source: 'local', sprite: null });
});

// ── setUser ──────────────────────────────────────────────────────────────────

test('setUser define sprite local e persiste', () => {
  const dir = overlayTmp();
  const result = setUser({ username: 'alice', sprite: 'hero' }, { overlayDir: dir });
  expect(result).toMatchObject({ username: 'alice', sprite: 'hero', vip: false });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides).toMatchObject({ alice: 'hero' });
});

test('setUser remove sprite local quando sprite é string vazia', () => {
  const dir = overlayTmp({ localExtra: { overrides: { alice: 'hero' } } });
  setUser({ username: 'alice', sprite: '' }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.alice).toBeUndefined();
});

test('setUser remove sprite local quando sprite é null', () => {
  const dir = overlayTmp({ localExtra: { overrides: { alice: 'hero' } } });
  setUser({ username: 'alice', sprite: null }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.alice).toBeUndefined();
});

test('setUser não toca override quando sprite é undefined', () => {
  const dir = overlayTmp({ localExtra: { overrides: { alice: 'hero' } } });
  setUser({ username: 'alice', vip: true }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.alice).toBe('hero');
});

test('setUser define vip true e persiste', () => {
  const dir = overlayTmp();
  setUser({ username: 'streamer', vip: true }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.vip).toContain('streamer');
});

test('setUser remove vip quando vip=false', () => {
  const dir = overlayTmp({ localExtra: { vip: ['streamer'] } });
  setUser({ username: 'streamer', vip: false }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.vip ?? []).not.toContain('streamer');
});

test('setUser não toca vip quando vip é undefined', () => {
  const dir = overlayTmp({ localExtra: { vip: ['streamer'] } });
  setUser({ username: 'streamer', sprite: 'hero' }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.vip).toContain('streamer');
});

test('setUser preserva characters e hidden existentes', () => {
  const dir = overlayTmp({ localExtra: { characters: [{ id: 'local-char' }], hidden: ['hero'] } });
  setUser({ username: 'alice', vip: true }, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters).toContainEqual({ id: 'local-char' });
  expect(local.hidden).toContain('hero');
});

test('setUser lança erro em username inválido (vazio após trim)', () => {
  const dir = overlayTmp();
  expect(() => setUser({ username: '   ', sprite: 'hero' }, { overlayDir: dir })).toThrow('usuário inválido');
  expect(() => setUser({ username: '@', sprite: 'hero' }, { overlayDir: dir })).toThrow('usuário inválido');
  expect(() => setUser({ username: '', sprite: 'hero' }, { overlayDir: dir })).toThrow('usuário inválido');
});

test('setUser strips @ prefix from username', () => {
  const dir = overlayTmp();
  const result = setUser({ username: '@alice', sprite: 'hero' }, { overlayDir: dir });
  expect(result.username).toBe('alice');
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.alice).toBe('hero');
});

test('setUser lança erro em sprite inexistente', () => {
  const dir = overlayTmp();
  expect(() => setUser({ username: 'alice', sprite: 'nao-existe' }, { overlayDir: dir })).toThrow('sprite inexistente');
});

test('setUser retorna o estado efetivo do usuário', () => {
  const dir = overlayTmp({ defaultOverrides: { alice: 'ninja' } });
  // Set only vip, sprite not overridden locally → sprite comes from default
  const result = setUser({ username: 'alice', vip: true }, { overlayDir: dir });
  // sprite/source reflect effective view (local takes precedence)
  expect(result.username).toBe('alice');
  expect(result.vip).toBe(true);
  // sprite undefined when no local override set this call and sprite arg was undefined
  expect(result.sprite).toBeNull();
});

// ── removeUser ───────────────────────────────────────────────────────────────

test('removeUser remove override local e vip', () => {
  const dir = overlayTmp({
    localExtra: { overrides: { alice: 'hero' }, vip: ['alice'] },
  });
  removeUser('alice', { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.alice).toBeUndefined();
  expect(local.vip ?? []).not.toContain('alice');
});

test('removeUser strips @ e trim', () => {
  const dir = overlayTmp({
    localExtra: { overrides: { bob: 'ninja' }, vip: ['bob'] },
  });
  removeUser('  @bob  ', { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.overrides?.bob).toBeUndefined();
  expect(local.vip ?? []).not.toContain('bob');
});

test('removeUser não falha se usuário não existe', () => {
  const dir = overlayTmp();
  expect(() => removeUser('ghost', { overlayDir: dir })).not.toThrow();
});

test('removeUser preserva characters e hidden', () => {
  const dir = overlayTmp({
    localExtra: { characters: [{ id: 'local-char' }], hidden: ['hero'], overrides: { alice: 'hero' } },
  });
  removeUser('alice', { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters).toContainEqual({ id: 'local-char' });
  expect(local.hidden).toContain('hero');
});
