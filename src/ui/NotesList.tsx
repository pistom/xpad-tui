import React from 'react';
import { Box, Text } from 'ink';
import type { Note } from '../types/index.js';
import { truncateText } from '../utils/uiUtils.js';

type NotesListProps = {
  notes: Note[];
  selectedIndex: number;
  width: number;
  height: number;
};

function deduplicateNotes(notes: Note[]): Note[] {
  return Array.from(new Map(notes.map((n) => [n.id, n])).values());
}

function calculateVisibleWindow(total: number, selectedIndex: number, height: number) {
  const rowsPerItem = 2;
  const needIndicators = total * rowsPerItem > height;
  const indicatorRows = needIndicators ? 2 : 0;
  const availableRows = Math.max(0, height - indicatorRows);
  const visibleFullItems = Math.floor(availableRows / rowsPerItem);
  const leftoverRows = availableRows - visibleFullItems * rowsPerItem;
  const extraTitle = leftoverRows >= 1 ? 1 : 0;
  const visibleCount = Math.max(1, Math.min(total, visibleFullItems + extraTitle));
  const half = Math.floor(visibleCount / 2);
  const clampedSelection = Math.min(Math.max(0, selectedIndex), Math.max(0, total - 1));

  let start = Math.max(0, clampedSelection - half);
  if (start + visibleCount > total) {
    start = Math.max(0, total - visibleCount);
  }
  
  const end = Math.min(total, start + visibleCount);
  const separatorsAvailable = Math.max(0, availableRows - visibleCount);

  return { start, end, separatorsAvailable, clampedSelection };
}

export default function NotesList({ notes, selectedIndex, width, height }: NotesListProps) {
  const uniqueNotes = deduplicateNotes(notes);
  const cardWidth = Math.max(8, width - 4);
  const { start, end, separatorsAvailable, clampedSelection } = calculateVisibleWindow(
    uniqueNotes.length, 
    selectedIndex, 
    height
  );
  
  const visibleNotes = uniqueNotes.slice(start, end);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {start > 0 ? <Text color="gray">  ▲ more</Text> : <Text>{'  '}</Text>}
      {(() => {
        let remainingSeparators = separatorsAvailable;
        return visibleNotes.map((note, idx) => {
          const globalIdx = start + idx;
          const isSelected = globalIdx === clampedSelection;
          const leading = isSelected ? '▶ ' : '  ';
          const title = truncateText(note.title || '', Math.max(0, cardWidth - 2));
          const showSeparator = remainingSeparators > 0;
          if (showSeparator) remainingSeparators -= 1;
          const separatorLength = Math.max(8, Math.max(0, cardWidth - 2));
          const titleColor = note.hidden ? 'gray' : note.textColor;
          
          return (
            <React.Fragment key={note.id}>
              <Text color={titleColor} bold={isSelected}>{leading}{title}</Text>
              {showSeparator && <Text color="gray">{'  ' + '─'.repeat(separatorLength)}</Text>}
            </React.Fragment>
          );
        });
      })()}
      {end < uniqueNotes.length && <Text color="gray">  ▼ more</Text>}
    </Box>
  );
}
