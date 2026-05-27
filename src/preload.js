const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getTriagemUrl: () => ipcRenderer.invoke("get-triagem-url"),
  getPainelUrl: () => ipcRenderer.invoke("get-painel-url"),
});
