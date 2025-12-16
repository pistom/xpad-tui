import React from 'react';
import { Box, Text } from 'ink';
import type { Note } from '../xpad.js';

interface NotesListProps {
  notes: Note[];
  selectedIndex: number;
  width: number; // available width for list pane
  height: number; // available height for list pane
}

export default function NotesList({ notes, selectedIndex, width, height }: NotesListProps) {
  // Single-column list: one line per item, scrollable window
  const cardWidth = Math.max(8, width - 4);

  // dedupe notes by id to avoid accidental duplicate rendering
  const uniq: Note[] = Array.from(new Map(notes.map((n) => [n.id, n])).values());

  // Calculate visible window. Each note normally uses two rows: title + separator.
  const total = uniq.length;

  const rowsPerItem = 2; // title + separator

  // Determine if we need up/down indicators (they take one row each)
  const needIndicators = total * rowsPerItem > height;
  const indicatorRows = needIndicators ? 2 : 0;

  // Available rows after reserving indicators
  const availableRows = Math.max(0, height - indicatorRows);

  // Fit as many full items (title + separator) as possible
  const visibleFullItems = Math.floor(availableRows / rowsPerItem);
  const leftoverRows = availableRows - visibleFullItems * rowsPerItem;
  const extraTitle = leftoverRows >= 1 ? 1 : 0; // use one leftover row to show a title-only item

  const visibleCount = Math.max(1, Math.min(total, visibleFullItems + extraTitle));
  const half = Math.floor(visibleCount / 2);

  // Clamp selectedIndex to available range to avoid NaN/negative start
  const sel = Math.min(Math.max(0, selectedIndex), Math.max(0, total - 1));

  let start = Math.max(0, sel - half);
  if (start + visibleCount > total) start = Math.max(0, total - visibleCount);
  const end = Math.min(total, start + visibleCount);
  const visibleNotes = uniq.slice(start, end);
  // Number of separator rows available to render (may be less than visibleCount in tight spaces)
  const separatorsAvailable = Math.max(0, availableRows - visibleCount);

  const truncateToWidth = (s: string, w: number) => {
    if (!s) return '';
    const clean = s.replace(/\s+/g, ' ').trim();
    return clean.length > w ? clean.slice(0, w - 1) + '…' : clean;
  };

  // Render strictly single-column, scrollable list
  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {start > 0 ? (
        <Text color="gray">  ▲ more</Text>
      ) : <Text>{'  '}</Text>}
      {(() => {
        let seps = separatorsAvailable;
        return visibleNotes.map((note, idx) => {
          const globalIdx = start + idx;
          const isSelected = globalIdx === sel;
          const leading = isSelected ? '▶ ' : '  ';
          const title = truncateToWidth(note.title || '', Math.max(0, cardWidth - 2));
          const showSeparator = seps > 0;
          if (showSeparator) seps -= 1;
          const sepLen = Math.max(8, Math.max(0, cardWidth - 2));
          const titleColor = note.hidden ? 'gray' : note.textColor;
          return (
            <React.Fragment key={note.id}>
              <Text color={titleColor} bold={isSelected}>{leading}{title}</Text>
              {showSeparator && <Text color="gray">{'  ' + '─'.repeat(sepLen)}</Text>}
            </React.Fragment>
          );
        });
      })()}
      {end < total && (
        <Text color="gray">  ▼ more</Text>
      )}
    </Box>
  );
}
