import { useState, useEffect } from 'react';
import { loadNotes } from '../services/noteService.js';
import type { Note, SortMode } from '../types/index.js';
import { sortNotes } from '../utils/noteUtils.js';
import fs from 'fs/promises';

export function useNotesList(effectiveDir: string, showArchived: boolean, sortBy: SortMode) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dirExists, setDirExists] = useState(true);

  const reloadNotes = async () => {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(effectiveDir, { recursive: true });
      setDirExists(true);
      const allNotes = await loadNotes(effectiveDir);
      const filtered = showArchived ? allNotes : allNotes.filter((note) => !note.archived);
      setNotes(sortNotes(filtered, sortBy));
    } catch {
      setDirExists(false);
      setNotes([]);
    }
  };

  useEffect(() => {
    reloadNotes();
  }, [effectiveDir, showArchived, sortBy]);

  return { notes, setNotes, dirExists, reloadNotes };
}
