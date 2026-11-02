import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  loadNotes, createNote, saveNote, decryptNote, removeNote, setNoteArchived, LOCKED_PLACEHOLDER,
} from './noteService';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xpad-notes-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

test('creates a single .md file with frontmatter', async () => {
  const note = await createNote(dir, 'Test', '# Test\nHello world');
  expect(path.basename(note.filePath)).toBe(`${note.id}.md`);
  expect(await fs.readdir(dir)).toEqual([`${note.id}.md`]);

  const raw = await fs.readFile(note.filePath, 'utf8');
  expect(raw).toMatch(/^---\nid: \d{8}-\d{6}-[0-9a-f]{4}\narchived: false\nencrypted: false\n/);
  expect(raw.endsWith('---\n# Test\nHello world')).toBe(true);

  const [loaded] = await loadNotes(dir);
  expect(loaded.title).toBe('Test');
  expect(loaded.content).toBe('# Test\nHello world');
});

test('save updates content and preserves unknown frontmatter keys', async () => {
  const note = await createNote(dir, 'SaveTest', 'Initial');
  const raw = await fs.readFile(note.filePath, 'utf8');
  await fs.writeFile(note.filePath, raw.replace('archived:', 'tags: work\narchived:'));

  const [loaded] = await loadNotes(dir);
  loaded.content = 'Updated content';
  loaded.color = '#ff0000';
  await saveNote(loaded);

  const after = await fs.readFile(note.filePath, 'utf8');
  expect(after).toContain('tags: work');
  expect(after).toContain('color: "#ff0000"');
  expect(after).toContain(`created: ${note.created}`);
  const [reloaded] = await loadNotes(dir);
  expect(reloaded.content).toBe('Updated content');
});

test('archive flag toggles without touching the body', async () => {
  const note = await createNote(dir, undefined, 'Body');
  await setNoteArchived(note, true);
  const [loaded] = await loadNotes(dir);
  expect(loaded.archived).toBe(true);
  expect(loaded.content).toBe('Body');
});

test('encrypted notes are stored as armored text and decrypt back', async () => {
  const note = await createNote(dir, 'Secret', 'Secret\nPIN 1234', true, 'pw');
  const raw = await fs.readFile(note.filePath, 'utf8');
  expect(raw).toContain('encrypted: true');
  expect(raw).toContain('title: Secret');
  expect(raw).toContain('-----BEGIN XPAD ENCRYPTED NOTE v1-----');
  expect(raw).not.toContain('1234');

  const [locked] = await loadNotes(dir);
  expect(locked.title).toBe('Secret');
  expect(locked.content).toBe(LOCKED_PLACEHOLDER);

  await expect(decryptNote(locked, 'wrong')).rejects.toThrow(/Decryption failed/);
  const unlocked = await decryptNote(locked, 'pw');
  expect(unlocked.content).toBe('Secret\nPIN 1234');
});

test('refuses to save encrypted notes without password or while locked', async () => {
  await createNote(dir, 'S', 'S', true, 'pw');
  const [locked] = await loadNotes(dir);
  await expect(saveNote(locked)).rejects.toThrow(/without a password/);
  await expect(saveNote(locked, 'pw')).rejects.toThrow(/locked/);
});

test('removeNote deletes the file and loadNotes ignores non-.md files', async () => {
  const note = await createNote(dir, 'Gone', 'Gone');
  await fs.writeFile(path.join(dir, 'xpad-cli.conf'), '{}');
  await removeNote(note);
  expect(await loadNotes(dir)).toEqual([]);
});
