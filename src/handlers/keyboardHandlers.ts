import type { InkKey, Note, PaneFocus } from '../types/index.js';

type SelectionState = {
  active: boolean;
  anchor: number | null;
  cursor: number | null;
};

type NavigationHandlers = {
  moveListUp: () => void;
  moveListDown: () => void;
  moveNoteUp: () => void;
  moveNoteDown: () => void;
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
  if (input === 'h') {
    handlers.movePaneFocusToList();
    return true;
  }
  
  if (input === 'l') {
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
  startSelection: () => void;
  moveSelectionUp: () => void;
  moveSelectionDown: () => void;
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

  if (input === 'V' && currentNote) {
    handlers.startSelection();
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

export function shouldQuit(input: string): boolean {
  return input === 'q';
}
