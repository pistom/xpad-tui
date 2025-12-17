import React from 'react';
import { Box, Text, useInput } from 'ink';

type ControlsPopupProps = {
  onClose: () => void;
};

const CONTROLS = [
  '? : Show controls',
  'H / L : Switch focus between Notes list (H) and Note view (L)',
  'j / k : Navigate up/down',
  'h / l : Navigate left/right (in note view)',
  'e : Edit note',
  'n : New note',
  'd : Delete note',
  'v : Enter character visual selection mode',
  'V : Enter line visual selection mode',
  'h/j/k/l : Move selection cursor (in char mode)',
  'w/b : Move by word forward/backward (in char mode)',
  '0/$ : Move to line start/end (in char mode)',
  'y : Yank (copy) selection in visual mode',
  'Y : Yank entire note',
  'Esc : Exit visual mode',
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
