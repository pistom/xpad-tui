import React from 'react';
import { Box, Text } from 'ink';
import type { Note } from '../types/index.js';
import { truncateText } from '../utils/uiUtils.js';

export const GRID_CARD_WIDTH = 30;
export const GRID_CARD_HEIGHT = 9;
export const GRID_CARD_GAP = 2;

type NotesGridViewProps = {
  notes: Note[];
  width: number;
  height: number;
  selectedIndex: number;
};

function resolveTitle(note: Note): string {
  const explicit = (note.title || '').trim();
  if (explicit) return explicit;

  const firstNonEmpty = (note.content || '')
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);

  return (firstNonEmpty || note.id || 'Untitled').trim();
}

function buildPreview(note: Note, maxLines: number, maxWidth: number): string[] {
  const lines = (note.content || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  return lines
    .slice(0, maxLines)
    .map((line) => truncateText(line, maxWidth));
}

export default function NotesGridView({
  notes,
  width,
  height,
  selectedIndex,
}: NotesGridViewProps): React.ReactElement {
  const visibleNotes = notes.filter((note) => !note.hidden);
  const clampedSelected = Math.max(0, Math.min(selectedIndex, Math.max(visibleNotes.length - 1, 0)));

  const headerRows = 2; // title + spacing
  const usableHeight = Math.max(0, height - headerRows);

  const cardsPerRow = Math.max(1, Math.floor((width + GRID_CARD_GAP) / (GRID_CARD_WIDTH + GRID_CARD_GAP)));
  const rowsPerPage = Math.max(
    1,
    Math.floor((usableHeight + GRID_CARD_GAP) / (GRID_CARD_HEIGHT + GRID_CARD_GAP))
  );

  const totalRows = Math.max(1, Math.ceil(visibleNotes.length / cardsPerRow));
  const selectedRow = Math.floor(clampedSelected / cardsPerRow);
  const maxRowStart = Math.max(0, totalRows - rowsPerPage);
  const rowStart = Math.min(Math.max(0, selectedRow - Math.floor(rowsPerPage / 2)), maxRowStart);
  const startIndex = rowStart * cardsPerRow;
  const endIndex = Math.min(visibleNotes.length, startIndex + rowsPerPage * cardsPerRow);
  const windowNotes = visibleNotes.slice(startIndex, endIndex);

  const rows: Note[][] = [];
  for (let i = 0; i < rowsPerPage; i++) {
    const sliceStart = i * cardsPerRow;
    const sliceEnd = sliceStart + cardsPerRow;
    rows.push(windowNotes.slice(sliceStart, sliceEnd));
  }

  const emptyState = visibleNotes.length === 0;

  return (
    <Box flexDirection="column" width={width} height={height} paddingX={1} paddingY={0}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Notes wall</Text>
        <Text color="gray"> - {visibleNotes.length} visible</Text>
      </Box>

      {emptyState ? (
        <Text color="gray">No notes to show</Text>
      ) : (
        <Box flexDirection="column">
          {rows.map((row, rowIdx) => (
            <Box key={rowIdx} flexDirection="row" marginBottom={1}>
              {row.map((note, colIdx) => {
                const globalIndex = startIndex + rowIdx * cardsPerRow + colIdx;
                const isSelected = globalIndex === clampedSelected;
                const title = truncateText(resolveTitle(note), GRID_CARD_WIDTH - 4);
                const previewLines = buildPreview(note, GRID_CARD_HEIGHT - 3, GRID_CARD_WIDTH - 4);

                return (
                  <Box
                    key={note.id}
                    width={GRID_CARD_WIDTH}
                    height={GRID_CARD_HEIGHT}
                    marginRight={GRID_CARD_GAP}
                    borderStyle={isSelected ? 'round' : 'single'}
                    borderColor={isSelected ? 'cyan' : 'gray'}
                    paddingX={1}
                    paddingY={0}
                    flexDirection="column"
                  >
                    <Text bold color={note.textColor || 'yellow'}>{title}</Text>
                    <Box flexDirection="column" marginTop={1}>
                      {previewLines.map((line, idx) => (
                        <Text key={idx} dimColor>{line}</Text>
                      ))}
                    </Box>
                  </Box>
                );
              })}

              {row.length < cardsPerRow &&
                Array.from({ length: cardsPerRow - row.length }).map((_, fillerIdx) => (
                  <Box key={`filler-${fillerIdx}`} width={GRID_CARD_WIDTH} marginRight={GRID_CARD_GAP} />
                ))}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          hjkl move | Enter select | Tab/Esc exit
        </Text>
      </Box>
    </Box>
  );
}
