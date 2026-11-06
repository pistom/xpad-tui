## WIP: vibecodded app

# xpad-tui

Terminal UI for managing sticky notes stored as Markdown files.

Quick start:

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Run locally: `node dist/index.js -d /path/to/notes`
   - Or use: `npm start` (uses default directory `~/.config/xpad`)
   - Or install globally: `npm install -g .` then run `xpad-tui`

## Command Line Options

- `-d, --dir <dir>`: xpad notes directory (default: `~/.config/xpad`)
- `-e, --editor <editor>`: editor command to use (default: `nano`)
- `-n, --new <title>`: create a new note with the given title and exit (without opening the TUI)
- `--encrypt`: encrypt the new note (use with `-n`, will prompt for password)
- `--migrate`: convert notes from the old xpad format (`info-*` + `content-*`) to `.md` files and exit (add `--dry-run` to preview)

**Parameter Priority**: CLI arguments > config file > environment variables > defaults

Examples:
```bash
# Use custom directory
xpad-tui -d ~/my-notes

# Use specific editor
xpad-tui --editor nano

# Both options
xpad-tui -d ~/my-notes --editor code

# Create a note without opening the TUI
xpad-tui -n "My new note"

# Create a note in custom directory
xpad-tui -d ~/my-notes -n "Shopping list"

# Create an encrypted note
xpad-tui -n "Secret passwords" --encrypt
```

Controls in TUI:

- Navigation: `j`/`k` move up/down, `h`/`l` move left/right in the note view, `H`/`L` focus Notes list / Note view
- Grid view: `Tab` toggle grid, `h/j/k/l` move, `Enter` open selected note, `Tab`/`Esc` exit grid
- Filtering: `/` start filter, `Esc` clear filter
- Editing: `e` edit note, `n` new note, `d` delete note
- Visual select: `v` char mode, `V` line mode, `h/j/k/l` move, `w`/`b` word jump (char mode), `0`/`$` line start/end (char mode), `y` yank selection, `Y` yank whole note, `Esc` exit visual
- Encryption: `E` encrypt/decrypt note (prompts for password), `D` permanently decrypt note (removes encryption, saves as plain text)
- Archive & config: `.` archive/unarchive note, `a` show/hide archived notes, `o` toggle sort (last modified / title), `c` open config
- Sync: `S` sync notes with git (commit local changes, pull, push)
- Global: `?` show controls, `q` quit (asks whether to sync first if there are unsynced changes)

Editor selection:

- **Priority order**: `--editor` CLI arg > config file > `$EDITOR` env var > `vi`
- Press `c` in the TUI to open application configuration and set a default editor command
- Configuration is saved to `~/.config/xpad/xpad-cli.conf`

Storage format:

- Each note is a single Markdown file `<id>.md` in the notes directory (e.g. `20261102-101500-a1b2.md`).
  The file name is a stable id and does not change when the title changes; the title is the first line of the note.
- Metadata is kept in YAML frontmatter at the top of the file:

  ```markdown
  ---
  id: 20261102-101500-a1b2
  color: "#f5e663"
  archived: false
  encrypted: false
  created: 2026-11-02T10:15:00.000Z
  updated: 2026-11-02T12:40:00.000Z
  ---
  # Shopping list
  ...
  ```

  Unknown keys (e.g. `tags` added by another tool) are preserved when the note is saved.
- Encrypted notes keep their frontmatter in plain text (plus `title`) and store the body as ASCII armor
  (`-----BEGIN XPAD ENCRYPTED NOTE v1-----`): base64 of `[salt 16B][iv 16B][authTag 16B][ciphertext]`,
  AES-256-GCM with a key derived via scrypt (N=16384, r=8, p=1, 32 bytes).
- Migrating from the old xpad format: `xpad-tui --migrate --dry-run`, then `xpad-tui --migrate`.
  Old files are moved to `.xpad-legacy/` in the notes directory (not deleted).

Sync (git):

- If the notes directory is a git repository with a remote, notes are pulled automatically on startup.
- `S` commits local changes ("Sync from <hostname>"), runs `git pull --rebase` and `git push`.
- `q` asks whether to sync first when there are uncommitted changes or unpushed commits.
- Your git config applies (credentials, commit signing). git never prompts in the terminal; if your signing
  key needs a passphrase, your desktop askpass dialog is used (or load the key into ssh-agent).
- On a conflict (same note changed on two machines) the pull is aborted, local changes stay in a local
  commit, and you resolve it manually with `git pull --rebase` in the notes directory.

Notes:

- **Encryption**: Notes can be encrypted using AES-256-GCM.
  - Press `E` to encrypt/decrypt a note, or use `--encrypt` with `-n` when creating from CLI
  - Encrypted notes show 🔒 icon (locked) or 🔓 icon (unlocked/decrypted)
  - Press `D` to permanently decrypt a note (removes encryption and saves as plain text)
  - After editing an encrypted note, you'll be prompted to re-encrypt it
  - If you forget your password, the note cannot be recovered
  - Each note can have its own password
