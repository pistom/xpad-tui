import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import type { ConfigFieldFocus } from '../types/index.js';

type ConfigEditorProps = {
  editorValue: string;
  notesDirValue: string;
  focusedField: ConfigFieldFocus;
  onEditorChange: (value: string) => void;
  onNotesDirChange: (value: string) => void;
  onEditorSubmit: (value: string) => void;
  onNotesDirSubmit: (value: string) => void;
};

export default function ConfigEditor({
  editorValue,
  notesDirValue,
  focusedField,
  onEditorChange,
  onNotesDirChange,
  onEditorSubmit,
  onNotesDirSubmit,
}: ConfigEditorProps): React.ReactElement {
  return (
    <Box 
      borderStyle="round" 
      borderColor="cyan" 
      marginTop={0} 
      width="100%" 
      flexDirection="column"
    >
      <Text bold>Application configuration</Text>
      <Box flexDirection="row" width="100%">
        <Text color="gray">Editor command (overrides $EDITOR): </Text>
        <TextInput
          isDisabled={focusedField !== 'editor'}
          defaultValue={editorValue}
          onChange={onEditorChange}
          onSubmit={onEditorSubmit}
        />
      </Box>
      <Box marginTop={1} flexDirection="row" width="100%">
        <Text color="gray">Notes directory (default ~/.config/xpad): </Text>
        <TextInput
          isDisabled={focusedField !== 'notesDir'}
          defaultValue={notesDirValue}
          onChange={onNotesDirChange}
          onSubmit={onNotesDirSubmit}
        />
      </Box>
      <Box marginTop={1} flexDirection="row" width="100%">
        <Text color="gray">Enter to save, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
