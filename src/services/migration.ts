import fs from 'fs/promises';
import path from 'path';
import { armor } from '../utils/encryption.js';
import { parseFrontmatter, serializeFrontmatter } from '../utils/frontmatter.js';
import { extractTitle, convertLegacyTasks } from '../utils/noteUtils.js';
import { generateNoteId, noteFilePath } from './noteService.js';

/*
 * One-time migration from the legacy xpad layout (`info-XXXXXX` metadata +
 * `content-XXXXXX` body per note) to one `<id>.md` file per note.
 * Legacy files are moved to a backup folder, never deleted.
 */

export const LEGACY_BACKUP_DIR = '.xpad-legacy';

export type LegacyInfo = {
  contentFile: string;
  hidden: boolean;
  encrypted: boolean;
  textColor?: string;
  title?: string;
};

export type MigrationResult = {
  migrated: { from: string; to: string; title: string }[];
  /** content-* files not referenced by any info-* file (left untouched). */
  orphans: string[];
  /** info-* files that could not be migrated, with the reason (left untouched). */
  failed: { file: string; reason: string }[];
  backupDir: string;
};

const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

function toHex(value: string): string {
  const m = value.trim().match(RGB_RE);
  if (!m) return value.trim();
  const h = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

export function parseLegacyInfo(raw: string): LegacyInfo | null {
  const info: Partial<LegacyInfo> = { hidden: false, encrypted: false };
  for (const line of raw.split(/\r?\n/)) {
    const space = line.indexOf(' ');
    if (space === -1) continue;
    const key = line.slice(0, space);
    const value = line.slice(space + 1).trim();
    switch (key) {
      case 'content': info.contentFile = value; break;
      case 'hidden': info.hidden = value === '1'; break;
      case 'encrypted': info.encrypted = value === '1'; break;
      case 'text': info.textColor = toHex(value); break;
      case 'title': info.title = value; break;
    }
  }
  return info.contentFile ? (info as LegacyInfo) : null;
}

export async function findLegacyInfoFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.startsWith('info-')).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function migrateLegacyNotes(dir: string, opts: { dryRun?: boolean } = {}): Promise<MigrationResult> {
  const backupDir = path.join(dir, LEGACY_BACKUP_DIR);
  const result: MigrationResult = { migrated: [], orphans: [], failed: [], backupDir };
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const referenced = new Set<string>();

  if (!opts.dryRun) await fs.mkdir(backupDir, { recursive: true });

  for (const infoName of await findLegacyInfoFiles(dir)) {
    const infoPath = path.join(dir, infoName);
    try {
      const info = parseLegacyInfo(await fs.readFile(infoPath, 'utf8'));
      if (!info) throw new Error('no "content" entry');
      if (info.contentFile.includes('/') || info.contentFile.includes('\\')) {
        throw new Error(`invalid content file name "${info.contentFile}"`);
      }
      referenced.add(info.contentFile);

      const contentPath = path.join(dir, info.contentFile);
      const [data, stat] = await Promise.all([fs.readFile(contentPath), fs.stat(contentPath)]);
      const timestamp = stat.mtime.toISOString();

      // Legacy encrypted notes are raw binary in exactly the v1 layout, so they only need armoring.
      const body = info.encrypted ? armor(data) : data.toString('utf8');
      const title = info.encrypted ? (info.title || info.contentFile) : extractTitle(body) || info.contentFile;

      const id = generateNoteId(stat.mtime);
      const target = noteFilePath(dir, id);
      const file = serializeFrontmatter(
        {
          id,
          color: info.textColor,
          archived: info.hidden,
          encrypted: info.encrypted,
          title: info.encrypted ? title : undefined,
          created: timestamp,
          updated: timestamp,
        },
        body
      );

      if (!opts.dryRun) {
        await fs.writeFile(target, file, { encoding: 'utf8', flag: 'wx' });
        await fs.utimes(target, stat.atime, stat.mtime);
        await fs.rename(infoPath, path.join(backupDir, infoName));
        await fs.rename(contentPath, path.join(backupDir, info.contentFile));
      }

      result.migrated.push({ from: info.contentFile, to: path.basename(target), title });
    } catch (error) {
      result.failed.push({ file: infoName, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith('content-') && !referenced.has(entry.name)) {
      result.orphans.push(entry.name);
    }
  }

  return result;
}

/**
 * Converts legacy task syntax to markdown checkboxes in all unencrypted `.md`
 * notes (encrypted notes are skipped; the app still understands both forms).
 * Returns the names of files that were (or, in dry-run mode, would be) changed.
 */
export async function migrateTaskSyntax(dir: string, opts: { dryRun?: boolean } = {}): Promise<string[]> {
  const changed: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.startsWith('.')) continue;
    const filePath = path.join(dir, entry.name);
    const raw = await fs.readFile(filePath, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    if (meta.encrypted === true) continue;
    const converted = convertLegacyTasks(body);
    if (converted === body) continue;
    if (!opts.dryRun) {
      await fs.writeFile(filePath, Object.keys(meta).length ? serializeFrontmatter(meta, converted) : converted, 'utf8');
    }
    changed.push(entry.name);
  }
  return changed;
}
