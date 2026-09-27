// Outil du vendeur pour les licences (à lancer sur VOTRE ordinateur uniquement).
//
//   npm run licence:init                              crée la paire de clés (une seule fois)
//   npm run licence:cle -- 3F2A-91C0-7B5D-E842 "Nom"  fabrique la clé d'activation d'un enseignant
//   npm run licence:publique                          réécrit electron/cle-publique.cjs depuis la clé privée
//
// La clé privée est rangée HORS du projet (dossier personnel) : ne la partagez jamais,
// ne la mettez jamais sur GitHub. Si vous la perdez, il faudra refaire init et
// réactiver tous les enseignants.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dossierPrive = path.join(os.homedir(), ".gestion-soutien");
const clePrivee = path.join(dossierPrive, "cle-privee.pem");
const clePubliqueCjs = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "electron", "cle-publique.cjs");

const [commande, code, ...nom] = process.argv.slice(2);

/** Écrit la clé publique (déduite de la clé privée) dans electron/cle-publique.cjs et l'affiche. */
function ecrirePublique() {
  const pub = crypto.createPublicKey(fs.readFileSync(clePrivee, "utf-8")).export({ type: "spki", format: "pem" });
  fs.writeFileSync(
    clePubliqueCjs,
    `// Clé publique de vérification des licences, écrite par « npm run licence:init ».\n// Vide = activation désactivée (le logiciel fonctionne sans clé).\nmodule.exports = ${JSON.stringify(pub)};\n`,
  );
  console.log(`Clé publique écrite dans electron/cle-publique.cjs (elle n'est pas secrète) :\n\n${pub}`);
  console.log(`Envoyez ce fichier sur GitHub :\n  git add electron/cle-publique.cjs && git commit -m "Clé publique des licences" && git push\n`);
}

if (commande === "init") {
  if (fs.existsSync(clePrivee)) {
    console.error(`Une clé privée existe déjà : ${clePrivee}\nSupprimez-la d'abord si vous voulez vraiment en créer une nouvelle (les anciennes clés d'activation ne marcheront plus).`);
    process.exit(1);
  }
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.mkdirSync(dossierPrive, { recursive: true });
  fs.writeFileSync(clePrivee, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  console.log(`Clé privée enregistrée (GARDEZ-LA SECRÈTE, faites-en une copie sur clé USB) :\n  ${clePrivee}\n`);
  ecrirePublique();
} else if (commande === "publique") {
  if (!fs.existsSync(clePrivee)) {
    console.error("Pas de clé privée : lancez d'abord  npm run licence:init");
    process.exit(1);
  }
  ecrirePublique();
} else if (commande === "cle" && code && nom.length) {
  if (!fs.existsSync(clePrivee)) {
    console.error("Pas de clé privée : lancez d'abord  npm run licence:init");
    process.exit(1);
  }
  const m = code.trim().toUpperCase();
  if (!/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(m)) {
    console.error("Code d'ordinateur invalide (attendu : XXXX-XXXX-XXXX-XXXX).");
    process.exit(1);
  }
  const charge = Buffer.from(JSON.stringify({ n: nom.join(" "), m, d: new Date().toISOString().slice(0, 10) })).toString("base64url");
  const signature = crypto.sign(null, Buffer.from(charge), fs.readFileSync(clePrivee, "utf-8")).toString("base64url");
  console.log(`\nClé d'activation pour ${nom.join(" ")} (ordinateur ${m}) :\n\n${charge}.${signature}\n`);
} else {
  console.log('Utilisation :\n  npm run licence:init\n  npm run licence:publique\n  npm run licence:cle -- XXXX-XXXX-XXXX-XXXX "Nom de l\'enseignant"');
}
