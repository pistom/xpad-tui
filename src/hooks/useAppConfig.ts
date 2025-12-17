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
  updateConfig: (config: AppConfig) => Promise<void>;
};

export function useAppConfig(initialDir: string): UseAppConfigReturn {
  const [config, setConfig] = useState<AppConfig>({});
  const [effectiveDir, setEffectiveDir] = useState(initialDir);
  const [configEditing, setConfigEditing] = useState(false);
  const [configEditorInput, setConfigEditorInput] = useState('');
  const [configNotesDirInput, setConfigNotesDirInput] = useState('');

  useEffect(() => {
    const loadInitialConfig = async () => {
      const cfg = await loadConfig();
      setConfig(cfg);
      setConfigEditorInput(cfg.editor || '');
      setConfigNotesDirInput(cfg.notesDir || '');
      const { resolveNotesDir } = await import('../config.js');
      setEffectiveDir(resolveNotesDir(cfg) || initialDir);
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
    updateConfig
  };
}
