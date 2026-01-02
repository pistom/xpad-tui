import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InkKey } from '../types/index.js';

type PasswordPromptProps = {
  message: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
};

export default function PasswordPrompt({ message, onSubmit, onCancel }: PasswordPromptProps) {
  const [password, setPassword] = useState('');

  useInput((input: string, key: InkKey) => {
    if (key.escape) {
      onCancel();
    } else if (key.return) {
      if (password.trim()) {
        onSubmit(password);
      }
    } else if (key.backspace || key.delete) {
      setPassword(prev => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setPassword(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
      <Box marginBottom={1}>
        <Text bold color="yellow">🔒 {message}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Password: </Text>
        <Text>{'*'.repeat(password.length)}</Text>
      </Box>
      <Box>
        <Text dimColor>Press Enter to confirm, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
