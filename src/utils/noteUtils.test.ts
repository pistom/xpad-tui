import { extractTitle, sortNotes } from './noteUtils';
import type { Note } from '../types/index';

describe('extractTitle', () => {
  it('uses the first non-empty line', () => {
    expect(extractTitle('\n\n  Shopping list  \nmilk')).toBe('Shopping list');
  });

  it('strips markdown heading markers', () => {
    expect(extractTitle('## Ideas\n- one')).toBe('Ideas');
  });

  it('returns empty string for empty body', () => {
    expect(extractTitle('')).toBe('');
  });
});

import { isTaskLine, getTaskState, toggleTaskCheck, toggleTaskCancel, convertLegacyTasks } from './noteUtils';

describe('tasks', () => {
  it('reads markdown and legacy syntax', () => {
    expect(getTaskState('- [ ] a')).toBe('empty');
    expect(getTaskState('  * [x] a')).toBe('checked');
    expect(getTaskState('- [X] a')).toBe('checked');
    expect(getTaskState('- [-] a')).toBe('cancelled');
    expect(getTaskState('[ ] a')).toBe('empty');
    expect(getTaskState('[✔] a')).toBe('checked');
    expect(getTaskState('[x] a')).toBe('cancelled');
    expect(isTaskLine('[x](http://link)')).toBe(false);
    expect(isTaskLine('- item')).toBe(false);
    expect(isTaskLine('- [ ]')).toBe(true);
  });

  it('toggles and always writes markdown syntax', () => {
    expect(toggleTaskCheck('- [ ] a')).toBe('- [x] a');
    expect(toggleTaskCheck('- [x] a')).toBe('- [ ] a');
    expect(toggleTaskCheck('  [ ] a')).toBe('  - [x] a');
    expect(toggleTaskCheck('[✔] a')).toBe('- [ ] a');
    expect(toggleTaskCancel('* [ ] a')).toBe('* [-] a');
    expect(toggleTaskCancel('- [-] a')).toBe('- [ ] a');
    expect(toggleTaskCancel('[x] a')).toBe('- [ ] a');
    expect(toggleTaskCheck('plain')).toBe('plain');
  });

  it('converts legacy tasks keeping their meaning', () => {
    expect(convertLegacyTasks('Title\n[ ] todo\n  [✔] done\n[x] cancelled\n- [x] already md\n[x](link)'))
      .toBe('Title\n- [ ] todo\n  - [x] done\n- [-] cancelled\n- [x] already md\n[x](link)');
  });
});

describe('sortNotes', () => {
  const note = (title: string, updated?: string, created?: string): Note =>
    ({ id: title, title, content: '', filePath: `${title}.md`, updated, created });

  const notes = [
    note('beta', '2026-11-01T10:00:00.000Z'),
    note('alpha', '2026-11-03T10:00:00.000Z'),
    note('gamma', undefined, '2026-11-02T10:00:00.000Z'),
    note('delta'),
  ];

  it('sorts by last modification, newest first, by default', () => {
    expect(sortNotes(notes).map((n) => n.title)).toEqual(['alpha', 'gamma', 'beta', 'delta']);
  });

  it('sorts by title', () => {
    expect(sortNotes(notes, 'title').map((n) => n.title)).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });

  it('does not mutate the input', () => {
    sortNotes(notes, 'title');
    expect(notes[0].title).toBe('beta');
  });
});
