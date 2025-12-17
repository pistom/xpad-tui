import tmp from 'tmp';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';
import which from 'which';
import type { Note, AppConfig } from '../types/index.js';
import { saveNote } from './noteService.js';

function validateEditor(editorCmd: string): void {
  const baseCommand = editorCmd.split(/\s+/)[0];
  try {
    which.sync(baseCommand);
  } catch {
    throw new Error(`Editor '${baseCommand}' not found. Please check that it is installed and available in your PATH.`);
  }
}

export async function editNoteInEditor(note: Note, config: AppConfig, editorCmd: string): Promise<void> {
  validateEditor(editorCmd);
  
  const tempFile = tmp.fileSync({ postfix: '.md' });
  await fs.writeFile(tempFile.name, note.content || '', 'utf8');
  
  spawnSync(editorCmd, [tempFile.name], { stdio: 'inherit' });
  
  const content = await fs.readFile(tempFile.name, 'utf8');
  note.content = content;
  await saveNote(note);
  
  tempFile.removeCallback();
}

export async function createNoteInEditor(config: AppConfig, editorCmd: string): Promise<string> {
  validateEditor(editorCmd);
  
  const tempFile = tmp.fileSync({ postfix: '.md' });
  
  spawnSync(editorCmd, [tempFile.name], { stdio: 'inherit' });
  
  const content = await fs.readFile(tempFile.name, 'utf8');
  tempFile.removeCallback();
  
  return content;
}
