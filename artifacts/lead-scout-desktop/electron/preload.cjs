const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("realDesktop", {
  request: (request) => ipcRenderer.invoke("real:request", request),
  getConfig: () => ipcRenderer.invoke("real:get-config"),
  checkForUpdates: () => ipcRenderer.invoke("real:check-updates"),
  onUpdateStatus: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on("real:update-status", handler);
    return () => ipcRenderer.removeListener("real:update-status", handler);
  },
});