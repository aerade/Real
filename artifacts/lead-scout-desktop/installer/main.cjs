const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

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

ipcMain.handle("installer:get-info", () => ({
  target: defaultTarget,
  payloadReady: fs.existsSync(path.join(payloadDirectory(), "Real.exe")),
  version: app.getVersion(),
}));

ipcMain.handle("installer:choose-directory", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? null : result.filePaths[0] || null;
});

ipcMain.handle("installer:window-control", (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (action === "minimize") window.minimize();
  if (action === "maximize") window.isMaximized() ? window.unmaximize() : window.maximize();
  if (action === "close") window.close();
});

ipcMain.handle("installer:install", async (_event, requestedPath) => {
  const target = path.resolve(String(requestedPath || defaultTarget));
  const payload = payloadDirectory();
  if (!fs.existsSync(path.join(payload, "Real.exe"))) {
    throw new Error("The bundled Real application payload is missing.");
  }
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(payload, target, { recursive: true, force: true });

  const executable = path.join(target, "Real.exe");
  const startMenu = path.join(process.env.APPDATA || app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "Real.lnk");
  const desktop = path.join(app.getPath("desktop"), "Real.lnk");
  writeShortcut(startMenu, executable, "Real workspace");
  writeShortcut(desktop, executable, "Real workspace");
  return { target, executable, version: app.getVersion() };
});

ipcMain.handle("installer:launch", (_event, executable) => {
  const target = String(executable || path.join(defaultTarget, "Real.exe"));
  if (fs.existsSync(target)) {
    shell.openPath(target);
    return { started: true };
  }
  return { started: false };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());