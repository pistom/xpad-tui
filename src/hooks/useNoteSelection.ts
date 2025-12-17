import { useState, useEffect } from 'react';

export function useNoteSelection(noteLinesCount: number, rows: number, selectionActive: boolean, selectionCursor: number | null, noteCursor: number) {
  const [noteScroll, setNoteScroll] = useState(0);

  useEffect(() => {
    const titleLines = 1;
    const padding = 2;
    const availableLines = Math.max(0, rows - titleLines - padding - 1);
    const targetCursor = (selectionActive && typeof selectionCursor === 'number') ? selectionCursor : noteCursor;
    
    setNoteScroll((currentScroll) => {
      const maxScroll = Math.max(0, noteLinesCount - availableLines);
      let desired = currentScroll;
      
      if (targetCursor < currentScroll) {
        desired = targetCursor;
      } else if (targetCursor >= currentScroll + availableLines) {
        desired = targetCursor - Math.max(0, availableLines - 1);
      }
      
      desired = Math.max(0, Math.min(desired, maxScroll));
      return desired;
    });
  }, [noteCursor, selectionActive, selectionCursor, noteLinesCount, rows]);

  return { noteScroll, setNoteScroll };
}
