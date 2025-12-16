import React from 'react';
import { Box, Text } from 'ink';

type Props = {
  onClose: () => void;
};

export default function ControlsPopup({ onClose }: Props): React.ReactElement {
  return (
    <Box position="absolute" left={0} top={0} width="100%" height="100%" flexDirection="column" justifyContent="center" alignItems="center">
      <Box borderStyle="round" borderColor="yellow" padding={1} flexDirection="column" minWidth={40}>
        <Text bold>Controls</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>? : Show controls</Text>
          <Text>j / k : Navigate notes</Text>
          <Text>e : Edit note</Text>
          <Text>n : New note</Text>
          <Text>d : Delete note</Text>
          <Text>c : Config editor</Text>
          <Text>H : Toggle selected note hidden</Text>
          <Text>h : Show hidden notes</Text>
          <Text>q : Quit</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press any key (or Esc / ?) to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
