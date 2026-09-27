// Pont sécurisé entre l'interface (React) et le processus principal.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  lire: () => ipcRenderer.invoke("donnees:lire"),
  ecrire: (donnees) => ipcRenderer.invoke("donnees:ecrire", donnees),
  dossier: () => ipcRenderer.invoke("donnees:dossier"),
  ouvrirDossier: () => ipcRenderer.invoke("donnees:ouvrirDossier"),
  enregistrerFichier: (options) => ipcRenderer.invoke("fichier:enregistrer", options),
  ouvrirFichier: (options) => ipcRenderer.invoke("fichier:ouvrir", options),
  licence: {
    etat: () => ipcRenderer.invoke("licence:etat"),
    activer: (cle) => ipcRenderer.invoke("licence:activer", cle),
  },
});
