import fs from 'fs';
import path from 'path';
import type { NoteInfo } from '../types/index.js';

export function parseInfoFile(filePath: string): NoteInfo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const info: Partial<NoteInfo> = {};

    const rgbRe = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
    const toHex = (v: string) => {
      const m = v.trim().match(rgbRe);
      if (!m) return v.trim();
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
      const h = (n: number) => n.toString(16).padStart(2, '0');
      return `#${h(r)}${h(g)}${h(b)}`;
    };

    lines.forEach((line) => {
      const [key, ...valueParts] = line.split(' ');
      const value = valueParts.join(' ');

      switch (key) {
        case 'width':
          info.width = parseInt(value, 10);
          break;
        case 'height':
          info.height = parseInt(value, 10);
          break;
        case 'x':
          info.x = parseInt(value, 10);
          break;
        case 'y':
          info.y = parseInt(value, 10);
          break;
        case 'follow_font':
          info.followFont = value === '1';
          break;
        case 'follow_color':
          info.followColor = value === '1';
          break;
        case 'sticky':
          info.sticky = value === '1';
          break;
        case 'hidden':
          info.hidden = value === '1';
          break;
        case 'encrypted':
          info.encrypted = value === '1';
          break;
        case 'title':
          info.title = value;
          break;
        case 'back':
          info.backgroundColor = toHex(value);
          break;
        case 'text':
          info.textColor = toHex(value);
          break;
        case 'fontname':
          info.font = value;
          break;
        case 'content':
          info.contentFile = value;
          break;
      }
    });

    if (!info.contentFile) {
      throw new Error('Content file not specified in info file.');
    }

    return info as NoteInfo;
  } catch (error) {
    console.error(`Failed to parse info file at ${filePath}:`, error);
    return null;
  }
}

/**
 * Reads all info files in a directory and maps them to their content files.
 * @param directory - Path to the directory containing info files.
 * @returns Array of NoteInfo objects.
 */
export function getNotesFromDirectory(directory: string): NoteInfo[] {
  const files = fs.readdirSync(directory);
  const notes: NoteInfo[] = [];

  files.forEach((file) => {
    if (file.startsWith('info-')) {
      const filePath = path.join(directory, file);
      const noteInfo = parseInfoFile(filePath);
      if (noteInfo) {
        notes.push(noteInfo);
      }
    }
  });

  return notes;
}

/**
 * Checks if a line is a task line (starts with [ ], [✔], or [x])
 */
export function isTaskLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('[ ]') || trimmed.startsWith('[✔]') || trimmed.startsWith('[x]');
}

/**
 * Gets the task state from a line
 */
export function getTaskState(line: string): 'empty' | 'checked' | 'cancelled' | null {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('[ ]')) return 'empty';
  if (trimmed.startsWith('[✔]')) return 'checked';
  if (trimmed.startsWith('[x]')) return 'cancelled';
  return null;
}

/**
 * Toggles a task line between empty and checked
 */
export function toggleTaskCheck(line: string): string {
  const state = getTaskState(line);
  if (state === null) return line;
  
  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  const rest = line.replace(/^\s*\[([ ✔x])\]/, '').trimStart();
  
  if (state === 'empty') {
    return `${leadingWhitespace}[✔] ${rest}`;
  } else {
    return `${leadingWhitespace}[ ] ${rest}`;
  }
}

/**
 * Toggles a task line to cancelled state
 */
export function toggleTaskCancel(line: string): string {
  const state = getTaskState(line);
  if (state === null) return line;
  
  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  const rest = line.replace(/^\s*\[([ ✔x])\]/, '').trimStart();
  
  if (state === 'cancelled') {
    return `${leadingWhitespace}[ ] ${rest}`;
  } else {
    return `${leadingWhitespace}[x] ${rest}`;
  }
}

/**
 * Updates a specific line in note content
 */
export function updateNoteLineContent(content: string, lineIndex: number, newLineContent: string): string {
  const lines = content.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  
  lines[lineIndex] = newLineContent;
  return lines.join('\n');
}