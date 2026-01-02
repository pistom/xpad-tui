## WIP: vibecodded app

# xpad-tui

Terminal UI for managing xpad sticky notes.

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
- Hidden & config: `.` toggle note hidden, `a` show/hide hidden notes, `c` open config
- Global: `?` show controls, `q` quit

Editor selection:

- **Priority order**: `--editor` CLI arg > config file > `$EDITOR` env var > `vi`
- Press `c` in the TUI to open application configuration and set a default editor command
- Configuration is saved to `~/.config/xpad/xpad-cli.conf`

Notes:

- This tool works with xpad's storage: plain-text note files kept in `~/.config/xpad`.
- **Encryption**: Notes can be encrypted using AES-256-GCM. 
  - Press `E` to encrypt/decrypt a note, or use `--encrypt` with `-n` when creating from CLI
  - Encrypted notes show 🔒 icon (locked) or 🔓 icon (unlocked/decrypted)
  - Press `D` to permanently decrypt a note (removes encryption and saves as plain text)
  - After editing an encrypted note, you'll be prompted to re-encrypt it
  - **Important**: Encrypted notes are NOT compatible with the original xpad application - they will appear as binary data
  - If you forget your password, the note cannot be recovered
  - Each note can have its own password
- Flatpak packaging guidance will be added later.
