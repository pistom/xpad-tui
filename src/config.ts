import fs from "fs/promises";
import path from "path";
import os from "os";
import type { AppConfig } from "./types/index.js";

const CONFIG_DIR = path.join(os.homedir(), ".config", "xpad");
const CONFIG_PATH = path.join(CONFIG_DIR, "xpad-cli.conf");

// Reads persisted CLI configuration or returns defaults
export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

export { CONFIG_PATH };

export function resolveNotesDir(cfg?: AppConfig): string {
  const nd =
    cfg && cfg.notesDir
      ? cfg.notesDir
      : path.join(os.homedir(), ".config", "xpad");
  if (nd.startsWith("~")) return path.join(os.homedir(), nd.slice(1));
  return nd;
}

const DEFAULT_NOTES_LIST_WIDTH = 30;
const MIN_NOTES_LIST_WIDTH = 20;
const MIN_NOTE_VIEW_WIDTH = 20;

export function normalizeNotesListWidth(
  preferredWidth: number | undefined,
  totalColumns: number
): number {
  const safeTotal = Math.max(totalColumns, MIN_NOTES_LIST_WIDTH + MIN_NOTE_VIEW_WIDTH + 3);
  const fallback = DEFAULT_NOTES_LIST_WIDTH;
  const rawWidth = Number.isFinite(preferredWidth ?? NaN)
    ? (preferredWidth as number)
    : fallback;
  const clampedPreferred = Math.max(MIN_NOTES_LIST_WIDTH, Math.min(rawWidth, safeTotal - MIN_NOTE_VIEW_WIDTH));
  const finalWidth = Math.max(MIN_NOTES_LIST_WIDTH, Math.min(clampedPreferred, safeTotal - MIN_NOTE_VIEW_WIDTH));
  return finalWidth;
}

export const NOTES_LIST_WIDTH_DEFAULT = DEFAULT_NOTES_LIST_WIDTH;
export const NOTES_LIST_MIN_WIDTH = MIN_NOTES_LIST_WIDTH;
export const NOTE_VIEW_MIN_WIDTH = MIN_NOTE_VIEW_WIDTH;
