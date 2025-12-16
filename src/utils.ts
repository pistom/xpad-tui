export function normalizeContentForDisplay(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') {
    const s = content.trim();
    // If looks like JSON, pretty-print it
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        const obj = JSON.parse(s);
        return JSON.stringify(obj, null, 2);
      } catch {
        // Not valid JSON — indicate error
        return 'Invalid JSON content';
      }
    }
    // Truncate long strings
    if (s.length > 500) {
      return s.slice(0, 500) + '... (truncated)';
    }
    return s;
  }
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return 'Unprocessable content';
  }
}
