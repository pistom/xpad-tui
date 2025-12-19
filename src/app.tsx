import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import NotesList from './ui/NotesList.js';
import NoteView from './ui/NoteView.js';
import NotesGridView, { GRID_CARD_GAP, GRID_CARD_WIDTH } from './ui/NotesGridView.js';
import ControlsPopup from './ui/ControlsPopup.js';
import ConfirmDialog from './ui/ConfirmDialog.js';
import ConfigEditor from './ui/ConfigEditor.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useAppConfig } from './hooks/useAppConfig.js';
import { useNotesList } from './hooks/useNotesList.js';
import { useNoteSelection } from './hooks/useNoteSelection.js';
import { setNoteHidden, removeNote, createNote, saveNote } from './services/noteService.js';
import { editNoteInEditor, createNoteInEditor } from './services/editorService.js';
import { resolveNotesDir } from './config.js';
import { copyToClipboardOsc52, calculateLayoutDimensions, clampIndex } from './utils/uiUtils.js';
import { 
  isTaskLine, 
  toggleTaskCheck, 
  toggleTaskCancel, 
  updateNoteLineContent 
} from './utils/noteUtils.js';
import {
  handleNavigationInput,
  handleSelectionInput,
  handleNoteActionInput,
  handleFilterInput,
  shouldShowControls,
  shouldStartConfigEdit,
  shouldStartFilter,
  shouldQuit,
  shouldToggleGridView,
  moveCharLeft as moveCharLeftUtil,
  moveCharRight as moveCharRightUtil,
  moveCharUp as moveCharUpUtil,
  moveCharDown as moveCharDownUtil,
  moveWordForward as moveWordForwardUtil,
  moveWordBackward as moveWordBackwardUtil,
  moveToLineStart as moveToLineStartUtil,
  moveToLineEnd as moveToLineEndUtil,
} from './handlers/keyboardHandlers.js';
import type { Note, InkKey, PaneFocus, ConfigFieldFocus } from './types/index.js';

type AppProps = { 
  dir: string; 
  cliEditor?: string;
};

export default function App({ dir, cliEditor }: AppProps): React.ReactElement {
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
  
  // Compute effective editor: CLI arg > config > env > default
  const effectiveEditor = cliEditor || config.editor || process.env.EDITOR || 'vi';
  
  const [showHidden, setShowHidden] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [filterInput, setFilterInput] = useState('');
  const [gridViewActive, setGridViewActive] = useState(false);
  const [gridSelectedIndex, setGridSelectedIndex] = useState(0);
  
  const { notes: allNotes, dirExists, reloadNotes } = useNotesList(effectiveDir, showHidden);
  
  // Filter notes based on filter input
  const notes = React.useMemo(() => {
    if (!filterInput.trim()) {
      return allNotes;
    }
    const searchTerm = filterInput.toLowerCase();
    return allNotes.filter(note => 
      (note.title || '').toLowerCase().includes(searchTerm) ||
      (note.content || '').toLowerCase().includes(searchTerm)
    );
  }, [allNotes, filterInput]);
  
  const [idx, setIdx] = useState(0);
  
  const [showControls, setShowControls] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [configFocusedField, setConfigFocusedField] = useState<ConfigFieldFocus>('editor');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [selectionActive, setSelectionActive] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectionCursor, setSelectionCursor] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<'line' | 'char'>('line');
  const [charAnchorLine, setCharAnchorLine] = useState<number>(0);
  const [charAnchorCol, setCharAnchorCol] = useState<number>(0);
  const [charCursorLine, setCharCursorLine] = useState<number>(0);
  const [charCursorCol, setCharCursorCol] = useState<number>(0);
  const [noteLinesCount, setNoteLinesCount] = useState(0);
  const [noteCursor, setNoteCursor] = useState(0);
  const [noteCursorCol, setNoteCursorCol] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);
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

  // Reset index to 0 when filter becomes active or changes
  useEffect(() => {
    if (filterInput.trim()) {
      setIdx(0);
    }
  }, [filterInput]);

  useEffect(() => {
    setNoteCursor(0);
    setNoteCursorCol(0);
    setCursorVisible(false);
    setSelectionActive(false);
    setSelectionAnchor(null);
    setSelectionCursor(null);
    setSelectionMode('line');
    setCharAnchorLine(0);
    setCharAnchorCol(0);
    setCharCursorLine(0);
    setCharCursorCol(0);
  }, [idx]);

  const yankSelectionToClipboard = async (note: Note) => {
    if (selectionMode === 'char') {
      // Character-based yank
      const lines = (note.content || '').split(/\r?\n/);
      const startLine = Math.min(charAnchorLine, charCursorLine);
      const endLine = Math.max(charAnchorLine, charCursorLine);
      const startCol = charAnchorLine < charCursorLine || (charAnchorLine === charCursorLine && charAnchorCol < charCursorCol) 
        ? charAnchorCol 
        : charCursorCol;
      const endCol = charAnchorLine < charCursorLine || (charAnchorLine === charCursorLine && charAnchorCol < charCursorCol) 
        ? charCursorCol 
        : charAnchorCol;

      let textToCopy = '';
      
      if (startLine === endLine) {
        // Single line selection
        textToCopy = lines[startLine].slice(startCol, endCol);
      } else {
        // Multi-line selection
        for (let i = startLine; i <= endLine; i++) {
          if (i === startLine) {
            textToCopy += lines[i].slice(startCol) + '\n';
          } else if (i === endLine) {
            textToCopy += lines[i].slice(0, endCol);
          } else {
            textToCopy += lines[i] + '\n';
          }
        }
      }
      
      copyToClipboardOsc52(textToCopy);
    } else {
      // Line-based yank (existing)
      const allLines = (note.content || '').split(/\r?\n/);
      const start = Math.min(selectionAnchor || 0, selectionCursor || 0);
      const end = Math.max(selectionAnchor || 0, selectionCursor || 0);
      const textToCopy = allLines.slice(start, end + 1).join('\n');
      
      copyToClipboardOsc52(textToCopy);
    }
    
    setSelectionActive(false);
    setSelectionAnchor(null);
    setSelectionCursor(null);
    setCharAnchorLine(0);
    setCharAnchorCol(0);
    setCharCursorLine(0);
    setCharCursorCol(0);
  };

  const yankFullNoteToClipboard = async (note: Note) => {
    copyToClipboardOsc52(note.content || '');
  };

  const handleEditNote = async () => {
    const note = notes[idx];
    if (!note) return;
    
    try {
      await editNoteInEditor(note, config, effectiveEditor);
      await reloadNotes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateNote = async () => {
    try {
      const content = await createNoteInEditor(config, effectiveEditor);
      const firstLine = content.split(/\r?\n/)[0] || '';
      const title = firstLine.trim() || '';
      const created = await createNote(effectiveDir, title || undefined, content);
      
      await reloadNotes();
      const newIdx = notes.findIndex((x) => x.id === created.id);
      setIdx(newIdx !== -1 ? newIdx : clampIndex(idx, notes.length));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
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
    if (errorMessage) {
      setErrorMessage(null);
      return;
    }

    if (showControls) {
      setShowControls(false);
      return;
    }

    if (filterActive) {
      if (handleFilterInput(input, key, {
        handleBackspace: () => {
          setFilterInput(prev => prev.slice(0, -1));
        },
        handleCharInput: (char: string) => {
          setFilterInput(prev => prev + char);
        },
        cancelFilter: () => {
          setFilterActive(false);
          setFilterInput('');
        },
        confirmFilter: () => {
          setFilterActive(false);
          // Keep the filterInput to maintain the filter
        }
      })) {
        return;
      }
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
      { active: selectionActive, anchor: selectionAnchor, cursor: selectionCursor, mode: selectionMode },
      currentNote,
      {
        startLineSelection: () => {
          setSelectionMode('line');
          setSelectionActive(true);
          setSelectionAnchor(noteCursor);
          setSelectionCursor(noteCursor);
        },
        startCharSelection: () => {
          setSelectionMode('char');
          setSelectionActive(true);
          setCharAnchorLine(noteCursor);
          setCharAnchorCol(noteCursorCol);
          setCharCursorLine(noteCursor);
          setCharCursorCol(noteCursorCol);
        },
        moveSelectionUp: () => {
          setSelectionCursor(c => Math.max(0, (c ?? 0) - 1));
        },
        moveSelectionDown: () => {
          setSelectionCursor(c => Math.min(noteLinesCount - 1, (c ?? 0) + 1));
        },
        moveCharLeft: () => {
          if (!currentNote) return;
          const newPos = moveCharLeftUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveCharRight: () => {
          if (!currentNote) return;
          const newPos = moveCharRightUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveCharUp: () => {
          if (!currentNote) return;
          const newPos = moveCharUpUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveCharDown: () => {
          if (!currentNote) return;
          const newPos = moveCharDownUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveWordForward: () => {
          if (!currentNote) return;
          const newPos = moveWordForwardUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveWordBackward: () => {
          if (!currentNote) return;
          const newPos = moveWordBackwardUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveToLineStart: () => {
          const newPos = moveToLineStartUtil({ line: charCursorLine, col: charCursorCol });
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        moveToLineEnd: () => {
          if (!currentNote) return;
          const newPos = moveToLineEndUtil(
            { line: charCursorLine, col: charCursorCol },
            currentNote.content || ''
          );
          setCharCursorLine(newPos.line);
          setCharCursorCol(newPos.col);
        },
        yankSelection: yankSelectionToClipboard,
        yankFullNote: yankFullNoteToClipboard,
        cancelSelection: () => {
          setSelectionActive(false);
          setSelectionAnchor(null);
          setSelectionCursor(null);
          setCharAnchorLine(0);
          setCharAnchorCol(0);
          setCharCursorLine(0);
          setCharCursorCol(0);
        }
      }
    )) {
      return;
    }

    // Handle task toggling when cursor is on a task line in note view
    if (paneFocus === 'note' && !selectionActive && currentNote) {
      const lines = (currentNote.content || '').split(/\r?\n/);
      const currentLine = lines[noteCursor];
      
      if (currentLine && isTaskLine(currentLine)) {
        // Toggle check/uncheck with Space
        if (input === ' ') {
          const newLine = toggleTaskCheck(currentLine);
          const newContent = updateNoteLineContent(currentNote.content || '', noteCursor, newLine);
          currentNote.content = newContent;
          await saveNote(currentNote);
          await reloadNotes();
          return;
        }
        
        // Toggle cancel (x) with 'x'
        if (input === 'x') {
          const newLine = toggleTaskCancel(currentLine);
          const newContent = updateNoteLineContent(currentNote.content || '', noteCursor, newLine);
          currentNote.content = newContent;
          await saveNote(currentNote);
          await reloadNotes();
          return;
        }
      }
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

    if (shouldStartFilter(input)) {
      setFilterActive(true);
      if (!filterInput.trim()) {
        setFilterInput('');
      }
      return;
    }

    // Clear filter with Escape when filter is active (but not in filter input mode)
    if (key.escape && filterInput.trim()) {
      setFilterInput('');
      return;
    }

    // Toggle grid view with Tab key
    if (shouldToggleGridView(key, filterActive, configEditing, showDeleteConfirm, selectionActive)) {
      if (!gridViewActive) {
        const initialIdx = clampIndex(idx, notes.length);
        setGridSelectedIndex(initialIdx === -1 ? 0 : initialIdx);
      }
      setGridViewActive(prev => !prev);
      return;
    }

    // Grid view navigation
    if (gridViewActive) {
      const visibleNotes = notes.filter(note => !note.hidden);
      const totalVisible = visibleNotes.length;
      if (totalVisible === 0) {
        setGridViewActive(false);
        return;
      }

      if (shouldQuit(input)) {
        exit();
        return;
      }

      const clampedGridIndex = clampIndex(gridSelectedIndex, totalVisible);
      if (clampedGridIndex !== gridSelectedIndex) {
        setGridSelectedIndex(clampedGridIndex === -1 ? 0 : clampedGridIndex);
      }

      const postItsPerRow = Math.max(
        1,
        Math.floor((columns + GRID_CARD_GAP) / (GRID_CARD_WIDTH + GRID_CARD_GAP))
      );
      const totalRows = Math.ceil(totalVisible / postItsPerRow);
      const currentRow = Math.floor(clampedGridIndex / postItsPerRow);
      const currentCol = clampedGridIndex % postItsPerRow;
      const activeIndex = clampedGridIndex;

      if (key.escape) {
        // Exit grid view without changing selection
        setGridViewActive(false);
        return;
      }

      if (key.return) {
        // Select note and exit grid view
        if (clampedGridIndex >= 0 && clampedGridIndex < notes.length) {
          setIdx(clampedGridIndex);
          setPaneFocus('note');
        }
        setGridViewActive(false);
        return;
      }

      // Vi-style navigation
      if (input === 'h' && currentCol > 0) {
        // Move left
        setGridSelectedIndex(Math.max(0, activeIndex - 1));
        return;
      }

      if (input === 'l' && currentCol < postItsPerRow - 1 && activeIndex < visibleNotes.length - 1) {
        // Move right
        setGridSelectedIndex(Math.min(visibleNotes.length - 1, activeIndex + 1));
        return;
      }

      if (input === 'k' && currentRow > 0) {
        // Move up
        setGridSelectedIndex(Math.max(0, activeIndex - postItsPerRow));
        return;
      }

      if (input === 'j' && currentRow < totalRows - 1) {
        // Move down
        setGridSelectedIndex(Math.min(visibleNotes.length - 1, activeIndex + postItsPerRow));
        return;
      }
      return;
    }

    if (shouldQuit(input)) {
      exit();
      return;
    }

    if (handleNavigationInput(input, key, paneFocus, selectionActive, {
      moveListUp: () => setIdx(i => Math.max(0, (i === -1 ? 0 : i) - 1)),
      moveListDown: () => setIdx(i => Math.min(notes.length - 1, Math.max(0, (i === -1 ? 0 : i) + 1))),
      moveNoteUp: () => {
        setCursorVisible(true);
        setNoteCursor(c => {
          const newLine = Math.max(0, c - 1);
          if (currentNote) {
            const line = (currentNote.content || '').split(/\r?\n/)[newLine] || '';
            setNoteCursorCol(col => Math.min(col, Math.max(0, line.length - 1)));
          }
          return newLine;
        });
      },
      moveNoteDown: () => {
        setCursorVisible(true);
        setNoteCursor(c => {
          const newLine = Math.min(Math.max(0, noteLinesCount - 1), c + 1);
          if (currentNote) {
            const line = (currentNote.content || '').split(/\r?\n/)[newLine] || '';
            setNoteCursorCol(col => Math.min(col, Math.max(0, line.length - 1)));
          }
          return newLine;
        });
      },
      moveNoteLeft: () => {
        setCursorVisible(true);
        if (currentNote) {
          const lines = (currentNote.content || '').split(/\r?\n/);
          setNoteCursorCol(col => {
            if (col > 0) {
              return col - 1;
            } else if (noteCursor > 0) {
              // Move to end of previous line
              setNoteCursor(c => c - 1);
              const prevLine = lines[noteCursor - 1] || '';
              return Math.max(0, prevLine.length - 1);
            }
            return col;
          });
        }
      },
      moveNoteRight: () => {
        setCursorVisible(true);
        if (currentNote) {
          const lines = (currentNote.content || '').split(/\r?\n/);
          const currentLine = lines[noteCursor] || '';
          setNoteCursorCol(col => {
            if (col < currentLine.length - 1) {
              return col + 1;
            } else if (noteCursor < lines.length - 1) {
              // Move to start of next line
              setNoteCursor(c => c + 1);
              return 0;
            }
            return col;
          });
        }
      },
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

  const hasPopup = showControls || showDeleteConfirm || configEditing || errorMessage !== null;

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {!hasPopup && (
        <>
          {dirExists ? (
            gridViewActive ? (
              <NotesGridView 
                notes={notes} 
                width={columns} 
                height={rows - 2}
                selectedIndex={gridSelectedIndex}
              />
            ) : (
              <Box flexDirection="row" flexGrow={1}>
              <Box 
                width={leftWidth} 
                borderStyle="round" 
                flexDirection="column" 
                borderColor={paneFocus === 'list' ? 'cyan' : 'gray'}
              >
                <Text bold > Notes</Text>
                <NotesList 
                  notes={notes} 
                  selectedIndex={idx} 
                  width={leftWidth} 
                  height={rows - 7} 
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
                  height={rows - 1}
                  selectionActive={selectionActive}
                  selectionAnchor={selectionAnchor}
                  selectionCursor={selectionCursor}
                  selectionMode={selectionMode}
                  charAnchorLine={charAnchorLine}
                  charAnchorCol={charAnchorCol}
                  charCursorLine={charCursorLine}
                  charCursorCol={charCursorCol}
                  onLinesChanged={setNoteLinesCount}
                  noteCursor={noteCursor}
                  noteCursorCol={noteCursorCol}
                  cursorVisible={cursorVisible}
                  noteScroll={noteScroll}
                />
              </Box>
            </Box>
            )
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
        )}
          <Box paddingLeft={1}>
            {filterActive ? (
              <>
                <Text color="cyan">/</Text>
                <Text>{filterInput}</Text>
                <Text color="gray"> (ESC to cancel, Enter to apply)</Text>
              </>
            ) : (
              <>
                <Text>xpad-cli</Text>
                <Text color="gray"> | </Text>
                <Text color="cyan">{effectiveDir}</Text>
                <Text color="gray"> | </Text>
                <Text>{notes.length} notes</Text>
                {filterInput.trim() && (
                  <>
                    <Text color="gray"> | </Text>
                    <Text color="green">filtered: "{filterInput}"</Text>
                  </>
                )}
                {showHidden && (
                  <>
                    <Text color="gray"> | </Text>
                    <Text color="yellow">showing hidden</Text>
                  </>
                )}
              </>
            )}
          </Box>
        </>
      )}
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
      {showControls && <ControlsPopup onClose={() => setShowControls(false)} />}
      {errorMessage && (
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
            minWidth={60}
          >
            <Text color="red" bold>Error</Text>
            <Box marginTop={1}>
              <Text>{errorMessage}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray" dimColor>Press any key to dismiss</Text>
            </Box>
          </Box>
        </Box>
      )}
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
