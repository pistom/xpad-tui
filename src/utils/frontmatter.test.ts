import { parseFrontmatter, serializeFrontmatter } from './frontmatter';

describe('frontmatter', () => {
  it('round-trips values that need quoting', () => {
    const meta = {
      id: '20261102-101500-a1b2',
      color: '#f5e663',
      archived: false,
      encrypted: true,
      title: 'Passwords: "bank" #1',
      created: '2026-11-02T10:15:00.000Z',
      weird: 'true',
    };
    const text = serializeFrontmatter(meta, '# Body\n\ntext\n');
    expect(text).toContain('color: "#f5e663"');
    expect(text).toContain('weird: "true"');
    expect(text).toContain('created: 2026-11-02T10:15:00.000Z');

    const parsed = parseFrontmatter(text);
    expect(parsed.meta).toEqual(meta);
    expect(parsed.body).toBe('# Body\n\ntext\n');
  });

  it('skips undefined values', () => {
    expect(serializeFrontmatter({ id: 'a', color: undefined }, '')).toBe('---\nid: a\n---\n');
  });

  it('treats files without frontmatter as plain body', () => {
    expect(parseFrontmatter('hello\n---\nworld')).toEqual({ meta: {}, body: 'hello\n---\nworld' });
  });

  it('accepts single-quoted values and CRLF line endings', () => {
    const parsed = parseFrontmatter("---\r\ntitle: 'it''s'\r\narchived: true\r\n---\r\nbody");
    expect(parsed.meta).toEqual({ title: "it's", archived: true });
    expect(parsed.body).toBe('body');
  });
});
