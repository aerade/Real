const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

app.setAppUserModelId("com.real.leadscout");

let updateState = { configured: false, status: "idle", currentVersion: app.getVersion() };
let downloadedInstallerPath = "";

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
    ? { ...updateState, configured: true, status }
    : { ...updateState, configured: true, ...status };
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("real:update-status", updateState);
  }
}

function compareVersions(left, right) {
  const parse = (value) => String(value || "0").split(/[.+-]/)[0].split(".").map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) > (b[index] || 0) ? 1 : -1;
  }
  return 0;
}

function manifestUrl(baseUrl) {
  if (baseUrl.endsWith(".json")) return baseUrl;
  return `${baseUrl.replace(/\/?$/, "/")}real-update.json`;
}

async function checkForUpdates() {
  const { updateUrl } = runtimeConfig();
  if (!app.isPackaged || !updateUrl || updateUrl.includes("example.invalid")) {
    updateState = { configured: false, status: "unconfigured", currentVersion: app.getVersion() };
    return updateState;
  }

  sendUpdateStatus("checking");
  try {
    const response = await fetch(manifestUrl(updateUrl), { cache: "no-store" });
    if (!response.ok) throw new Error(`Update manifest returned ${response.status}`);
    const manifest = await response.json();
    const latestVersion = String(manifest.version || "");
    if (!latestVersion || !manifest.installerUrl) throw new Error("Update manifest is incomplete");
    if (compareVersions(latestVersion, app.getVersion()) > 0) {
      sendUpdateStatus({
        status: "available",
        latestVersion,
        installerUrl: new URL(manifest.installerUrl, manifestUrl(updateUrl)).toString(),
        releaseName: manifest.releaseName || "",
      });
    } else {
      sendUpdateStatus({ status: "current", latestVersion: app.getVersion() });
    }
  } catch (error) {
    sendUpdateStatus({ status: "error", message: error instanceof Error ? error.message : String(error) });
  }
  return updateState;
}

async function downloadUpdate() {
  if (updateState.status !== "available" || !updateState.installerUrl) return updateState;
  try {
    sendUpdateStatus({ status: "downloading", percent: 0 });
    const response = await fetch(updateState.installerUrl);
    if (!response.ok) throw new Error(`Installer download returned ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    downloadedInstallerPath = path.join(app.getPath("temp"), `Real-Installer-${updateState.latestVersion}.exe`);
    fs.writeFileSync(downloadedInstallerPath, buffer);
    sendUpdateStatus({ status: "downloaded", percent: 100 });
  } catch (error) {
    sendUpdateStatus({ status: "error", message: error instanceof Error ? error.message : String(error) });
  }
  return updateState;
}

function configureUpdates() {
  const { updateUrl } = runtimeConfig();
  if (!app.isPackaged || !updateUrl || updateUrl.includes("example.invalid")) {
    updateState = { configured: false, status: "unconfigured", currentVersion: app.getVersion() };
    return;
  }
  checkForUpdates().catch(() => undefined);
  setInterval(() => checkForUpdates().catch(() => undefined), 4 * 60 * 60 * 1000).unref();
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
ipcMain.handle("real:check-updates", () => checkForUpdates());
ipcMain.handle("real:download-update", () => downloadUpdate());
ipcMain.handle("real:open-archive-window", () => {
  createWindow("/archive");
});
ipcMain.handle("real:install-update", () => {
  if (updateState.status !== "downloaded" || !downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
    return { started: false };
  }
  const installDirectory = path.dirname(process.execPath);
  spawn(downloadedInstallerPath, ["--target", installDirectory], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
  // Close the running app before the installer replaces its locked files.
  // The installer also retries briefly for the Windows process teardown.
  setTimeout(() => app.quit(), 100);
  setTimeout(() => app.exit(0), 1500).unref();
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

function createWindow(hash = "") {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 540,
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
  window.loadFile(
    path.join(__dirname, "../public/index.html"),
    hash ? { hash } : undefined,
  );
  return window;
}

app.whenReady().then(() => {
  createWindow();
  configureUpdates();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});