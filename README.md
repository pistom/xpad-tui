## WIP: vibecodded app

# xpad-tui

Terminal UI for managing xpad sticky notes.

Quick start:

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Run: `npx xpad-tui -d /path/to/notes` (defaults to `~/.config/xpad`)

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

- The editor used is read from `$EDITOR` by default, or you can pass `--editor <cmd>` to `xpad-tui` to override it for the session.
- Press `c` in the TUI to open application configuration and set a default editor command; configuration is saved to `~/.config/xpad/xpad-cli.conf`.

Notes:

- This tool works with xpad's storage: plain-text note files kept in `~/.config/xpad`.
- Flatpak packaging guidance will be added later.
