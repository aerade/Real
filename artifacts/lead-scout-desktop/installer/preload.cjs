const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("realInstaller", {
  getInfo: (target) => ipcRenderer.invoke("installer:get-info", target),
  chooseDirectory: () => ipcRenderer.invoke("installer:choose-directory"),
  getAssetUrl: (assetName) => ipcRenderer.invoke("installer:get-asset-url", assetName),
  install: (target, options) => ipcRenderer.invoke("installer:install", target, options),
  launch: (executable) => ipcRenderer.invoke("installer:launch", executable),
  windowControl: (action) => ipcRenderer.invoke("installer:window-control", action),
});