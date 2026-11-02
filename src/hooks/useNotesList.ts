import { useState, useEffect } from 'react';
import { loadNotes } from '../services/noteService.js';
import type { Note } from '../types/index.js';
import fs from 'fs/promises';

export function useNotesList(effectiveDir: string, showArchived: boolean) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dirExists, setDirExists] = useState(true);

  const reloadNotes = async () => {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(effectiveDir, { recursive: true });
      setDirExists(true);
      const allNotes = await loadNotes(effectiveDir);
      const filtered = showArchived ? allNotes : allNotes.filter((note) => !note.archived);
      setNotes(filtered);
    } catch {
      setDirExists(false);
      setNotes([]);
    }
  };

  useEffect(() => {
    reloadNotes();
  }, [effectiveDir, showArchived]);

  return { notes, setNotes, dirExists, reloadNotes };
}
