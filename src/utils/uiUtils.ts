export function copyToClipboardOsc52(text: string): boolean {
  try {
    if (!process.stdout || !process.stdout.isTTY) return false;
    const term = process.env.TERM || '';
    if (term === 'dumb') return false;
    
    const base64Text = Buffer.from(text, 'utf8').toString('base64');
    const osc = `\u001b]52;c;${base64Text}\u0007`;
    process.stdout.write(osc);
    
    return true;
  } catch {
    return false;
  }
}

export const MIN_NOTE_VIEW_WIDTH = 20;
export const MIN_NOTES_LIST_WIDTH = 20;
export const NOTES_PANE_GUTTER = 3;

export function calculateLayoutDimensions(columns: number, preferredListWidth?: number) {
  const total = Math.max(columns, MIN_NOTES_LIST_WIDTH + MIN_NOTE_VIEW_WIDTH + NOTES_PANE_GUTTER);
  const fallbackListWidth = Math.max(MIN_NOTES_LIST_WIDTH, Math.floor(total * 0.35));
  const rawPreferred = Number.isFinite(preferredListWidth ?? NaN)
    ? (preferredListWidth as number)
    : fallbackListWidth;
  const clampedListWidth = Math.max(
    MIN_NOTES_LIST_WIDTH,
    Math.min(rawPreferred, total - MIN_NOTE_VIEW_WIDTH)
  );
  const leftWidth = clampedListWidth;
  const rightWidth = Math.max(MIN_NOTE_VIEW_WIDTH, total - leftWidth - NOTES_PANE_GUTTER);
  return { leftWidth, rightWidth };
}

export function truncateText(text: string, maxWidth: number): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > maxWidth ? clean.slice(0, maxWidth - 1) + '…' : clean;
}

export function clampIndex(index: number, maxLength: number): number {
  if (maxLength === 0) return -1;
  return Math.max(0, Math.min(index, maxLength - 1));
}
