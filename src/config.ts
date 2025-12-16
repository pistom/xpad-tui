import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export type AppConfig = {
  editor?: string;
  notesDir?: string;
  // future fields here
};

const CONFIG_DIR = path.join(os.homedir(), '.config', 'xpad');
const CONFIG_PATH = path.join(CONFIG_DIR, 'xpad-cli.conf');

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as AppConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

export { CONFIG_PATH };

export function resolveNotesDir(cfg?: AppConfig): string {
  const nd = cfg && cfg.notesDir ? cfg.notesDir : path.join(os.homedir(), '.config', 'xpad');
  if (nd.startsWith('~')) return path.join(os.homedir(), nd.slice(1));
  return nd;
}
