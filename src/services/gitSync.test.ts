import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { isSyncEnabled, hasPendingChanges, pullNotes, syncNotes, SyncConflictError } from './gitSync';

// Isolate from the user's global git config (e.g. commit signing)
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
process.env.GIT_CONFIG_NOSYSTEM = '1';

let root: string;
let remote: string;
let a: string;
let b: string;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function clone(name: string): Promise<string> {
  const dir = path.join(root, name);
  git(root, 'clone', '-q', remote, dir);
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  // Never sign test commits (would prompt for the user's key passphrase)
  git(dir, 'config', 'commit.gpgsign', 'false');
  git(dir, 'config', 'tag.gpgsign', 'false');
  return dir;
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'xpad-sync-'));
  remote = path.join(root, 'remote.git');
  git(root, 'init', '-q', '--bare', '-b', 'main', remote);
  a = await clone('a');
  await fs.writeFile(path.join(a, 'note.md'), 'line 1\nline 2\n');
  git(a, 'add', '-A');
  git(a, 'commit', '-q', '-m', 'init');
  git(a, 'push', '-q', '-u', 'origin', 'main');
  b = await clone('b');
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

test('isSyncEnabled requires a git repo with a remote', async () => {
  expect(await isSyncEnabled(a)).toBe(true);
  const plain = path.join(root, 'plain');
  await fs.mkdir(plain);
  expect(await isSyncEnabled(plain)).toBe(false);
  git(plain, 'init', '-q');
  expect(await isSyncEnabled(plain)).toBe(false);
  expect(await isSyncEnabled(path.join(root, 'missing'))).toBe(false);
});

test('sync commits and pushes local changes; pull brings them to another clone', async () => {
  expect(await hasPendingChanges(a)).toBe(false);
  await fs.writeFile(path.join(a, 'new.md'), 'hello');
  expect(await hasPendingChanges(a)).toBe(true);

  expect(await syncNotes(a)).toEqual({ committed: 1, updated: false, pushed: true });
  expect(await hasPendingChanges(a)).toBe(false);
  expect(git(a, 'log', '-1', '--format=%s')).toMatch(/^Sync from .+ \(1 file\)$/);

  expect(await pullNotes(b)).toEqual({ committed: 0, updated: true });
  expect(await fs.readFile(path.join(b, 'new.md'), 'utf8')).toBe('hello');
});

test('non-conflicting edits on two machines are combined', async () => {
  await fs.writeFile(path.join(a, 'from-a.md'), 'a');
  await syncNotes(a);
  await fs.writeFile(path.join(b, 'from-b.md'), 'b');
  expect(await syncNotes(b)).toEqual({ committed: 1, updated: true, pushed: true });
  await pullNotes(a);
  expect((await fs.readdir(a)).sort()).toEqual(['.git', 'from-a.md', 'from-b.md', 'note.md']);
});

test('conflict aborts the rebase and keeps local changes in a local commit', async () => {
  await fs.writeFile(path.join(a, 'note.md'), 'line 1 from A\nline 2\n');
  await syncNotes(a);
  await fs.writeFile(path.join(b, 'note.md'), 'line 1 from B\nline 2\n');

  await expect(syncNotes(b)).rejects.toBeInstanceOf(SyncConflictError);
  expect(git(b, 'status', '--porcelain')).toBe('');
  expect(await fs.readFile(path.join(b, 'note.md'), 'utf8')).toBe('line 1 from B\nline 2\n');
  expect(await hasPendingChanges(b)).toBe(true);
});

test('network failure is reported and local commit is kept', async () => {
  git(b, 'remote', 'set-url', 'origin', path.join(root, 'does-not-exist.git'));
  await fs.writeFile(path.join(b, 'offline.md'), 'x');
  await expect(syncNotes(b)).rejects.toThrow(/git pull/);
  expect(git(b, 'log', '-1', '--format=%s')).toMatch(/^Sync from/);
  expect(await hasPendingChanges(b)).toBe(true);
});
