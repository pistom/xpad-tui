import type { InkKey, Note, PaneFocus, SelectionMode } from '../types/index.js';

type SelectionState = {
  active: boolean;
  anchor: number | null;
  cursor: number | null;
  mode: SelectionMode;
};

type CharPosition = {
  line: number;
  col: number;
};

// Vi motion utilities for character-based selection
export function getLineContent(noteContent: string, lineIdx: number): string {
  const lines = noteContent.split(/\r?\n/);
  return lines[lineIdx] || '';
}

export function getTotalLines(noteContent: string): number {
  return noteContent.split(/\r?\n/).length;
}

export function moveCharLeft(pos: CharPosition, noteContent: string): CharPosition {
  if (pos.col > 0) {
    return { line: pos.line, col: pos.col - 1 };
  }
  if (pos.line > 0) {
    const prevLine = getLineContent(noteContent, pos.line - 1);
    return { line: pos.line - 1, col: Math.max(0, prevLine.length - 1) };
  }
  return pos;
}

export function moveCharRight(pos: CharPosition, noteContent: string): CharPosition {
  const currentLine = getLineContent(noteContent, pos.line);
  if (pos.col < currentLine.length - 1) {
    return { line: pos.line, col: pos.col + 1 };
  }
  const totalLines = getTotalLines(noteContent);
  if (pos.line < totalLines - 1) {
    return { line: pos.line + 1, col: 0 };
  }
  return pos;
}

export function moveCharUp(pos: CharPosition, noteContent: string): CharPosition {
  if (pos.line > 0) {
    const prevLine = getLineContent(noteContent, pos.line - 1);
    return { line: pos.line - 1, col: Math.min(pos.col, Math.max(0, prevLine.length - 1)) };
  }
  return pos;
}

export function moveCharDown(pos: CharPosition, noteContent: string): CharPosition {
  const totalLines = getTotalLines(noteContent);
  if (pos.line < totalLines - 1) {
    const nextLine = getLineContent(noteContent, pos.line + 1);
    return { line: pos.line + 1, col: Math.min(pos.col, Math.max(0, nextLine.length - 1)) };
  }
  return pos;
}

export function moveWordForward(pos: CharPosition, noteContent: string): CharPosition {
  const lines = noteContent.split(/\r?\n/);
  let { line, col } = pos;
  
  if (line >= lines.length) return pos;
  
  let currentLine = lines[line];
  
  // Skip current word
  while (col < currentLine.length && /\S/.test(currentLine[col])) {
    col++;
  }
  
  // Skip whitespace
  while (col < currentLine.length && /\s/.test(currentLine[col])) {
    col++;
  }
  
  // If we reached end of line, go to next line
  if (col >= currentLine.length && line < lines.length - 1) {
    line++;
    col = 0;
    currentLine = lines[line];
    // Skip leading whitespace on new line
    while (col < currentLine.length && /\s/.test(currentLine[col])) {
      col++;
    }
  }
  
  return { line, col: Math.min(col, currentLine.length) };
}

export function moveWordBackward(pos: CharPosition, noteContent: string): CharPosition {
  const lines = noteContent.split(/\r?\n/);
  let { line, col } = pos;
  
  if (line >= lines.length) return pos;
  
  // Move back one character first
  if (col > 0) {
    col--;
  } else if (line > 0) {
    line--;
    col = lines[line].length - 1;
  } else {
    return pos;
  }
  
  const currentLine = lines[line];
  
  // Skip whitespace
  while (col > 0 && /\s/.test(currentLine[col])) {
    col--;
  }
  
  // Skip word characters
  while (col > 0 && /\S/.test(currentLine[col - 1])) {
    col--;
  }
  
  return { line, col };
}

export function moveToLineStart(pos: CharPosition): CharPosition {
  return { line: pos.line, col: 0 };
}

export function moveToLineEnd(pos: CharPosition, noteContent: string): CharPosition {
  const currentLine = getLineContent(noteContent, pos.line);
  return { line: pos.line, col: Math.max(0, currentLine.length - 1) };
}

type NavigationHandlers = {
  moveListUp: () => void;
  moveListDown: () => void;
  moveNoteUp: () => void;
  moveNoteDown: () => void;
  moveNoteLeft: () => void;
  moveNoteRight: () => void;
  movePaneFocusToList: () => void;
  movePaneFocusToNote: () => void;
};

export function handleNavigationInput(
  input: string,
  key: InkKey,
  paneFocus: PaneFocus,
  selectionActive: boolean,
  handlers: NavigationHandlers
): boolean {
  // H and L (shift) for switching focus between panes
  if (input === 'H') {
    handlers.movePaneFocusToList();
    return true;
  }
  
  if (input === 'L') {
    handlers.movePaneFocusToNote();
    return true;
  }

  if (paneFocus === 'list') {
    if (input === 'j') {
      handlers.moveListDown();
      return true;
    }
    if (input === 'k') {
      handlers.moveListUp();
      return true;
    }
  } else {
    if (input === 'j') {
      handlers.moveNoteDown();
      return true;
    }
    if (input === 'k') {
      handlers.moveNoteUp();
      return true;
    }
    if (input === 'h') {
      handlers.moveNoteLeft();
      return true;
    }
    if (input === 'l') {
      handlers.moveNoteRight();
      return true;
    }
  }

  if (key.left) {
    handlers.moveNoteUp();
    return true;
  }
  
  if (key.right) {
    handlers.moveNoteDown();
    return true;
  }

  return false;
}

type SelectionHandlers = {
  startLineSelection: () => void;
  startCharSelection: () => void;
  moveSelectionUp: () => void;
  moveSelectionDown: () => void;
  moveCharLeft: () => void;
  moveCharRight: () => void;
  moveCharUp: () => void;
  moveCharDown: () => void;
  moveWordForward: () => void;
  moveWordBackward: () => void;
  moveToLineStart: () => void;
  moveToLineEnd: () => void;
  yankSelection: (note: Note, selection: SelectionState) => Promise<void>;
  yankFullNote: (note: Note) => Promise<void>;
  cancelSelection: () => void;
};

export function handleSelectionInput(
  input: string,
  key: InkKey,
  selectionState: SelectionState,
  currentNote: Note | undefined,
  handlers: SelectionHandlers
): boolean {
  if (selectionState.active) {
    if (selectionState.mode === 'char') {
      // Character-based selection motions
      if (input === 'h') {
        handlers.moveCharLeft();
        return true;
      }
      if (input === 'l') {
        handlers.moveCharRight();
        return true;
      }
      if (input === 'j' || key.down) {
        handlers.moveCharDown();
        return true;
      }
      if (input === 'k' || key.up) {
        handlers.moveCharUp();
        return true;
      }
      if (input === 'w') {
        handlers.moveWordForward();
        return true;
      }
      if (input === 'b') {
        handlers.moveWordBackward();
        return true;
      }
      if (input === '0') {
        handlers.moveToLineStart();
        return true;
      }
      if (input === '$') {
        handlers.moveToLineEnd();
        return true;
      }
      if (input === 'y') {
        if (currentNote) {
          handlers.yankSelection(currentNote, selectionState);
        }
        return true;
      }
      if (key.escape) {
        handlers.cancelSelection();
        return true;
      }
      return true;
    } else {
      // Line-based selection motions (existing)
      if (input === 'j' || key.down) {
        handlers.moveSelectionDown();
        return true;
      }
      if (input === 'k' || key.up) {
        handlers.moveSelectionUp();
        return true;
      }
      if (input === 'y') {
        if (currentNote) {
          handlers.yankSelection(currentNote, selectionState);
        }
        return true;
      }
      if (key.escape) {
        handlers.cancelSelection();
        return true;
      }
      return true;
    }
  }

  if (input === 'v' && currentNote) {
    handlers.startCharSelection();
    return true;
  }

  if (input === 'V' && currentNote) {
    handlers.startLineSelection();
    return true;
  }

  if (input === 'Y' && currentNote) {
    handlers.yankFullNote(currentNote);
    return true;
  }

  return false;
}

type NoteActionHandlers = {
  editNote: () => Promise<void>;
  createNote: () => Promise<void>;
  deleteNote: () => void;
  toggleHidden: () => Promise<void>;
  toggleShowHidden: () => void;
};

export function handleNoteActionInput(
  input: string,
  currentNote: Note | undefined,
  handlers: NoteActionHandlers
): boolean {
  if (input === 'e' && currentNote) {
    handlers.editNote();
    return true;
  }

  if (input === 'n') {
    handlers.createNote();
    return true;
  }

  if (input === 'd' && currentNote) {
    handlers.deleteNote();
    return true;
  }

  if (input === '.' && currentNote) {
    handlers.toggleHidden();
    return true;
  }

  if (input === 'a') {
    handlers.toggleShowHidden();
    return true;
  }

  return false;
}

export function shouldShowControls(input: string, key: InkKey): boolean {
  return input === '?' || !!key.f1 || (!!key.ctrl && input === 'h');
}

export function shouldStartConfigEdit(input: string): boolean {
  return input === 'c';
}

export function shouldStartFilter(input: string): boolean {
  return input === '/';
}

type FilterHandlers = {
  handleBackspace: () => void;
  handleCharInput: (char: string) => void;
  cancelFilter: () => void;
  confirmFilter: () => void;
};

export function handleFilterInput(
  input: string,
  key: InkKey,
  handlers: FilterHandlers
): boolean {
  if (key.escape) {
    handlers.cancelFilter();
    return true;
  }

  if (key.return) {
    handlers.confirmFilter();
    return true;
  }

  if (key.backspace || key.delete) {
    handlers.handleBackspace();
    return true;
  }

  // Accept printable characters
  if (input && input.length === 1 && !key.ctrl && !key.meta) {
    handlers.handleCharInput(input);
    return true;
  }

  return false;
}

export function shouldQuit(input: string): boolean {
  return input === 'q';
}

export function shouldToggleGridView(key: InkKey, filterActive: boolean, configEditing: boolean, showDeleteConfirm: boolean, selectionActive: boolean): boolean {
  // Only toggle grid view with Tab if we're not in any other mode
  return !!key.tab && !filterActive && !configEditing && !showDeleteConfirm && !selectionActive;
}
