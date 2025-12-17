import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import type { Note } from '../types/index.js';

type NoteViewProps = {
  note?: Note;
  width: number;
  height?: number;
  selectionActive?: boolean;
  selectionAnchor?: number | null;
  selectionCursor?: number | null;
  onLinesChanged?: (count: number) => void;
  noteCursor?: number | null;
  noteScroll?: number;
};

function splitContentToLines(content: string, maxWidth: number): string[] {
  const rawLines = content.split(/\r?\n/);
  const width = Math.max(1, maxWidth);
  
  return rawLines.map((rawLine) => {
    const line = rawLine.replace(/\t/g, '    ');
    return line.length <= width ? line : line.slice(0, width);
  });
}

function calculateVisibleLines(lines: string[], height: number, noteScroll: number) {
  const titleLines = 1;
  const padding = 2;
  const availableLines = Math.max(0, height - titleLines - padding - 1);
  const showMore = lines.length > availableLines;
  const scroll = typeof noteScroll === 'number' ? noteScroll : 0;
  
  return showMore ? lines.slice(scroll, scroll + availableLines) : lines;
}

function isLineSelected(
  globalIdx: number, 
  selectionActive: boolean, 
  selectionAnchor: number | null, 
  selectionCursor: number | null
): boolean {
  if (!selectionActive || selectionAnchor === null || selectionCursor === null) {
    return false;
  }
  
  const start = Math.min(selectionAnchor, selectionCursor);
  const end = Math.max(selectionAnchor, selectionCursor);
  return globalIdx >= start && globalIdx <= end;
}

function getLineStyle(
  isSelected: boolean,
  isCaret: boolean,
  isEmpty: boolean,
  note: Note | undefined
) {
  if (isSelected) {
    return { bg: 'cyan', color: 'black', bold: false };
  }
  
  if (isCaret) {
    return { bg: 'gray', color: 'black', bold: true };
  }
  
  return { 
    bg: undefined, 
    color: isEmpty ? 'gray' : note?.textColor, 
    bold: false 
  };
}

export default function NoteView({
  note,
  width,
  height = 10,
  selectionActive = false,
  selectionAnchor = null,
  selectionCursor = null,
  onLinesChanged,
  noteCursor = null,
  noteScroll = 0,
}: NoteViewProps): React.ReactElement {
  if (!note) {
    return (
      <Box>
        <Text color="gray">No note selected</Text>
      </Box>
    );
  }

  const lines = splitContentToLines(note.content || '', Math.max(1, width - 4));

  useEffect(() => {
    if (onLinesChanged) {
      onLinesChanged(lines.length);
    }
  }, [lines.length]);

  const visibleLines = calculateVisibleLines(lines, height, noteScroll);

  return (
    <Box
      flexDirection="column"
      backgroundColor={note.backgroundColor}
      padding={1}
      width={width}
      height={height}
    >
      <Box flexDirection="column">
        {visibleLines.map((line, idx) => {
          const globalIdx = idx + noteScroll;
          const isEmpty = line.trim().length === 0;
          const selected = isLineSelected(globalIdx, selectionActive, selectionAnchor, selectionCursor);
          const caret = !selectionActive && typeof noteCursor === 'number' && globalIdx === noteCursor;
          const { bg, color, bold } = getLineStyle(selected, caret, isEmpty, note);

          return (
            <Text key={idx} color={color} backgroundColor={bg} bold={bold}>
              {isEmpty ? ' ' : line}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
