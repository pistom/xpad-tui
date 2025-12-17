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

export function calculateLayoutDimensions(columns: number) {
  const leftWidth = Math.max(30, Math.floor(columns * 0.35));
  const rightWidth = Math.max(20, columns - leftWidth - 3);
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
