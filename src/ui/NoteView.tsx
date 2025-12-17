import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import type { Note, SelectionMode } from '../types/index.js';

type NoteViewProps = {
  note?: Note;
  width: number;
  height?: number;
  selectionActive?: boolean;
  selectionAnchor?: number | null;
  selectionCursor?: number | null;
  selectionMode?: SelectionMode;
  charAnchorLine?: number;
  charAnchorCol?: number;
  charCursorLine?: number;
  charCursorCol?: number;
  onLinesChanged?: (count: number) => void;
  noteCursor?: number | null;
  noteCursorCol?: number;
  cursorVisible?: boolean;
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
  const padding = 2;
  const border = 2;
  const availableLines = Math.max(0, height - padding - border);
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

function getCharSelectionForLine(
  lineIdx: number,
  lineContent: string,
  selectionActive: boolean,
  selectionMode: SelectionMode | undefined,
  anchorLine: number,
  anchorCol: number,
  cursorLine: number,
  cursorCol: number
): { start: number; end: number } | null {
  if (!selectionActive || selectionMode !== 'char') {
    return null;
  }

  const startLine = Math.min(anchorLine, cursorLine);
  const endLine = Math.max(anchorLine, cursorLine);

  if (lineIdx < startLine || lineIdx > endLine) {
    return null;
  }

  let startCol = 0;
  let endCol = lineContent.length;

  if (lineIdx === startLine && lineIdx === endLine) {
    // Selection on single line
    startCol = Math.min(anchorCol, cursorCol);
    endCol = Math.max(anchorCol, cursorCol);
  } else if (lineIdx === startLine) {
    // First line of multi-line selection
    startCol = anchorLine < cursorLine ? anchorCol : 0;
    endCol = anchorLine < cursorLine ? lineContent.length : anchorCol;
  } else if (lineIdx === endLine) {
    // Last line of multi-line selection
    startCol = anchorLine < cursorLine ? 0 : cursorCol;
    endCol = anchorLine < cursorLine ? cursorCol : lineContent.length;
  }

  return { start: startCol, end: endCol };
}

function renderLineWithCharSelection(
  line: string,
  charSelection: { start: number; end: number } | null,
  isEmpty: boolean,
  note: Note | undefined,
  cursorCol?: number | null
): React.ReactElement {
  if (!charSelection && cursorCol === null) {
    const color = isEmpty ? 'gray' : note?.textColor;
    return <Text color={color}>{isEmpty ? ' ' : line}</Text>;
  }
  
  if (!charSelection && cursorCol !== null && cursorCol !== undefined) {
    // Render single-character cursor
    const before = line.slice(0, cursorCol);
    const cursor = line[cursorCol] || ' ';
    const after = line.slice(cursorCol + 1);
    const color = isEmpty ? 'gray' : note?.textColor;
    
    return (
      <Text>
        {before && <Text color={color}>{before}</Text>}
        <Text backgroundColor="gray" color="black" bold>{cursor}</Text>
        {after && <Text color={color}>{after}</Text>}
        {!before && !cursor && !after && <Text color={color}> </Text>}
      </Text>
    );
  }

  // Handle selection rendering
  if (charSelection) {
    const { start, end } = charSelection;
    const before = line.slice(0, start);
    const selected = line.slice(start, end);
    const after = line.slice(end);

    const color = isEmpty ? 'gray' : note?.textColor;

    return (
      <Text>
        {before && <Text color={color}>{before}</Text>}
        {selected && <Text backgroundColor="cyan" color="black">{selected}</Text>}
        {after && <Text color={color}>{after}</Text>}
        {!before && !selected && !after && <Text color={color}> </Text>}
      </Text>
    );
  }

  // Fallback
  const color = isEmpty ? 'gray' : note?.textColor;
  return <Text color={color}>{isEmpty ? ' ' : line}</Text>;
}

export default function NoteView({
  note,
  width,
  height = 10,
  selectionActive = false,
  selectionAnchor = null,
  selectionCursor = null,
  selectionMode = 'line',
  charAnchorLine = 0,
  charAnchorCol = 0,
  charCursorLine = 0,
  charCursorCol = 0,
  onLinesChanged,
  noteCursor = null,
  noteCursorCol = 0,
  cursorVisible = false,
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
      padding={1}
      width={width}
      height={height}
    >
      <Box flexDirection="column">
        {visibleLines.map((line, idx) => {
          const globalIdx = idx + noteScroll;
          const isEmpty = line.trim().length === 0;
          
          if (selectionMode === 'char') {
            const charSelection = getCharSelectionForLine(
              globalIdx,
              line,
              selectionActive,
              selectionMode,
              charAnchorLine,
              charAnchorCol,
              charCursorLine,
              charCursorCol
            );
            
            const showCursor = cursorVisible && !selectionActive && typeof noteCursor === 'number' && globalIdx === noteCursor;
            
            return (
              <Box key={idx}>
                {renderLineWithCharSelection(
                  line, 
                  charSelection, 
                  isEmpty, 
                  note,
                  showCursor ? noteCursorCol : null
                )}
              </Box>
            );
          } else {
            // Line selection mode
            const selected = isLineSelected(globalIdx, selectionActive, selectionAnchor, selectionCursor);
            const showCursor = cursorVisible && !selectionActive && typeof noteCursor === 'number' && globalIdx === noteCursor;
            
            if (selected) {
              return (
                <Text key={idx} backgroundColor="cyan" color="black">
                  {isEmpty ? ' ' : line}
                </Text>
              );
            } else if (showCursor) {
              // Show single-character cursor in line mode too
              return (
                <Box key={idx}>
                  {renderLineWithCharSelection(line, null, isEmpty, note, noteCursorCol)}
                </Box>
              );
            } else {
              const color = isEmpty ? 'gray' : note?.textColor;
              return (
                <Text key={idx} color={color}>
                  {isEmpty ? ' ' : line}
                </Text>
              );
            }
          }
        })}
      </Box>
    </Box>
  );
}
