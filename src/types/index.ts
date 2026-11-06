export type Note = {
  /** Stable identifier; also the file name without the `.md` extension. */
  id: string;
  title: string;
  /** Note body (plain text, or a placeholder while an encrypted note is locked). */
  content: string;
  filePath: string;
  color?: string;
  archived?: boolean;
  encrypted?: boolean;
  created?: string;
  updated?: string;
  /** Frontmatter keys this app doesn't know about; preserved on save. */
  extraMeta?: Record<string, string | boolean>;
  isDecrypted?: boolean; // Runtime flag: true if encrypted but currently decrypted
};

export type SortMode = 'updated' | 'title';

export type AppConfig = {
  editor?: string;
  notesDir?: string;
  notesListWidth?: number;
  /** Notes list order; defaults to 'updated' (most recently modified first). */
  sortBy?: SortMode;
};

export type PaneFocus = 'list' | 'note';
export type ConfigFieldFocus = 'editor' | 'notesDir' | 'notesListWidth';
export type SelectionMode = 'line' | 'char';

export type InkKey = {
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
