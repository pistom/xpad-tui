import { extractTitle } from './noteUtils';

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
