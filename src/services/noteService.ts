import fs from 'fs/promises';
import path from 'path';
import { parseInfoFile } from '../utils/noteUtils.js';
import type { Note } from '../types/index.js';

export async function loadNotes(dir: string): Promise<Note[]> {
  const entries = await fs.readdir(dir);
  const notes: Note[] = [];
  const referencedContents = new Set<string>();

  for (const name of entries) {
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
        const contentStat = await fs.stat(contentPath).catch(() => null);
        if (contentStat && contentStat.isFile()) {
          data = await fs.readFile(contentPath, 'utf8');
        }
      } catch {
        data = '';
      }

      const firstLine = data.split(/\r?\n/)[0] || '';
      const title = firstLine.trim() || contentName;

      const note: Note = { 
        id: contentName, 
        title, 
        content: data, 
        filePath: contentPath,
        ...metadata
      };

      notes.push(note);
    } catch {
      continue;
    }
  }

  notes.sort((a, b) => a.title.localeCompare(b.title));
  return notes;
}

export async function saveNote(note: Note): Promise<void> {
  await fs.writeFile(note.filePath, note.content, 'utf8');
}

export async function createNote(dir: string, title: string | undefined, content: string): Promise<Note> {
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  const id = `content-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(dir, id);
  const toWrite = content || title || '';
  
  await fs.writeFile(filePath, toWrite, 'utf8');
  
  try {
    const infoId = `info-${Math.random().toString(36).slice(2, 8)}`;
    const infoPath = path.join(dir, infoId);
    const infoLines = [`hidden 0`, `content ${id}`];
    await fs.writeFile(infoPath, infoLines.join('\n'), 'utf8');
  } catch {
    // ignore
  }

  return { id, title: title || id, content: toWrite, filePath };
}

export async function removeNote(note: Note): Promise<void> {
  try {
    await fs.unlink(note.filePath);
  } catch {
    // ignore
  }

  try {
    const dir = path.dirname(note.filePath);
    const entries = await fs.readdir(dir);
    
    for (const name of entries) {
      if (!name.startsWith('info-')) continue;
      
      const infoPath = path.join(dir, name);
      try {
        const raw = await fs.readFile(infoPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        
        for (const line of lines) {
          if (line.startsWith('content ')) {
            const contentFile = line.slice('content '.length).trim();
            if (contentFile === note.id) {
              await fs.unlink(infoPath).catch(() => null);
            }
            break;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }
}

export async function setNoteHidden(note: Note, hidden: boolean): Promise<void> {
  const dir = path.dirname(note.filePath);
  const entries = await fs.readdir(dir);
  
  for (const name of entries) {
    if (!name.startsWith('info-')) continue;
    
    const infoPath = path.join(dir, name);
    try {
      const raw = await fs.readFile(infoPath, 'utf8');
      const lines = raw.split(/\r?\n/);
      
      let contentFile: string | null = null;
      for (const line of lines) {
        if (line.startsWith('content ')) {
          contentFile = line.slice('content '.length).trim();
          break;
        }
      }
      
      if (contentFile !== note.id) continue;

      let found = false;
      const newLines = lines.map((line) => {
        if (line.startsWith('hidden ')) {
          found = true;
          return `hidden ${hidden ? '1' : '0'}`;
        }
        return line;
      });
      
      if (!found) {
        newLines.push(`hidden ${hidden ? '1' : '0'}`);
      }

      await fs.writeFile(infoPath, newLines.join('\n'), 'utf8');
      return;
    } catch {
      continue;
    }
  }
}
