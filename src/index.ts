#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import { loadConfig, resolveNotesDir } from './config.js';

const program = new Command();

program
  .name('xpad-tui')
  .description('TUI to manage xpad sticky notes')
  .option('-d, --dir <dir>', 'xpad notes directory')
  .option('-E, --editor <editor>', 'editor command to use for editing notes (overrides $EDITOR)')
  .action(async (opts) => {
    const editor = opts.editor as string | undefined;
    const cfg = await loadConfig();
    const dir = opts.dir || resolveNotesDir(cfg);

    // Switch to the alternate screen buffer so the original terminal contents
    // are preserved and automatically restored on exit when we leave the
    // alternate buffer. We also register handlers to ensure restoration on
    // signals or uncaught exceptions.
    const enterAlt = () => process.stdout.write('\x1b[?1049h');
    const exitAlt = () => process.stdout.write('\x1b[?1049l');

    enterAlt();

    const restoreAndExit = (code = 0) => {
      try { exitAlt(); } catch (e) { /* ignore */ }
      process.exit(code);
    };

    process.on('SIGINT', () => restoreAndExit(130));
    process.on('SIGTERM', () => restoreAndExit(143));
    process.on('uncaughtException', (err) => {
      // restore screen then rethrow so Node shows the error
      try { exitAlt(); } catch (_) { }
      // rethrow asynchronously to allow ink cleanup
      setTimeout(() => { throw err; });
    });

    // Also ensure we restore on normal exit
    process.on('exit', () => { try { exitAlt(); } catch (_) { } });

    render(React.createElement(App, { dir, editor }));
  });

program.parse(process.argv);
