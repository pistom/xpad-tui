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

Editor selection:

- The editor used is read from `$EDITOR` by default, or you can pass `--editor <cmd>` to `xpad-tui` to override it for the session.
- Press `c` in the TUI to open application configuration and set a default editor command; configuration is saved to `~/.config/xpad/xpad-cli.conf`.

Notes:

- This tool works with xpad's storage: plain-text note files kept in `~/.config/xpad`.
- Flatpak packaging guidance will be added later.
