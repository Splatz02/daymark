const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('daymark', {
  load: () => ipcRenderer.invoke('data:load'),
  save: data => ipcRenderer.invoke('data:save', data),
  exportBackup: (data,options) => ipcRenderer.invoke('backup:export', data,options),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getUpdateState: () => ipcRenderer.invoke('updates:get'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  deferUpdate: () => ipcRenderer.invoke('updates:defer'),
  openReleases: () => ipcRenderer.invoke('updates:releases'),
  onUpdate: callback => { const listener=(_event,state)=>callback(state);ipcRenderer.on('updates:state',listener);return()=>ipcRenderer.removeListener('updates:state',listener); },
  platform: process.platform
});
