import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import type { Note } from '../types/index.js';
import { encryptToArmor, decryptFromArmor } from '../utils/encryption.js';
import { parseFrontmatter, serializeFrontmatter, type Frontmatter } from '../utils/frontmatter.js';
import { extractTitle } from '../utils/noteUtils.js';

/*
 * Storage format: one note = one `<id>.md` file in the notes directory.
 *
 *   ---
 *   id: 20261102-101500-a1b2
 *   color: "#f5e663"        (optional)
 *   archived: false
 *   encrypted: false
 *   title: "..."            (only for encrypted notes, so the list can show it)
 *   created: 2026-11-02T10:15:00.000Z
 *   updated: 2026-11-02T12:40:00.000Z
 *   ---
 *   <markdown body, or ASCII-armored ciphertext when encrypted>
 */

export const NOTE_EXTENSION = '.md';
export const LOCKED_PLACEHOLDER = '[Encrypted - unlock to view]';

const KNOWN_KEYS = ['id', 'color', 'archived', 'encrypted', 'title', 'created', 'updated'];

/** Generates a sortable, human-readable id, e.g. `20261102-101500-a1b2`. */
export function generateNoteId(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const stamp =
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

export function noteFilePath(dir: string, id: string): string {
  return path.join(dir, `${id}${NOTE_EXTENSION}`);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Builds a Note from raw file contents. Locked encrypted notes get a placeholder body. */
export function parseNoteFile(raw: string, filePath: string): Note {
  const { meta, body } = parseFrontmatter(raw);
  const id = str(meta.id) ?? path.basename(filePath, NOTE_EXTENSION);
  const encrypted = meta.encrypted === true;

  const extraMeta: Frontmatter = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!KNOWN_KEYS.includes(key)) extraMeta[key] = value;
  }

  return {
    id,
    filePath,
    title: encrypted ? (str(meta.title) ?? id) : (extractTitle(body) || id),
    content: encrypted ? LOCKED_PLACEHOLDER : body,
    color: str(meta.color),
    archived: meta.archived === true,
    encrypted,
    created: str(meta.created),
    updated: str(meta.updated),
    extraMeta,
    isDecrypted: false,
  };
}

/** Serializes a note to file contents. Encrypted notes require the password. */
export function serializeNote(note: Note, password?: string): string {
  let body = note.content ?? '';
  let title: string | undefined;

  if (note.encrypted) {
    if (!password) {
      throw new Error('Cannot save encrypted note without a password');
    }
    if (!note.isDecrypted && body === LOCKED_PLACEHOLDER) {
      throw new Error('Cannot save a locked encrypted note; decrypt it first');
    }
    title = extractTitle(body) || note.id;
    body = encryptToArmor(body, password);
  }

  return serializeFrontmatter(
    {
      id: note.id,
      color: note.color,
      archived: note.archived ?? false,
      encrypted: note.encrypted ?? false,
      title,
      created: note.created,
      updated: note.updated,
      ...note.extraMeta,
    },
    body
  );
}

/** Writes via a temp file + rename so a crash or sync tool never sees a half-written note. */
async function writeAtomic(filePath: string, data: string): Promise<void> {
  const tmpPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.tmp`);
  await fs.writeFile(tmpPath, data, 'utf8');
  await fs.rename(tmpPath, filePath);
}

export async function loadNotes(dir: string): Promise<Note[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const notes: Note[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(NOTE_EXTENSION) || entry.name.startsWith('.')) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      notes.push(parseNoteFile(raw, filePath));
    } catch {
      continue;
    }
  }

  notes.sort((a, b) => a.title.localeCompare(b.title));
  return notes;
}

/**
 * Saves note content and metadata. If `note.encrypted` is set, `password`
 * is required and the body is stored encrypted.
 */
export async function saveNote(note: Note, password?: string): Promise<void> {
  const created = note.created ?? new Date().toISOString();
  const updated = new Date().toISOString();
  const data = serializeNote({ ...note, created, updated }, password);
  await writeAtomic(note.filePath, data);
  note.created = created;
  note.updated = updated;
}

export async function decryptNote(note: Note, password: string): Promise<Note> {
  if (!note.encrypted) {
    return note;
  }

  const raw = await fs.readFile(note.filePath, 'utf8');
  const { body } = parseFrontmatter(raw);
  const decryptedContent = decryptFromArmor(body, password);

  return {
    ...note,
    content: decryptedContent,
    title: extractTitle(decryptedContent) || note.id,
    isDecrypted: true
  };
}

export async function createNote(
  dir: string,
  title: string | undefined,
  content: string,
  encrypted?: boolean,
  password?: string
): Promise<Note> {
  await fs.mkdir(dir, { recursive: true });

  const now = new Date();
  const id = generateNoteId(now);
  const toWrite = content || title || '';
  const note: Note = {
    id,
    title: extractTitle(toWrite) || id,
    content: toWrite,
    filePath: noteFilePath(dir, id),
    archived: false,
    encrypted: !!encrypted,
    created: now.toISOString(),
    updated: now.toISOString(),
    extraMeta: {},
  };

  await writeAtomic(note.filePath, serializeNote(note, password));
  return { ...note, isDecrypted: !!encrypted };
}

export async function removeNote(note: Note): Promise<void> {
  await fs.unlink(note.filePath).catch(() => undefined);
}

/**
 * Updates only frontmatter fields, leaving the body untouched (works for
 * locked encrypted notes too).
 */
async function updateMeta(note: Note, changes: Frontmatter): Promise<void> {
  const raw = await fs.readFile(note.filePath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const merged: Frontmatter = { ...meta, ...changes, updated: new Date().toISOString() };
  if (!merged.id) merged.id = note.id;
  await writeAtomic(note.filePath, serializeFrontmatter(merged, body));
}

export async function setNoteArchived(note: Note, archived: boolean): Promise<void> {
  await updateMeta(note, { archived });
}
