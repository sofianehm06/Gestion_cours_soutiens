import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { openDatabase } from "./database";
import { createRepository } from "./repository";

// Sélecteurs de date et formats natifs en français.
app.commandLine.appendSwitch("lang", "fr");

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "SoutienPro",
    backgroundColor: "#f5f7fa",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'application.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) void mainWindow.loadURL(devServerUrl);
  else void mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath("userData"), "soutienpro.sqlite");
  const db = openDatabase(dbPath);
  const repository = createRepository(db);

  ipcMain.handle("db", (_event, method: string, args: unknown[]) => {
    if (!Object.prototype.hasOwnProperty.call(repository, method)) {
      throw new Error(`Méthode inconnue : ${method}`);
    }
    const fn = repository[method as keyof typeof repository] as (...a: unknown[]) => unknown;
    return fn(...args);
  });

  app.on("will-quit", () => db.close());

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
