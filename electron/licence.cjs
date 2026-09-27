// Licence : une clé d'activation signée (Ed25519) et liée à un ordinateur.
// La clé publique (electron/cle-publique.cjs) vérifie ; seule la clé privée du vendeur signe.
const crypto = require("crypto");
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const CLE_PUBLIQUE = require("./cle-publique.cjs");

function identifiantBrut() {
  try {
    if (process.platform === "win32") {
      const sortie = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: "utf-8", windowsHide: true });
      const m = sortie.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
      if (m) return m[1];
    } else if (process.platform === "darwin") {
      const m = execSync("ioreg -rd1 -c IOPlatformExpertDevice", { encoding: "utf-8" }).match(/"IOPlatformUUID" = "([^"]+)"/);
      if (m) return m[1];
    } else {
      for (const f of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        if (fs.existsSync(f)) return fs.readFileSync(f, "utf-8").trim();
      }
    }
  } catch {
    /* on retombe sur le nom de l'ordinateur */
  }
  return os.hostname();
}

/** Code à 16 caractères propre à cet ordinateur, ex. 3F2A-91C0-7B5D-E842. */
function codeMachine() {
  const h = crypto.createHash("sha256").update(`gestion-soutien|${identifiantBrut()}`).digest("hex").slice(0, 16).toUpperCase();
  return h.match(/.{4}/g).join("-");
}

/** Vérifie une clé ; renvoie { nom, date } si elle est valide pour ce code machine, sinon null. */
function verifier(cle, code) {
  if (!CLE_PUBLIQUE) return null;
  try {
    const [charge, signature] = String(cle).replace(/\s+/g, "").split(".");
    if (!charge || !signature) return null;
    const ok = crypto.verify(null, Buffer.from(charge), CLE_PUBLIQUE, Buffer.from(signature, "base64url"));
    if (!ok) return null;
    const infos = JSON.parse(Buffer.from(charge, "base64url").toString("utf-8"));
    if (infos.m !== code) return null;
    return { nom: infos.n, date: infos.d };
  } catch {
    return null;
  }
}

module.exports = { codeMachine, verifier, licenceConfiguree: !!CLE_PUBLIQUE };
