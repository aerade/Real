const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

app.setAppUserModelId("com.real.installer");

const targetArgumentIndex = process.argv.findIndex((value) => value === "--target");
const requestedTarget = targetArgumentIndex >= 0 ? process.argv[targetArgumentIndex + 1] : "";
const defaultTarget = requestedTarget ||
  path.join(process.env.LOCALAPPDATA || app.getPath("appData"), "Programs", "Real");

function createWindow() {
  const window = new BrowserWindow({
    width: 900,
    height: 570,
    minWidth: 760,
    minHeight: 500,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: true,
    title: "Real Installer",
    icon: path.join(process.resourcesPath, "installer-icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.removeMenu();
  window.once("ready-to-show", () => window.show());
  window.loadFile(path.join(__dirname, "index.html"));
}

function payloadDirectory() {
  return path.join(process.resourcesPath, "real-app");
}

function installationTarget(value) {
  return path.resolve(String(value || defaultTarget));
}

function writeShortcut(shortcutPath, target, description) {
  if (process.platform !== "win32") return;
  fs.mkdirSync(path.dirname(shortcutPath), { recursive: true });
  shell.writeShortcutLink(shortcutPath, {
    target,
    cwd: path.dirname(target),
    description,
    icon: target,
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function copyPayloadWithRetry(payload, target) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      copyDirectoryContents(payload, target);
      return;
    } catch (error) {
      lastError = error;
      await wait(attempt < 3 ? 750 : 500);
    }
  }
  const detail = lastError instanceof Error && lastError.message ? ` ${lastError.message}` : "";
  throw new Error(`Could not replace the existing Real installation. Close Real and try again.${detail}`);
}

function copyDirectoryContents(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else if (entry.isSymbolicLink()) {
      fs.rmSync(targetPath, { force: true });
      fs.symlinkSync(fs.readlinkSync(sourcePath), targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

ipcMain.handle("installer:get-info", (_event, requestedTarget) => {
  const target = installationTarget(requestedTarget);
  return {
    target,
    installed: fs.existsSync(path.join(target, "Real.exe")),
    payloadReady: fs.existsSync(path.join(payloadDirectory(), "Real.exe")),
    version: app.getVersion(),
  };
});

ipcMain.handle("installer:choose-directory", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? null : result.filePaths[0] || null;
});

ipcMain.handle("installer:get-asset-url", (_event, assetName) => {
  const allowedAssets = new Set(["installer-bg.png"]);
  if (!allowedAssets.has(assetName)) return "";
  return pathToFileURL(path.join(process.resourcesPath, "installer", assetName)).toString();
});

ipcMain.handle("installer:window-control", (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (action === "minimize") window.minimize();
  if (action === "maximize") window.isMaximized() ? window.unmaximize() : window.maximize();
  if (action === "close") window.close();
});

ipcMain.handle("installer:install", async (_event, requestedPath, options = {}) => {
  const target = installationTarget(requestedPath);
  const payload = payloadDirectory();
  if (!fs.existsSync(path.join(payload, "Real.exe"))) {
    throw new Error("The bundled Real application payload is missing.");
  }
  if (path.resolve(payload) === path.resolve(target)) {
    throw new Error("Choose a different installation folder.");
  }
  fs.mkdirSync(target, { recursive: true });
  await copyPayloadWithRetry(payload, target);

  const executable = path.join(target, "Real.exe");
  const startMenu = path.join(process.env.APPDATA || app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "Real.lnk");
  const desktop = path.join(app.getPath("desktop"), "Real.lnk");
  if (options.startMenuShortcut !== false) writeShortcut(startMenu, executable, "Real workspace");
  if (options.desktopShortcut !== false) writeShortcut(desktop, executable, "Real workspace");
  return { target, executable, version: app.getVersion() };
});

ipcMain.handle("installer:launch", async (_event, executable) => {
  const target = String(executable || path.join(defaultTarget, "Real.exe"));
  if (fs.existsSync(target)) {
    const error = await shell.openPath(target);
    if (error) return { started: false, error };
    setTimeout(() => app.quit(), 250);
    return { started: true };
  }
  return { started: false };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());