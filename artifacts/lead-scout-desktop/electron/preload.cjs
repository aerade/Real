const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("realDesktop", {
  request: (request) => ipcRenderer.invoke("real:request", request),
  getConfig: () => ipcRenderer.invoke("real:get-config"),
  getAppInfo: () => ipcRenderer.invoke("real:get-app-info"),
  getUpdateStatus: () => ipcRenderer.invoke("real:get-update-status"),
  checkForUpdates: () => ipcRenderer.invoke("real:check-updates"),
  installUpdate: () => ipcRenderer.invoke("real:install-update"),
  windowControl: (action) => ipcRenderer.invoke("real:window-control", action),
  onUpdateStatus: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on("real:update-status", handler);
    return () => ipcRenderer.removeListener("real:update-status", handler);
  },
});