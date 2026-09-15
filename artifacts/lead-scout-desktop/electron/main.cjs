const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const fs = require("node:fs");

app.setAppUserModelId("com.real.leadscout");

let updateState = { configured: false, status: "idle" };

function runtimeConfig() {
  const configPath = app.isPackaged
    ? path.join(process.resourcesPath, "runtime-config.json")
    : path.join(__dirname, "runtime-config.json");
  const file = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
  return {
    apiBaseUrl: process.env.REAL_API_URL || file.apiBaseUrl || "",
    updateUrl: process.env.REAL_UPDATE_URL || file.updateUrl || "",
  };
}

function sendUpdateStatus(status) {
  updateState = typeof status === "string"
    ? { configured: true, status }
    : { configured: true, ...status };
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("real:update-status", status);
  }
}

function configureUpdates() {
  const { updateUrl } = runtimeConfig();
  if (!app.isPackaged || !updateUrl || updateUrl.includes("example.invalid")) {
    updateState = { configured: false, status: "unconfigured" };
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({ provider: "generic", url: updateUrl });
  autoUpdater.on("checking-for-update", () => sendUpdateStatus("checking"));
  autoUpdater.on("update-available", () => sendUpdateStatus("available"));
  autoUpdater.on("update-not-available", () => sendUpdateStatus("current"));
  autoUpdater.on("download-progress", (value) => sendUpdateStatus({ status: "downloading", percent: value.percent }));
  autoUpdater.on("update-downloaded", () => sendUpdateStatus("downloaded"));
  autoUpdater.on("error", (error) => sendUpdateStatus({ status: "error", message: error.message }));
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000).unref();
}

ipcMain.handle("real:get-config", () => runtimeConfig());
ipcMain.handle("real:get-app-info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  packaged: app.isPackaged,
  updateConfigured: Boolean(runtimeConfig().updateUrl),
}));
ipcMain.handle("real:get-update-status", () => updateState);
ipcMain.handle("real:window-control", (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (action === "minimize") window.minimize();
  if (action === "maximize") window.isMaximized() ? window.unmaximize() : window.maximize();
  if (action === "close") window.close();
});
ipcMain.handle("real:check-updates", async () => {
  const { updateUrl } = runtimeConfig();
  if (!app.isPackaged || !updateUrl || updateUrl.includes("example.invalid")) {
    updateState = { configured: false, status: "unconfigured" };
    return updateState;
  }
  await autoUpdater.checkForUpdates();
  return updateState;
});
ipcMain.handle("real:install-update", () => {
  if (updateState.status !== "downloaded") return { started: false };
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { started: true };
});
ipcMain.handle("real:request", async (_event, request) => {
  const { apiBaseUrl } = runtimeConfig();
  if (!apiBaseUrl || apiBaseUrl.includes("example.invalid")) {
    return { status: 503, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "Адрес сервера Real не настроен в runtime-config.json" }) };
  }
  const url = new URL(request.path, apiBaseUrl).toString();
  const response = await session.defaultSession.fetch(url, {
    method: request.method,
    headers: request.headers,
    body: request.body || undefined,
    credentials: "include",
  });
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
});

function createWindow() {
  const window = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#00000000",
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    movable: true,
    thickFrame: true,
    hasShadow: true,
    title: "Real",
    icon: path.join(__dirname, "../public/favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.removeMenu();
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("tel:")) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:")) event.preventDefault();
  });
  window.loadFile(path.join(__dirname, "../public/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  configureUpdates();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});