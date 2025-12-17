import tmp from 'tmp';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';
import type { Note, AppConfig } from '../types/index.js';
import { saveNote } from './noteService.js';

export async function editNoteInEditor(note: Note, config: AppConfig, cliEditor?: string): Promise<void> {
  const tempFile = tmp.fileSync({ postfix: '.md' });
  await fs.writeFile(tempFile.name, note.content || '', 'utf8');
  
  const editorCmd = cliEditor || config.editor || process.env.EDITOR || 'vi';
  spawnSync(editorCmd, [tempFile.name], { stdio: 'inherit' });
  
  const content = await fs.readFile(tempFile.name, 'utf8');
  note.content = content;
  await saveNote(note);
  
  tempFile.removeCallback();
}

export async function createNoteInEditor(config: AppConfig, cliEditor?: string): Promise<string> {
  const tempFile = tmp.fileSync({ postfix: '.md' });
  
  const editorCmd = cliEditor || config.editor || process.env.EDITOR || 'vi';
  spawnSync(editorCmd, [tempFile.name], { stdio: 'inherit' });
  
  const content = await fs.readFile(tempFile.name, 'utf8');
  tempFile.removeCallback();
  
  return content;
}
