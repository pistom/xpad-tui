export function normalizeContentForDisplay(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') {
    const trimmed = content.trim();
    
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return 'Invalid JSON content';
      }
    }
    
    if (trimmed.length > 500) {
      return trimmed.slice(0, 500) + '... (truncated)';
    }
    
    return trimmed;
  }
  
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return 'Unprocessable content';
  }
}
