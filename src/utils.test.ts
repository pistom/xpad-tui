import { normalizeContentForDisplay } from './utils';

test('returns empty for null/undefined', () => {
  expect(normalizeContentForDisplay(null)).toBe('');
  expect(normalizeContentForDisplay(undefined)).toBe('');
});

test('passes through plain text', () => {
  expect(normalizeContentForDisplay('hello')).toBe('hello');
});

test('pretty prints JSON strings', () => {
  const json = '{"a":1, "b": [1,2]}';
  const out = normalizeContentForDisplay(json);
  expect(out).toContain('\n');
  expect(out).toContain('"a": 1');
});

test('stringifies non-string objects', () => {
  const obj = { x: 1 };
  const out = normalizeContentForDisplay(obj);
  expect(out).toContain('"x": 1');
});
