import type { Note, SortMode } from '../types/index.js';

/**
 * Derives a note title from its body: the first non-empty line, with a
 * leading markdown heading marker (`# `) stripped.
 */
export function extractTitle(body: string): string {
  const firstLine = body.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  return firstLine.trim().replace(/^#{1,6}\s+/, '').trim();
}

export const DEFAULT_SORT_MODE: SortMode = 'updated';

function timestamp(value: string | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Returns a sorted copy of `notes`. 'updated' puts the most recently modified
 * notes first (falling back to `created`); ties and 'title' use title order.
 */
export function sortNotes(notes: Note[], mode: SortMode = DEFAULT_SORT_MODE): Note[] {
  const byTitle = (a: Note, b: Note) => a.title.localeCompare(b.title);
  if (mode === 'title') return [...notes].sort(byTitle);
  return [...notes].sort(
    (a, b) =>
      timestamp(b.updated ?? b.created) - timestamp(a.updated ?? a.created) || byTitle(a, b)
  );
}

/*
 * Task lines
 * ----------
 * Canonical (markdown) syntax:   `- [ ] todo`, `- [x] done`, `- [-] cancelled`
 * Legacy xpad syntax (no list marker) is still understood, because encrypted
 * notes cannot be converted without their password:
 *                                `[ ] todo`,   `[✔] done`,   `[x] cancelled`
 * Toggling a task always writes the canonical syntax.
 */

export type TaskState = 'empty' | 'checked' | 'cancelled';

const TASK_RE = /^(\s*)(?:([-*+]) )?\[([ xX✔-])\](?=\s|$)/;
const STATE_CHAR: Record<TaskState, string> = { empty: ' ', checked: 'x', cancelled: '-' };

type ParsedTask = { indent: string; marker: string; state: TaskState; rest: string; legacy: boolean };

function parseTask(line: string): ParsedTask | null {
  const m = line.match(TASK_RE);
  if (!m) return null;
  const [whole, indent, marker, ch] = m;
  const legacy = marker === undefined;
  let state: TaskState;
  if (ch === ' ') state = 'empty';
  else if (ch === '-') state = 'cancelled';
  else if (ch === '✔') state = 'checked';
  else state = legacy ? 'cancelled' : 'checked'; // x/X: legacy meant cancelled
  return { indent, marker: marker ?? '-', state, rest: line.slice(whole.length), legacy };
}

function formatTask(task: ParsedTask, state: TaskState): string {
  return `${task.indent}${task.marker} [${STATE_CHAR[state]}]${task.rest}`;
}

/** Checks if a line is a task line (markdown or legacy syntax) */
export function isTaskLine(line: string): boolean {
  return parseTask(line) !== null;
}

/** Gets the task state from a line */
export function getTaskState(line: string): TaskState | null {
  return parseTask(line)?.state ?? null;
}

/** Toggles a task line between empty and checked */
export function toggleTaskCheck(line: string): string {
  const task = parseTask(line);
  if (!task) return line;
  return formatTask(task, task.state === 'empty' ? 'checked' : 'empty');
}

/** Toggles a task line to cancelled state */
export function toggleTaskCancel(line: string): string {
  const task = parseTask(line);
  if (!task) return line;
  return formatTask(task, task.state === 'cancelled' ? 'empty' : 'cancelled');
}

/** Rewrites legacy task lines (`[ ]`, `[✔]`, `[x]`) to markdown syntax, keeping their meaning. */
export function convertLegacyTasks(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const task = parseTask(line);
      return task && task.legacy ? formatTask(task, task.state) : line;
    })
    .join('\n');
}

/**
 * Updates a specific line in note content
 */
export function updateNoteLineContent(content: string, lineIndex: number, newLineContent: string): string {
  const lines = content.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  
  lines[lineIndex] = newLineContent;
  return lines.join('\n');
}