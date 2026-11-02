import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/*
 * Git-based sync for the notes directory, using the system `git` binary
 * (so the user's existing credentials/credential helpers are used).
 *
 * - pullNotes: commits local changes (locally only), then `git pull --rebase`
 * - syncNotes: pullNotes + `git push`
 * On a rebase conflict the rebase is aborted, so the working tree is left
 * clean and local changes stay safe in a local commit.
 */

const LOCAL_TIMEOUT_MS = 10_000;
const NETWORK_TIMEOUT_MS = 30_000;

export class SyncConflictError extends Error {}

type GitResult = { stdout: string; stderr: string };

function runGit(dir: string, args: string[], timeout = LOCAL_TIMEOUT_MS): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: dir,
      // Never prompt (credentials, SSH signing key passphrase): a prompt would
      // hang or corrupt the TUI. `detached` runs git in a new session without
      // a controlling terminal, so tools that open /dev/tty fail fast instead.
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf8'); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf8'); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`git ${args[0]}: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`git ${args[0]}: timed out after ${timeout / 1000}s`));
      } else if (code !== 0) {
        reject(new Error(`git ${args[0]}: ${(stderr || stdout).trim() || `exit code ${code}`}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function tryGit(dir: string, args: string[]): Promise<string | null> {
  try {
    return (await runGit(dir, args)).stdout.trim();
  } catch {
    return null;
  }
}

/** True when `dir` is inside a git work tree that has at least one remote. */
export async function isSyncEnabled(dir: string): Promise<boolean> {
  if (!fs.existsSync(dir)) return false;
  const inside = await tryGit(dir, ['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') return false;
  const remotes = await tryGit(dir, ['remote']);
  return !!remotes;
}

async function hasUpstream(dir: string): Promise<boolean> {
  return (await tryGit(dir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])) !== null;
}

async function head(dir: string): Promise<string | null> {
  return tryGit(dir, ['rev-parse', 'HEAD']);
}

/** True if there are uncommitted changes or local commits not pushed yet. */
export async function hasPendingChanges(dir: string): Promise<boolean> {
  const status = await tryGit(dir, ['status', '--porcelain', '--', '.']);
  if (status) return true;
  if (!(await hasUpstream(dir))) return (await head(dir)) !== null;
  const ahead = await tryGit(dir, ['rev-list', '--count', '@{u}..HEAD']);
  return ahead !== null && ahead !== '0';
}

/** Commits all changes in `dir` locally. Returns the number of changed files. */
export async function commitLocalChanges(dir: string): Promise<number> {
  const status = (await runGit(dir, ['status', '--porcelain', '--', '.'])).stdout.trim();
  if (!status) return 0;
  const files = status.split('\n');
  await runGit(dir, ['add', '-A', '--', '.']);
  const subject = `Sync from ${os.hostname()} (${files.length} ${files.length === 1 ? 'file' : 'files'})`;
  await runGit(dir, ['commit', '-q', '-m', subject, '-m', files.join('\n')]);
  return files.length;
}

async function rebaseInProgress(dir: string): Promise<boolean> {
  for (const name of ['rebase-merge', 'rebase-apply']) {
    const p = await tryGit(dir, ['rev-parse', '--git-path', name]);
    if (p && fs.existsSync(path.resolve(dir, p))) return true;
  }
  return false;
}

export type PullResult = { committed: number; updated: boolean };

export async function pullNotes(dir: string): Promise<PullResult> {
  const committed = await commitLocalChanges(dir);
  if (!(await hasUpstream(dir))) return { committed, updated: false };

  const before = await head(dir);
  try {
    await runGit(dir, ['pull', '--rebase', '--quiet'], NETWORK_TIMEOUT_MS);
  } catch (error) {
    if (await rebaseInProgress(dir)) {
      await tryGit(dir, ['rebase', '--abort']);
      throw new SyncConflictError(
        `Conflict: the same note was changed here and remotely. Your changes are kept in a local commit; ` +
        `resolve the conflict manually in ${dir} (git pull --rebase).`
      );
    }
    throw error;
  }
  return { committed, updated: (await head(dir)) !== before };
}

export type SyncResult = PullResult & { pushed: boolean };

export async function syncNotes(dir: string): Promise<SyncResult> {
  const pull = await pullNotes(dir);
  if (!(await hasPendingChanges(dir))) return { ...pull, pushed: false };

  if (await hasUpstream(dir)) {
    await runGit(dir, ['push', '--quiet'], NETWORK_TIMEOUT_MS);
  } else {
    await runGit(dir, ['push', '--quiet', '-u', 'origin', 'HEAD'], NETWORK_TIMEOUT_MS);
  }
  return { ...pull, pushed: true };
}
