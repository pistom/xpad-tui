import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import NotesList from './ui/NotesList.js';
import NoteView from './ui/NoteView.js';
import ControlsPopup from './ui/ControlsPopup.js';
import ConfirmDialog from './ui/ConfirmDialog.js';
import ConfigEditor from './ui/ConfigEditor.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useAppConfig } from './hooks/useAppConfig.js';
import { useNotesList } from './hooks/useNotesList.js';
import { useNoteSelection } from './hooks/useNoteSelection.js';
import { setNoteHidden, removeNote, createNote } from './services/noteService.js';
import { editNoteInEditor, createNoteInEditor } from './services/editorService.js';
import { resolveNotesDir } from './config.js';
import { copyToClipboardOsc52, calculateLayoutDimensions, clampIndex } from './utils/uiUtils.js';
import {
  handleNavigationInput,
  handleSelectionInput,
  handleNoteActionInput,
  shouldShowControls,
  shouldStartConfigEdit,
  shouldQuit,
} from './handlers/keyboardHandlers.js';
import type { Note, InkKey, PaneFocus, ConfigFieldFocus } from './types/index.js';

type AppProps = { 
  dir: string; 
  editor?: string;
};

export default function App({ dir, editor }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [columns, rows] = useTerminalSize();
  
  const {
    config,
    effectiveDir,
    setEffectiveDir,
    configEditing,
    setConfigEditing,
    configEditorInput,
    setConfigEditorInput,
    configNotesDirInput,
    setConfigNotesDirInput,
    updateConfig
  } = useAppConfig(dir);
  
  const [showHidden, setShowHidden] = useState(false);
  const { notes, dirExists, reloadNotes } = useNotesList(effectiveDir, showHidden);
  const [idx, setIdx] = useState(0);
  
  const [showControls, setShowControls] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [configFocusedField, setConfigFocusedField] = useState<ConfigFieldFocus>('editor');
  
  const [selectionActive, setSelectionActive] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectionCursor, setSelectionCursor] = useState<number | null>(null);
  const [noteLinesCount, setNoteLinesCount] = useState(0);
  const [noteCursor, setNoteCursor] = useState(0);
  const [paneFocus, setPaneFocus] = useState<PaneFocus>('list');
  
  const { noteScroll } = useNoteSelection(
    noteLinesCount, 
    rows, 
    selectionActive, 
    selectionCursor, 
    noteCursor
  );

  useEffect(() => {
    if (notes.length === 0) {
      setIdx(-1);
      return;
    }
    setIdx(prev => clampIndex(prev, notes.length));
  }, [notes.length]);

  useEffect(() => {
    setNoteCursor(0);
    setSelectionActive(false);
    setSelectionAnchor(null);
    setSelectionCursor(null);
  }, [idx]);

  const yankSelectionToClipboard = async (note: Note) => {
    const allLines = (note.content || '').split(/\r?\n/);
    const start = Math.min(selectionAnchor || 0, selectionCursor || 0);
    const end = Math.max(selectionAnchor || 0, selectionCursor || 0);
    const textToCopy = allLines.slice(start, end + 1).join('\n');
    
    copyToClipboardOsc52(textToCopy);
    setSelectionActive(false);
    setSelectionAnchor(null);
    setSelectionCursor(null);
  };

  const yankFullNoteToClipboard = async (note: Note) => {
    copyToClipboardOsc52(note.content || '');
  };

  const handleEditNote = async () => {
    const note = notes[idx];
    if (!note) return;
    
    await editNoteInEditor(note, config, editor);
    await reloadNotes();
  };

  const handleCreateNote = async () => {
    const content = await createNoteInEditor(config, editor);
    const firstLine = content.split(/\r?\n/)[0] || '';
    const title = firstLine.trim() || '';
    const created = await createNote(effectiveDir, title || undefined, content);
    
    await reloadNotes();
    const newIdx = notes.findIndex((x) => x.id === created.id);
    setIdx(newIdx !== -1 ? newIdx : clampIndex(idx, notes.length));
  };

  const handleDeleteNote = async () => {
    if (pendingDeleteIdx === null) return;
    
    const toDelete = notes[pendingDeleteIdx];
    try {
      await removeNote(toDelete);
    } catch {
      // ignore
    }
    
    await reloadNotes();
    setIdx(clampIndex(idx, notes.length));
    setShowDeleteConfirm(false);
    setPendingDeleteIdx(null);
  };

  const handleToggleHidden = async () => {
    const note = notes[idx];
    if (!note) return;
    
    await setNoteHidden(note, !note.hidden);
    await reloadNotes();
    setIdx(clampIndex(idx, notes.length));
  };

  useInput(async (input: string, key: InkKey) => {
    if (showControls) {
      setShowControls(false);
      return;
    }

    if (configEditing) {
      if (key.escape) {
        setConfigEditing(false);
        setConfigEditorInput(config.editor || '');
        setConfigNotesDirInput(config.notesDir || '');
      }
      if (key.tab) {
        setConfigFocusedField(f => f === 'editor' ? 'notesDir' : 'editor');
      }
      return;
    }

    if (showDeleteConfirm) {
      if (key.escape) {
        setShowDeleteConfirm(false);
        setPendingDeleteIdx(null);
      }
      return;
    }

    const currentNote = notes[idx];

    if (handleSelectionInput(
      input,
      key,
      { active: selectionActive, anchor: selectionAnchor, cursor: selectionCursor },
      currentNote,
      {
        startSelection: () => {
          setSelectionActive(true);
          setSelectionAnchor(noteCursor);
          setSelectionCursor(noteCursor);
        },
        moveSelectionUp: () => {
          setSelectionCursor(c => Math.max(0, (c ?? 0) - 1));
        },
        moveSelectionDown: () => {
          setSelectionCursor(c => Math.min(noteLinesCount - 1, (c ?? 0) + 1));
        },
        yankSelection: yankSelectionToClipboard,
        yankFullNote: yankFullNoteToClipboard,
        cancelSelection: () => {
          setSelectionActive(false);
          setSelectionAnchor(null);
          setSelectionCursor(null);
        }
      }
    )) {
      return;
    }

    if (shouldShowControls(input, key)) {
      setShowControls(true);
      return;
    }

    if (shouldStartConfigEdit(input)) {
      setConfigEditorInput(config.editor || '');
      setConfigNotesDirInput(config.notesDir || '');
      setConfigFocusedField('editor');
      setConfigEditing(true);
      return;
    }

    if (shouldQuit(input)) {
      exit();
      return;
    }

    if (handleNavigationInput(input, key, paneFocus, selectionActive, {
      moveListUp: () => setIdx(i => Math.max(0, (i === -1 ? 0 : i) - 1)),
      moveListDown: () => setIdx(i => Math.min(notes.length - 1, Math.max(0, (i === -1 ? 0 : i) + 1))),
      moveNoteUp: () => setNoteCursor(c => Math.max(0, c - 1)),
      moveNoteDown: () => setNoteCursor(c => Math.min(Math.max(0, noteLinesCount - 1), c + 1)),
      movePaneFocusToList: () => setPaneFocus('list'),
      movePaneFocusToNote: () => setPaneFocus('note'),
    })) {
      return;
    }

    if (handleNoteActionInput(input, currentNote, {
      editNote: handleEditNote,
      createNote: handleCreateNote,
      deleteNote: () => {
        setPendingDeleteIdx(idx);
        setShowDeleteConfirm(true);
      },
      toggleHidden: handleToggleHidden,
      toggleShowHidden: () => setShowHidden(prev => !prev),
    })) {
      return;
    }
  });

  const { leftWidth, rightWidth } = calculateLayoutDimensions(columns);

  const handleEditorSubmit = async (value: string) => {
    const newConfig = { ...config, editor: value.trim() || undefined };
    await updateConfig(newConfig);
    setConfigEditing(false);
  };

  const handleNotesDirSubmit = async (value: string) => {
    const notesDir = value.trim() || undefined;
    const newConfig = { ...config, notesDir };
    await updateConfig(newConfig);
    setEffectiveDir(resolveNotesDir(newConfig));
    setConfigEditing(false);
  };

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {showDeleteConfirm && pendingDeleteIdx !== null && (
        <ConfirmDialog
          message={`Delete note "${notes[pendingDeleteIdx]?.title || notes[pendingDeleteIdx]?.id}"?`}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setPendingDeleteIdx(null);
          }}
          onConfirm={handleDeleteNote}
        />
      )}
      {!showControls && !showDeleteConfirm && (
        dirExists ? (
          <Box flexDirection="row" flexGrow={1}>
            <Box 
              width={leftWidth} 
              borderStyle="round" 
              flexDirection="column" 
              borderColor={paneFocus === 'list' ? 'cyan' : 'gray'}
            >
              <Text bold>Notes</Text>
              <NotesList 
                notes={notes} 
                selectedIndex={idx} 
                width={leftWidth} 
                height={rows - 6} 
              />
            </Box>
            <Box 
              marginLeft={1} 
              width={rightWidth} 
              flexDirection="column" 
              borderStyle="round" 
              borderColor={paneFocus === 'note' ? 'cyan' : 'gray'}
            >
              <NoteView
                note={notes[idx]}
                width={rightWidth}
                height={rows}
                selectionActive={selectionActive}
                selectionAnchor={selectionAnchor}
                selectionCursor={selectionCursor}
                onLinesChanged={setNoteLinesCount}
                noteCursor={noteCursor}
                noteScroll={noteScroll}
              />
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
            <Box borderStyle="round" padding={1} minWidth={60} flexDirection="column">
              <Text color="yellow">Notes directory not found:</Text>
              <Text>{effectiveDir}</Text>
              <Box marginTop={1} flexDirection="column">
                <Text>To create it, run:</Text>
                <Text color="gray">mkdir -p {effectiveDir}</Text>
                <Text>Or press 'c' to configure a different directory.</Text>
              </Box>
            </Box>
          </Box>
        )
      )}
      {showControls && <ControlsPopup onClose={() => setShowControls(false)} />}
      {configEditing && (
        <ConfigEditor
          editorValue={configEditorInput}
          notesDirValue={configNotesDirInput}
          focusedField={configFocusedField}
          onEditorChange={setConfigEditorInput}
          onNotesDirChange={setConfigNotesDirInput}
          onEditorSubmit={handleEditorSubmit}
          onNotesDirSubmit={handleNotesDirSubmit}
        />
      )}
    </Box>
  );
}
