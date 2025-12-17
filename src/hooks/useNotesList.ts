import { useState, useEffect } from 'react';
import { loadNotes } from '../services/noteService.js';
import type { Note } from '../types/index.js';
import fs from 'fs/promises';

export function useNotesList(effectiveDir: string, showHidden: boolean) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dirExists, setDirExists] = useState(true);

  const reloadNotes = async () => {
    try {
      await fs.access(effectiveDir);
      setDirExists(true);
      const allNotes = await loadNotes(effectiveDir);
      const filtered = showHidden ? allNotes : allNotes.filter((note) => !note.hidden);
      setNotes(filtered);
    } catch {
      setDirExists(false);
      setNotes([]);
    }
  };

  useEffect(() => {
    reloadNotes();
  }, [effectiveDir, showHidden]);

  return { notes, setNotes, dirExists, reloadNotes };
}
