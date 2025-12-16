import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';
import { loadNotes, saveNote, createNote, removeNote, setNoteHidden, type Note } from './xpad.js';
import NotesList from './ui/NotesList.js';
import NoteView from './ui/NoteView.js';
import ControlsPopup from './ui/ControlsPopup.js';
import ConfirmDialog from './ui/ConfirmDialog.js';
// Config modal removed; using inline bottom config input instead
import tmp from 'tmp';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';
import { loadConfig, saveConfig, type AppConfig, CONFIG_PATH, resolveNotesDir } from './config.js';
import { log } from './logger.js';

type Props = { dir: string; editor?: string };

export default function App({ dir, editor }: Props): React.ReactElement {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [idx, setIdx] = useState(0);
  const { exit } = useApp();
  // minimal typing for ink's key object passed to useInput callbacks
  type InkKey = {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    tab?: boolean;
    return?: boolean;
    escape?: boolean;
    backspace?: boolean;
    delete?: boolean;
    home?: boolean;
    end?: boolean;
    f1?: boolean;
    up?: boolean;
    down?: boolean;
    left?: boolean;
    right?: boolean;
  };
  // focus model removed: no per-pane focus needed anymore
  const [config, setConfig] = useState<AppConfig>({});
  const [effectiveDir, setEffectiveDir] = useState(dir);
  const [configEditing, setConfigEditing] = useState(false);
  const [configEditorInput, setConfigEditorInput] = useState('');
  const [configNotesDirInput, setConfigNotesDirInput] = useState('');
  const [configFocusedField, setConfigFocusedField] = useState<'editor' | 'notesDir'>('editor');
  const [showControls, setShowControls] = useState(false);
  const [dirExists, setDirExists] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await loadConfig();
      setConfig(cfg);
      setConfigEditorInput(cfg.editor || '');
      setConfigNotesDirInput(cfg.notesDir || '');
      setEffectiveDir(resolveNotesDir(cfg) || dir);
    })();
  }, []);

  function useTerminalSize(): [number, number] {
    const [size, setSize] = useState({ cols: process.stdout.columns || 80, rows: process.stdout.rows || 24 });
    useEffect(() => {
      const onResize = () => setSize({ cols: process.stdout.columns || 80, rows: process.stdout.rows || 24 });
      process.stdout.on('resize', onResize);
      return () => { process.stdout.off('resize', onResize); };
    }, []);
    return [size.cols, size.rows];
  }

  const [columns, rows] = useTerminalSize();

  useEffect(() => {
    (async () => {
      try {
        await fs.access(effectiveDir);
        setDirExists(true);
        const allNotes: Note[] = await loadNotes(effectiveDir);
        const filteredNotes: Note[] = showHidden ? allNotes : allNotes.filter((note) => !note.hidden);
        setNotes(filteredNotes);
        setIdx(filteredNotes.length ? 0 : -1);
      } catch (e) {
        setDirExists(false);
        setNotes([]);
        setIdx(-1);
      }
    })();
  }, [effectiveDir, showHidden]);

  useInput(async (input: string, key: InkKey) => {
    // If the controls popup is open, any key (or Esc / ?) closes it and input is consumed
    if (showControls) {
      if (key.escape || input === '?' || input) setShowControls(false);
      return;
    }

    // If inline config editing is active, handle cancel (Esc) and Tab to switch focused field
    if (configEditing) {
      if (key.escape) {
        setConfigEditing(false);
        setConfigEditorInput(config.editor || '');
        setConfigNotesDirInput(config.notesDir || '');
      }
      if (key.tab) {
        setConfigFocusedField((f) => (f === 'editor' ? 'notesDir' : 'editor'));
      }
      return;
    }

    // If delete confirmation is open, only handle cancel (Esc)
    if (showDeleteConfirm) {
      if (key.escape) {
        setShowDeleteConfirm(false);
        setPendingDeleteIdx(null);
      }
      return;
    }

    // Show controls popup (also accept F1 or Ctrl-h)
    if (input === '?' || (key && key.f1) || (key && key.ctrl && input === 'h')) {
      setShowControls(true);
      return;
    }

    if (input === 'h') {
      setShowHidden((prev) => !prev);
      return;
    }
    if (input === 'q') return exit();

    // Navigation
    if (input === 'j') setIdx((i) => Math.min(notes.length - 1, Math.max(0, (i === -1 ? 0 : i) + 1)));
    if (input === 'k') setIdx((i) => Math.max(0, (i === -1 ? 0 : i) - 1));

    // Start inline config editing
    if (input === 'c') {
      setConfigEditorInput(config.editor || '');
      setConfigNotesDirInput(config.notesDir || '');
      setConfigFocusedField('editor');
      setConfigEditing(true);
      return;
    }

    // Use external editor for edit
    if (input === 'e' && idx >= 0 && notes[idx]) {
      await editNote(notes[idx]);
      const n = await loadNotes(effectiveDir);
      const filtered = showHidden ? n : n.filter((note) => !note.hidden);
      setNotes(filtered);
      setIdx(Math.min(idx, filtered.length - 1));
      return;
    }

    // Create new note in editor
    if (input === 'n') {
      const t = tmp.fileSync({ postfix: '.md' });
      const editorCmd = editor || config.editor || process.env.EDITOR || 'vi';
      spawnSync(editorCmd, [t.name], { stdio: 'inherit' });
      const content = await fs.readFile(t.name, 'utf8');
      const firstLine = content.split(/\r?\n/)[0] || '';
      const title = firstLine.trim() || '';
      const created = await createNote(effectiveDir, title || undefined as any, content);
      t.removeCallback();
      const n = await loadNotes(effectiveDir);
      const filtered = showHidden ? n : n.filter((note) => !note.hidden);
      setNotes(filtered);
      const newIdx = filtered.findIndex((x) => x.id === created.id);
      setIdx(newIdx === -1 ? Math.min(idx, Math.max(0, filtered.length - 1)) : newIdx);
      return;
    }

    if (input === 'd' && idx >= 0 && notes[idx]) {
      setPendingDeleteIdx(idx);
      setShowDeleteConfirm(true);
      return;
    }

    // Toggle hidden flag for selected note
    if (input === 'H' && idx >= 0 && notes[idx]) {
      const note = notes[idx];
      await setNoteHidden(note, !note.hidden);
      const n = await loadNotes(effectiveDir);
      const filtered = showHidden ? n : n.filter((note) => !note.hidden);
      setNotes(filtered);
      setIdx(Math.min(idx, filtered.length - 1));
      return;
    }
  });

  async function editNote(note: Note) {
    const t = tmp.fileSync({ postfix: '.md' });
    await fs.writeFile(t.name, note.content || '', 'utf8');
    const editorCmd = editor || config.editor || process.env.EDITOR || 'vi';
    spawnSync(editorCmd, [t.name], { stdio: 'inherit' });
    const content = await fs.readFile(t.name, 'utf8');
    note.content = content;
    await saveNote(note);
    t.removeCallback();
  }

  const leftWidth = Math.max(30, Math.floor(columns * 0.35));
  const rightWidth = Math.max(20, columns - leftWidth - 3);
  // modalWidth/modalHeight no longer needed (inline config editor used)

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {showDeleteConfirm && pendingDeleteIdx !== null && (
        <ConfirmDialog
          message={`Delete note "${notes[pendingDeleteIdx]?.title || notes[pendingDeleteIdx]?.id}"?`}
          onCancel={() => { setShowDeleteConfirm(false); setPendingDeleteIdx(null); }}
          onConfirm={async () => {
            const p = pendingDeleteIdx;
            if (p === null) return;
            const toDelete = notes[p];
            try {
              await removeNote(toDelete);
            } catch (e) {
              // ignore errors removing
            }
            const n = await loadNotes(effectiveDir);
            const filtered = showHidden ? n : n.filter((note) => !note.hidden);
            setNotes(filtered);
            setIdx((i) => Math.min(Math.max(0, filtered.length ? Math.min(i, filtered.length - 1) : -1), Math.max(0, filtered.length - 1)));
            setShowDeleteConfirm(false);
            setPendingDeleteIdx(null);
          }}
        />
      )}
      {!showControls && !showDeleteConfirm && (
        dirExists ? (
          <Box flexDirection="row" flexGrow={1}>
            <Box width={leftWidth} borderStyle="round" flexDirection="column" borderColor={'gray'}>
              <Text bold>Notes</Text>
              <NotesList notes={notes} selectedIndex={idx} width={leftWidth} height={rows - 6} />
            </Box>
            <Box marginLeft={1} width={rightWidth} flexDirection="column">
              <NoteView note={notes[idx]} width={rightWidth} height={rows} />
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
      {/* Inline config editor at the bottom (non-modal, no popup) */}
      {configEditing ? (
            <Box borderStyle="round" borderColor="cyan" marginTop={0} width="100%" flexDirection="column">
              <Text bold>Application configuration</Text>
              <Box flexDirection="row" width="100%">
                <Text color="gray">Editor command (overrides $EDITOR): </Text>
                <TextInput
                  isDisabled={configFocusedField !== 'editor'}
                  defaultValue={configEditorInput}
                  onChange={(val: string) => setConfigEditorInput(val)}
                  onSubmit={async (val: string) => {
                    const newCfg = { ...config, editor: val.trim() || undefined };
                    await saveConfig(newCfg);
                    setConfig(newCfg);
                    setConfigEditing(false);
                  }}
                />
              </Box>
                <Box marginTop={1} flexDirection="row" width="100%">
                  <Text color="gray">Notes directory (default ~/.config/xpad): </Text>
                  <TextInput
                    isDisabled={configFocusedField !== 'notesDir'}
                    defaultValue={configNotesDirInput || ''}
                    onChange={(val: string) => setConfigNotesDirInput(val)}
                    onSubmit={async (val: string) => {
                      const nd = val.trim() || undefined;
                      const newCfg = { ...config, notesDir: nd };
                      await saveConfig(newCfg);
                      setConfig(newCfg);
                      setEffectiveDir(resolveNotesDir(newCfg));
                      setConfigEditing(false);
                    }}
                  />
                </Box>
              <Box marginTop={1} flexDirection="row" width="100%">
                <Text color="gray">Enter to save, Esc to cancel</Text>
              </Box>
            </Box>
      ) : null}
    </Box>
  );
}
