const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("realInstaller", {
  getInfo: () => ipcRenderer.invoke("installer:get-info"),
  chooseDirectory: () => ipcRenderer.invoke("installer:choose-directory"),
  install: (target) => ipcRenderer.invoke("installer:install", target),
  launch: (executable) => ipcRenderer.invoke("installer:launch", executable),
  windowControl: (action) => ipcRenderer.invoke("installer:window-control", action),
});