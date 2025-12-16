import React from 'react';
import { Box, Text } from 'ink';
import type { Note } from '../xpad.js';

export default function NoteView({ note, width, height }: { note?: Note; width: number; height?: number }) {
  if (!note) return <Box><Text color="gray">No note selected</Text></Box>;

  // Convert content (with newlines) to an array of lines fitting the width.
  // Preserve empty lines and do NOT wrap long lines — simply cut them to maxWidth.
  const contentToLines = (content: string, maxWidth: number): string[] => {
    const rawLines = content.split(/\r?\n/);
    const out: string[] = [];
    const w = Math.max(1, maxWidth);
    for (const rl of rawLines) {
      // Replace tabs with spaces and preserve all other characters (including empty lines)
      const line = rl.replace(/\t/g, '    ');
      if (line.length <= w) {
        out.push(line);
      } else {
        out.push(line.slice(0, w));
      }
    }
    return out;
  };

  // compute available inner height: subtract title and some padding/borders
  const titleLines = 1;
  const padding = 2; // top & bottom inside border
  const availableLines = Math.max(0, (height || 10) - titleLines - padding - 1);

  const lines = contentToLines(note.content || '', Math.max(1, width - 4));

  const showMore = lines.length > availableLines;
  const visible = showMore ? lines.slice(0, availableLines) : lines;

  // If we need to indicate more content, append '…' to the last visible line (making space)
  if (showMore && visible.length > 0) {
    const last = visible[visible.length - 1];
    const ell = ' …';
    const maxLineLen = Math.max(0, width - 4);
    if (last.length + ell.length > maxLineLen) {
      visible[visible.length - 1] = last.slice(0, Math.max(0, maxLineLen - ell.length)) + ell;
    } else {
      visible[visible.length - 1] = last + ell;
    }
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      backgroundColor={note.backgroundColor}
      padding={1}
      width={width}
      height={height}
    >
      <Box flexDirection="column">
        {visible.map((l, i) => {
          const isEmpty = l.trim().length === 0;
          return (
            <Text key={i} color={isEmpty ? 'gray' : note.textColor}>
              {isEmpty ? ' ' : l}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
