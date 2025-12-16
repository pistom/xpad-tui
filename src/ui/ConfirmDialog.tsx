import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {TextInput} from '@inkjs/ui';

type Props = {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((input: string, key: { escape?: boolean; ctrl?: boolean; meta?: boolean; shift?: boolean }) => {
    if (key && key.escape) onCancel();
  });

  return (
    <Box position="absolute" left={0} top={0} width="100%" height="100%" flexDirection="column" justifyContent="center" alignItems="center">
      <Box borderStyle="round" borderColor="red" padding={1} flexDirection="column" minWidth={40}>
        <Text bold color="red">Confirm</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>{message}</Text>
          <Text color="gray">Type 'y' or 'yes' then Enter to confirm, Esc or anything else to cancel</Text>
        </Box>
        <Box marginTop={1}>
          <TextInput
            defaultValue={value}
            onChange={(v: string) => setValue(v)}
            onSubmit={(v: string) => {
              const ok = (v || '').trim().toLowerCase();
              if (ok === 'y' || ok === 'yes') {
                onConfirm();
              } else {
                onCancel();
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
