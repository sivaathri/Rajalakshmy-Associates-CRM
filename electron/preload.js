import { contextBridge } from 'electron';

// Expose safe APIs to renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron
});
