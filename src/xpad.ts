import fs from 'fs/promises';
import path from 'path';
import { parseInfoFile } from './utils/noteUtils.js';
import { log } from './logger.js';

export type Note = {
  id: string;
  title: string;
  content: string;
  filePath: string;
  // optional metadata from info files
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  followFont?: boolean;
  followColor?: boolean;
  sticky?: boolean;
  hidden?: boolean;
  backgroundColor?: string;
  textColor?: string;
  font?: string;
};

export async function loadNotes(dir: string): Promise<Note[]> {
  const ents = await fs.readdir(dir);
  const notes: Note[] = [];

  // First pass: process info-* files and load referenced content files
  const referencedContents = new Set<string>();
  for (const name of ents) {
    if (!name.startsWith('info-')) continue;
    const infoPath = path.join(dir, name);
    try {
      const stat = await fs.stat(infoPath);
      if (!stat.isFile()) continue;
      const metadata = parseInfoFile(infoPath);
      if (!metadata || !metadata.contentFile) continue;

      const contentName = metadata.contentFile;
      referencedContents.add(contentName);
      const contentPath = path.join(dir, contentName);
      let data = '';
      try {
        const cstat = await fs.stat(contentPath).catch(() => null);
        if (cstat && cstat.isFile()) {
          data = await fs.readFile(contentPath, 'utf8');
        }
      } catch {
        // missing or unreadable content file; keep data as empty string
      }

      const firstLine = data.split(/\r?\n/)[0] || '';
      const title = firstLine.trim() || contentName;

      const note: Note = { id: contentName, title, content: data, filePath: contentPath };

      // copy metadata fields
      note.width = metadata.width;
      note.height = metadata.height;
      note.x = metadata.x;
      note.y = metadata.y;
      note.followFont = metadata.followFont;
      note.followColor = metadata.followColor;
      note.sticky = metadata.sticky;
      note.hidden = metadata.hidden;
      note.backgroundColor = metadata.backgroundColor;
      note.textColor = metadata.textColor;
      note.font = metadata.font;

      notes.push(note);
    } catch {
      // ignore unreadable/invalid info files
    }
  }

  notes.sort((a, b) => a.title.localeCompare(b.title));
  return notes;
}

export async function saveNote(note: Note): Promise<void> {
  await fs.writeFile(note.filePath, note.content, 'utf8');
}

export async function setNoteHidden(note: Note, hidden: boolean): Promise<void> {
  const dir = path.dirname(note.filePath);
  const ents = await fs.readdir(dir);
  for (const name of ents) {
    if (!name.startsWith('info-')) continue;
    const infoPath = path.join(dir, name);
    try {
      const raw = await fs.readFile(infoPath, 'utf8');
      // find content file entry
      const lines = raw.split(/\r?\n/);
      let contentFile: string | null = null;
      for (const l of lines) {
        if (l.startsWith('content ')) {
          contentFile = l.slice('content '.length).trim();
          break;
        }
      }
      if (contentFile !== note.id) continue;

      // update or append hidden line
      let found = false;
      const newLines = lines.map((l) => {
        if (l.startsWith('hidden ')) {
          found = true;
          return `hidden ${hidden ? '1' : '0'}`;
        }
        return l;
      });
      if (!found) newLines.push(`hidden ${hidden ? '1' : '0'}`);

      await fs.writeFile(infoPath, newLines.join('\n'), 'utf8');
      return;
    } catch (e) {
      // ignore and continue
    }
  }
}

export async function createNote(dir: string, title: string, content: string): Promise<Note> {
  // generate name like content-XXXXXX (6 random alnum chars)
  const id = `content-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(dir, id);
  const toWrite = content || title || '';
  await fs.writeFile(filePath, toWrite, 'utf8');
  // create corresponding info file so the note is discoverable by loadNotes
  try {
    const infoId = `info-${Math.random().toString(36).slice(2, 8)}`;
    const infoPath = path.join(dir, infoId);
    const infoLines = [
      `hidden 0`,
      `content ${id}`,
    ];
    await fs.writeFile(infoPath, infoLines.join('\n'), 'utf8');
  } catch (e) {
    // ignore info file creation errors
  }

  return { id, title: title || id, content: toWrite, filePath };
}

export async function removeNote(note: Note): Promise<void> {
  await fs.unlink(note.filePath);
}
