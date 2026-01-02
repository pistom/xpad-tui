#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import { loadConfig, resolveNotesDir } from './config.js';
import { createNote } from './services/noteService.js';

const program = new Command();

program
  .name('xpad-tui')
  .description('TUI to manage xpad sticky notes')
  .option('-d, --dir <dir>', 'xpad notes directory')
  .option('-e, --editor <editor>', 'editor command to use for editing notes')
  .option('-n, --new <title>', 'create a new note with the given title and exit')
  .option('--encrypt', 'encrypt the new note (use with -n)')
  .action(async (opts) => {
    const cfg = await loadConfig();
    
    // CLI args have highest priority, then config file, then defaults
    const dir = opts.dir || resolveNotesDir(cfg);
    const cliEditor = opts.editor; // Only pass CLI arg, let App compute effective editor

    // If -n/--new flag is provided, create the note and exit without opening the UI
    if (opts.new) {
      try {
        let password: string | undefined;
        
        if (opts.encrypt) {
          // Prompt for password with hidden input
          const readline = await import('readline');
          const { stdin: input, stdout: output } = process;
          
          const rl = readline.createInterface({
            input,
            output,
            terminal: true
          });
          
          password = await new Promise<string>((resolve) => {
            // Hide input by muting stdout
            const onData = (char: Buffer) => {
              const str = char.toString('utf8');
              if (str === '\r' || str === '\n') {
                output.write('\n');
                input.removeListener('data', onData);
                rl.close();
              } else if (str === '\x7f' || str === '\b') {
                // Backspace
                if (password && password.length > 0) {
                  password = password.slice(0, -1);
                }
              } else if (str === '\x03') {
                // Ctrl+C
                process.exit(0);
              } else {
                password = (password || '') + str;
              }
            };
            
            let password = '';
            output.write('Enter password for encryption: ');
            
            if (input.isTTY && input.setRawMode) {
              input.setRawMode(true);
            }
            
            input.on('data', onData);
            
            // Fallback timeout to resolve
            rl.on('close', () => {
              if (input.isTTY && input.setRawMode) {
                input.setRawMode(false);
              }
              resolve(password);
            });
          });
          
          if (!password) {
            console.error('Password is required for encryption');
            process.exit(1);
          }
        }
        
        const note = await createNote(dir, opts.new, opts.new, opts.encrypt, password);
        console.log(`Note created${opts.encrypt ? ' and encrypted' : ''}: ${note.title}`);
        process.exit(0);
      } catch (error) {
        console.error('Failed to create note:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }

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

    render(React.createElement(App, { dir, cliEditor }));
  });

program.parse(process.argv);
