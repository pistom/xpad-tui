import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

function isConfirmationText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((input: string, key: { escape?: boolean }) => {
    if (key?.escape) {
      onCancel();
    }
  });

  const handleSubmit = (inputValue: string) => {
    if (isConfirmationText(inputValue)) {
      onConfirm();
    } else {
      onCancel();
    }
  };

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
        borderColor="red" 
        padding={1} 
        flexDirection="column" 
        minWidth={40}
      >
        <Text bold color="red">Confirm</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>{message}</Text>
          <Text color="gray">Type 'y' or 'yes' then Enter to confirm, Esc or anything else to cancel</Text>
        </Box>
        <Box marginTop={1}>
          <TextInput
            defaultValue={value}
            onChange={setValue}
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>
    </Box>
  );
}
