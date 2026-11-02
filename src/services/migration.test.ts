import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { migrateLegacyNotes, migrateTaskSyntax, parseLegacyInfo, LEGACY_BACKUP_DIR } from './migration';
import { loadNotes, decryptNote } from './noteService';
import { encryptText } from '../utils/encryption';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xpad-migrate-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const legacyInfo = (content: string, extra: string[] = []) =>
  ['width 839', 'height 463', 'x 0', 'y 0', 'sticky 0', 'hidden 0', 'back rgb(238,238,236)',
   'text rgb(255,0,0)', 'fontname Mono 13', `content ${content}`, ...extra].join('\n');

test('parseLegacyInfo reads the fields we keep', () => {
  expect(parseLegacyInfo(legacyInfo('content-abc', ['hidden 1', 'encrypted 1', 'title My title']))).toEqual({
    contentFile: 'content-abc', hidden: true, encrypted: true, textColor: '#ff0000', title: 'My title',
  });
  expect(parseLegacyInfo('width 10')).toBeNull();
});

test('migrates plain and encrypted notes, backs up legacy files, reports orphans', async () => {
  await fs.writeFile(path.join(dir, 'info-aaaaaa'), legacyInfo('content-111111'));
  await fs.writeFile(path.join(dir, 'content-111111'), 'Groceries\n[ ] milk');
  await fs.writeFile(path.join(dir, 'info-bbbbbb'), legacyInfo('content-222222', ['hidden 1', 'encrypted 1', 'title Vault']));
  await fs.writeFile(path.join(dir, 'content-222222'), encryptText('Vault\nsecret', 'pw'));
  await fs.writeFile(path.join(dir, 'content-333333'), 'orphan');
  await fs.writeFile(path.join(dir, 'xpad-cli.conf'), '{}');
  const mtime = new Date('2025-01-15T08:00:00Z');
  await fs.utimes(path.join(dir, 'content-111111'), mtime, mtime);

  const dry = await migrateLegacyNotes(dir, { dryRun: true });
  expect(dry.migrated).toHaveLength(2);
  expect(await loadNotes(dir)).toEqual([]);

  const result = await migrateLegacyNotes(dir);
  expect(result.failed).toEqual([]);
  expect(result.orphans).toEqual(['content-333333']);

  const files = (await fs.readdir(dir)).sort();
  expect(files.filter((f) => f.endsWith('.md'))).toHaveLength(2);
  expect(files).toEqual(expect.arrayContaining(['content-333333', 'xpad-cli.conf', LEGACY_BACKUP_DIR]));
  expect(files.some((f) => f.startsWith('info-'))).toBe(false);
  expect((await fs.readdir(path.join(dir, LEGACY_BACKUP_DIR))).sort())
    .toEqual(['content-111111', 'content-222222', 'info-aaaaaa', 'info-bbbbbb']);

  const notes = await loadNotes(dir);
  const plain = notes.find((n) => n.title === 'Groceries')!;
  expect(plain.content).toBe('Groceries\n[ ] milk');
  expect(plain.color).toBe('#ff0000');
  expect(plain.archived).toBe(false);
  expect(plain.created).toBe('2025-01-15T08:00:00.000Z');
  expect(plain.id.startsWith('20250115-080000-')).toBe(true);

  const vault = notes.find((n) => n.title === 'Vault')!;
  expect(vault.archived).toBe(true);
  expect(vault.encrypted).toBe(true);
  expect((await decryptNote(vault, 'pw')).content).toBe('Vault\nsecret');
});

test('migrateTaskSyntax converts unencrypted notes only', async () => {
  const { createNote } = await import('./noteService');
  const plain = await createNote(dir, undefined, 'List\n[ ] a\n[✔] b\n[x] c');
  await createNote(dir, undefined, 'Secret\n[ ] a', true, 'pw');
  await createNote(dir, undefined, 'Nothing here');

  expect(await migrateTaskSyntax(dir, { dryRun: true })).toEqual([path.basename(plain.filePath)]);
  expect(await migrateTaskSyntax(dir)).toEqual([path.basename(plain.filePath)]);
  const after = (await loadNotes(dir)).find((n) => n.id === plain.id)!;
  expect(after.content).toBe('List\n- [ ] a\n- [x] b\n- [-] c');
  expect(after.created).toBe(plain.created);
  expect(await migrateTaskSyntax(dir)).toEqual([]);
});
