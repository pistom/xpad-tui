import fs from 'fs/promises';
import path from 'path';
import { parseInfoFile } from '../utils/noteUtils.js';
import type { Note } from '../types/index.js';
import { encryptText, decryptText } from '../utils/encryption.js';

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
      let title = '';
      
      try {
        const contentStat = await fs.stat(contentPath).catch(() => null);
        if (contentStat && contentStat.isFile()) {
          // If encrypted, show placeholder content but use saved title
          if (metadata.encrypted) {
            data = '[Encrypted - unlock to view]';
            title = metadata.title || contentName;
          } else {
            data = await fs.readFile(contentPath, 'utf8');
            const firstLine = data.split(/\r?\n/)[0] || '';
            title = firstLine.trim() || contentName;
          }
        }
      } catch {
        data = '';
        title = contentName;
      }

      const note: Note = { 
        id: contentName, 
        title, 
        content: data, 
        filePath: contentPath,
        ...metadata,
        isDecrypted: false
      };

      notes.push(note);
    } catch {
      continue;
    }
  }

  notes.sort((a, b) => a.title.localeCompare(b.title));
  return notes;
}

export async function saveNote(note: Note, password?: string): Promise<void> {
  if (note.encrypted && password) {
    // Encrypt the content before saving
    const encrypted = encryptText(note.content, password);
    await fs.writeFile(note.filePath, encrypted);
  } else {
    // Save as plain text
    await fs.writeFile(note.filePath, note.content, 'utf8');
  }
}

export async function decryptNote(note: Note, password: string): Promise<Note> {
  if (!note.encrypted) {
    return note;
  }

  const encryptedData = await fs.readFile(note.filePath);
  const decryptedContent = decryptText(encryptedData, password);
  const firstLine = decryptedContent.split(/\r?\n/)[0] || '';
  const title = firstLine.trim() || note.id;

  return {
    ...note,
    content: decryptedContent,
    title,
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
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  const id = `content-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(dir, id);
  const toWrite = content || title || '';
  
  // Write content (encrypted or plain)
  if (encrypted && password) {
    const encryptedData = encryptText(toWrite, password);
    await fs.writeFile(filePath, encryptedData);
  } else {
    await fs.writeFile(filePath, toWrite, 'utf8');
  }
  
  try {
    const infoId = `info-${Math.random().toString(36).slice(2, 8)}`;
    const infoPath = path.join(dir, infoId);
    const infoLines = [
      `hidden 0`, 
      `content ${id}`,
      ...(encrypted ? [`encrypted 1`] : [])
    ];
    await fs.writeFile(infoPath, infoLines.join('\n'), 'utf8');
  } catch {
    // ignore
  }

  return { 
    id, 
    title: title || id, 
    content: toWrite, 
    filePath,
    encrypted,
    isDecrypted: encrypted ? true : false
  };
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

export async function setNoteEncrypted(note: Note, encrypted: boolean, noteTitle?: string): Promise<void> {
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

      let foundEncrypted = false;
      let foundTitle = false;
      const newLines = lines.map((line) => {
        if (line.startsWith('encrypted ')) {
          foundEncrypted = true;
          return `encrypted ${encrypted ? '1' : '0'}`;
        }
        if (line.startsWith('title ')) {
          foundTitle = true;
          return encrypted && noteTitle ? `title ${noteTitle}` : line;
        }
        return line;
      });
      
      if (!foundEncrypted && encrypted) {
        newLines.push(`encrypted 1`);
      }
      
      if (!foundTitle && encrypted && noteTitle) {
        newLines.push(`title ${noteTitle}`);
      }

      await fs.writeFile(infoPath, newLines.join('\n'), 'utf8');
      return;
    } catch {
      continue;
    }
  }
}
