// Processus principal Electron : fenêtre + stockage des données dans un fichier JSON.
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const licence = require("./licence.cjs");

// Interface et sélecteurs de date en français (JJ/MM/AAAA).
app.commandLine.appendSwitch("lang", "fr");

const dossierDonnees = () => app.getPath("userData");
const fichierDonnees = () => path.join(dossierDonnees(), "donnees.json");
const fichierLicence = () => path.join(dossierDonnees(), "licence.json");

const code = licence.codeMachine();

function etatLicence() {
  if (!licence.licenceConfiguree) return { requise: false, active: true, code };
  let infos = null;
  try {
    infos = licence.verifier(JSON.parse(fs.readFileSync(fichierLicence(), "utf-8")).cle, code);
  } catch {
    /* pas encore de licence */
  }
  return { requise: true, active: !!infos, code, nom: infos?.nom };
}

function lireDonnees() {
  try {
    return JSON.parse(fs.readFileSync(fichierDonnees(), "utf-8"));
  } catch {
    return null;
  }
}

// Écriture atomique + copie de secours du fichier précédent.
function ecrireDonnees(donnees) {
  const cible = fichierDonnees();
  fs.mkdirSync(path.dirname(cible), { recursive: true });
  const tmp = cible + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(donnees, null, 2), "utf-8");
  if (fs.existsSync(cible)) fs.copyFileSync(cible, cible + ".bak");
  fs.renameSync(tmp, cible);
  return true;
}

function creerFenetre() {
  const win = new BrowserWindow({
    width: 1360,
    height: 820,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: "#f5efe4",
    title: "Gestion Soutien",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

ipcMain.handle("donnees:lire", () => lireDonnees());
ipcMain.handle("donnees:ecrire", (_e, donnees) => (etatLicence().active ? ecrireDonnees(donnees) : false));

ipcMain.handle("licence:etat", () => etatLicence());
ipcMain.handle("licence:activer", (_e, cle) => {
  if (!licence.verifier(cle, code)) return false;
  fs.mkdirSync(dossierDonnees(), { recursive: true });
  fs.writeFileSync(fichierLicence(), JSON.stringify({ cle: String(cle).replace(/\s+/g, "") }), "utf-8");
  return true;
});
ipcMain.handle("donnees:dossier", () => dossierDonnees());
ipcMain.handle("donnees:ouvrirDossier", () => shell.openPath(dossierDonnees()));

ipcMain.handle("fichier:enregistrer", async (e, { nomParDefaut, contenu, filtres }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: nomParDefaut,
    filters: filtres,
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, contenu, "utf-8");
  return true;
});

ipcMain.handle("fichier:ouvrir", async (e, { filtres }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: filtres,
  });
  if (canceled || !filePaths[0]) return null;
  return fs.readFileSync(filePaths[0], "utf-8");
});

app.whenReady().then(() => {
  creerFenetre();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
