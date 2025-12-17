export type Note = {
  id: string;
  title: string;
  content: string;
  filePath: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  followFont?: boolean;
  followColor?: boolean;
  sticky?: boolean;
  hidden?: boolean;
  backgroundColor?: string;
  textColor?: string;
  font?: string;
};

export type AppConfig = {
  editor?: string;
  notesDir?: string;
};

export type NoteInfo = {
  width: number;
  height: number;
  x: number;
  y: number;
  followFont: boolean;
  followColor: boolean;
  sticky: boolean;
  hidden: boolean;
  backgroundColor: string;
  textColor: string;
  font: string;
  contentFile: string;
};

export type PaneFocus = 'list' | 'note';
export type ConfigFieldFocus = 'editor' | 'notesDir';
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
