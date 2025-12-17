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
- `-E, --editor <editor>`: editor command to use (default: `$EDITOR` or `vi`)

**Parameter Priority**: CLI arguments > config file > environment variables > defaults

Examples:
```bash
# Use custom directory
xpad-tui -d ~/my-notes

# Use specific editor
xpad-tui --editor nano

# Both options
xpad-tui -d ~/my-notes --editor code
```

Controls in TUI:

- `j`/`k`: move down/up
- `e`: edit selected note (opens external editor)
- `n`: create a new note (opens external editor)
- `d`: delete selected note
- `H`: toggle hidden notes
- `q`: quit
 - `v`: enter vi-like visual selection mode for the note view
 - while in visual mode: `j`/`k` (or arrow keys) move the selection cursor
 - `y`: yank (copy) the current selection to the terminal clipboard via OSC52
 - `Y`: yank entire note
 - `h` / `l`: switch focus between the Notes list (`h`) and the Note view (`l`)
 - `.`: toggle the selected note's hidden flag
 - `a`: toggle showing hidden notes

Editor selection:

- **Priority order**: `--editor` CLI arg > config file > `$EDITOR` env var > `vi`
- Press `c` in the TUI to open application configuration and set a default editor command
- Configuration is saved to `~/.config/xpad/xpad-cli.conf`

Notes:

- This tool works with xpad's storage: plain-text note files kept in `~/.config/xpad`.
- Flatpak packaging guidance will be added later.
