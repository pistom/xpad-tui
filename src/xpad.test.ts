import { loadNotes, createNote, saveNote } from './xpad';
import fs from 'fs/promises';
import path from 'path';

const tmpDir = path.join(__dirname, '..', 'tmp-test-notes');

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
});

afterAll(async () => {
  // cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('create and load plain-text note with content-XXXXXX name', async () => {
  const note = await createNote(tmpDir, 'Test', 'Hello world');
  // filename should match content-XXXXXX
  expect(/^content-[A-Za-z0-9]{6}$/.test(note.id)).toBeTruthy();
  const notes = await loadNotes(tmpDir);
  expect(notes.length).toBeGreaterThanOrEqual(1);
  const found = notes.find((n) => n.id === note.id);
  expect(found).toBeTruthy();
  expect(found!.content).toContain('Hello world');
});

test('save updates content for plain-text', async () => {
  const note = await createNote(tmpDir, 'SaveTest', 'Initial');
  note.content = 'Updated content';
  await saveNote(note);
  const notes = await loadNotes(tmpDir);
  const updated = notes.find((n) => n.id === note.id);
  expect(updated!.content).toContain('Updated content');
});
