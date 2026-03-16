import { useEffect, useState } from 'react';
import { loadConfig, saveConfig } from '../config.js';
import type { AppConfig } from '../types/index.js';

type UseAppConfigReturn = {
  config: AppConfig;
  effectiveDir: string;
  setEffectiveDir: (dir: string) => void;
  configEditing: boolean;
  setConfigEditing: (editing: boolean) => void;
  configEditorInput: string;
  setConfigEditorInput: (value: string) => void;
  configNotesDirInput: string;
  setConfigNotesDirInput: (value: string) => void;
  configNotesListWidthInput: string;
  setConfigNotesListWidthInput: (value: string) => void;
  updateConfig: (config: AppConfig) => Promise<void>;
};

export function useAppConfig(initialDir: string): UseAppConfigReturn {
  const [config, setConfig] = useState<AppConfig>({});
  const [effectiveDir, setEffectiveDir] = useState(initialDir);
  const [configEditing, setConfigEditing] = useState(false);
  const [configEditorInput, setConfigEditorInput] = useState('');
  const [configNotesDirInput, setConfigNotesDirInput] = useState('');
  const [configNotesListWidthInput, setConfigNotesListWidthInput] = useState('');

  useEffect(() => {
    const loadInitialConfig = async () => {
      const cfg = await loadConfig();
      setConfig(cfg);
      setConfigEditorInput(cfg.editor || '');
      setConfigNotesDirInput(cfg.notesDir || '');
      setConfigNotesListWidthInput(
        typeof cfg.notesListWidth === 'number' ? String(cfg.notesListWidth) : ''
      );
      // Use the initialDir passed from CLI, which already has correct priority
      setEffectiveDir(initialDir);
    };
    
    loadInitialConfig();
  }, [initialDir]);

  const updateConfig = async (newConfig: AppConfig) => {
    await saveConfig(newConfig);
    setConfig(newConfig);
  };

  return {
    config,
    effectiveDir,
    setEffectiveDir,
    configEditing,
    setConfigEditing,
    configEditorInput,
    setConfigEditorInput,
    configNotesDirInput,
    setConfigNotesDirInput,
    configNotesListWidthInput,
    setConfigNotesListWidthInput,
    updateConfig
  };
}
