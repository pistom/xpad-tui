import React from 'react';
import { Box, Text, useInput } from 'ink';

type ControlsPopupProps = {
  onClose: () => void;
};

const CONTROLS = [
  '? : Show controls',
  'h / l : Switch focus between Notes list (h) and Note view (l)',
  'j / k : Navigate notes',
  'e : Edit note',
  'n : New note',
  'd : Delete note',
  'V : Enter visual selection mode',
  'j / k : Move note cursor up/down',
  'y : Yank (copy) selection in visual mode',
  'Y : Yank entire note',
  'c : Config editor',
  '. : Toggle selected note hidden',
  'a : Toggle showing hidden notes',
  'q : Quit',
];

export default function ControlsPopup({ onClose }: ControlsPopupProps): React.ReactElement {
  useInput((input: string, key: { escape?: boolean }) => {
    if (key?.escape || input) {
      onClose();
    }
  });

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
        minWidth={40}
      >
        <Text bold>Controls</Text>
        <Box marginTop={1} flexDirection="column">
          {CONTROLS.map((control, idx) => (
            <Text key={idx}>{control}</Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press any key (or Esc / ?) to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
