/**
 * Minimal YAML frontmatter support for note files.
 *
 * Only a flat `key: value` map is supported (strings and booleans), which is
 * a strict subset of YAML, so files stay readable by Obsidian, Markor,
 * GitJournal, GitHub, etc. Keys we don't know about are preserved as-is.
 */

export type FrontmatterValue = string | boolean;
export type Frontmatter = Record<string, FrontmatterValue>;

const DELIMITER = '---';

export function parseFrontmatter(text: string): { meta: Frontmatter; body: string } {
  const normalized = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = normalized.split(/\r?\n/);
  if (lines[0]?.trim() !== DELIMITER) {
    return { meta: {}, body: normalized };
  }

  const end = lines.findIndex((line, i) => i > 0 && line.trim() === DELIMITER);
  if (end === -1) {
    return { meta: {}, body: normalized };
  }

  const meta: Frontmatter = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    meta[match[1]] = parseValue(match[2]);
  }

  return { meta, body: lines.slice(end + 1).join('\n') };
}

export function serializeFrontmatter(meta: Record<string, FrontmatterValue | undefined>, body: string): string {
  const lines = Object.entries(meta)
    .filter((entry): entry is [string, FrontmatterValue] => entry[1] !== undefined)
    .map(([key, value]) => `${key}: ${formatValue(value)}`);
  return `${DELIMITER}\n${lines.join('\n')}\n${DELIMITER}\n${body}`;
}

function parseValue(raw: string): FrontmatterValue {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  // Strip trailing YAML comment
  return value.replace(/\s+#.*$/, '');
}

const PLAIN_SAFE = /^[A-Za-z0-9_][A-Za-z0-9_.\-:+]*$/;
const YAML_RESERVED = /^(true|false|yes|no|on|off|null|~|[-+]?[0-9.]+)$/i;

function formatValue(value: FrontmatterValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (PLAIN_SAFE.test(value) && !YAML_RESERVED.test(value)) return value;
  // JSON string literals are valid YAML double-quoted scalars
  return JSON.stringify(value);
}
