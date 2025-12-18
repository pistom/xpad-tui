import React from 'react';
import { Box, Text, useInput } from 'ink';

type ControlsPopupProps = {
  onClose: () => void;
};

type ControlGroup = {
  title: string;
  items: string[];
};

const CONTROL_GROUPS: ControlGroup[] = [
  {
    title: 'Navigation',
    items: [
      'j / k : Move up/down',
      'h / l : Move left/right inside note',
      'H / L : Focus Notes list / Note view',
    ],
  },
  {
    title: 'Grid view',
    items: [
      'Tab : Toggle grid overview',
      'h / j / k / l : Move in grid',
      'Enter : Open selected note',
      'Tab / Esc : Exit grid view',
    ],
  },
  {
    title: 'Filtering',
    items: ['/ : Start filter', 'Esc : Clear filter'],
  },
  {
    title: 'Editing',
    items: ['e : Edit note', 'n : New note', 'd : Delete note'],
  },
  {
    title: 'Visual select',
    items: [
      'v : Char visual mode',
      'V : Line visual mode',
      'h / j / k / l : Move cursor (visual)',
      'w / b : Move by word (char mode)',
      '0 / $ : Line start/end (char mode)',
      'y : Yank selection',
      'Y : Yank entire note',
      'Esc : Exit visual mode',
    ],
  },
  {
    title: 'Hidden & config',
    items: ['. : Toggle note hidden', 'a : Show/Hide hidden notes', 'c : Open config'],
  },
  {
    title: 'Global',
    items: ['? : Show controls', 'q : Quit'],
  },
];

function splitIntoColumns(groups: ControlGroup[], columns: number) {
  const cols: { groups: ControlGroup[]; lines: number }[] = Array.from({ length: columns }, () => ({
    groups: [],
    lines: 0,
  }));

  const groupLines = (g: ControlGroup) => 1 + g.items.length + 1; // title + items + spacer

  groups.forEach((g) => {
    const targetIdx = cols.reduce((bestIdx, col, idx, arr) => {
      return col.lines < arr[bestIdx].lines ? idx : bestIdx;
    }, 0);
    cols[targetIdx].groups.push(g);
    cols[targetIdx].lines += groupLines(g);
  });

  return cols;
}

export default function ControlsPopup({ onClose }: ControlsPopupProps): React.ReactElement {
  useInput((input: string, key: { escape?: boolean }) => {
    if (key?.escape || input) {
      onClose();
    }
  });

  const cols = splitIntoColumns(CONTROL_GROUPS, 2);
  const termCols = process.stdout?.columns || 80;
  const minWidth = Math.max(40, Math.min(termCols - 4, cols.length > 1 ? 70 : 50));

  return (
    <Box 
      position="absolute" 
      left={0} 
      top={0} 
      width="100%" 
      height="100%" 
      flexDirection="column" 
      justifyContent="center" 
      alignItems="center"
    >
      <Box 
        borderStyle="round" 
        borderColor="yellow" 
        padding={1} 
        flexDirection="column" 
        minWidth={minWidth}
      >
        <Text bold>Controls</Text>
        <Box marginTop={1} flexDirection="row">
          {cols.map((col, colIdx) => (
            <Box key={colIdx} flexDirection="column" marginRight={colIdx < cols.length - 1 ? 4 : 0}>
              {col.groups.map((group, groupIdx) => (
                <Box key={`${group.title}-${groupIdx}`} flexDirection="column" marginBottom={1}>
                  <Text bold>{group.title}</Text>
                  {group.items.map((item) => (
                    <Text key={item}>  {item}</Text>
                  ))}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press any key (or Esc / ?) to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
