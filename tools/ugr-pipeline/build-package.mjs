/**
 * Construye el paquete cifrado de `/ugr` (I-11).
 *
 * Mete en un solo criptograma los docentes y el catálogo reales del autor
 * —`privado/docentes.json` y `privado/catalogo.json`— y lo deja en
 * `public/ugr/datasets/ugr/gi/package.enc.json`, que es lo único que viaja al
 * repositorio. Quien escriba la contraseña en la app lo descifra, pero **no**
 * saca las convalidaciones ni el estado de las asignaturas: eso no entra aquí.
 *
 * El cifrado es el mismo del backup (`src/backup/crypto.js`: PBKDF2 600 000 +
 * AES-GCM 256), sin reimplementar nada. La contraseña **no** se guarda en
 * ningún sitio y este script no la escribe en disco ni en el artefacto: se pide
 * por terminal sin eco, y la alternativa por entorno queda documentada abajo
 * porque sí deja rastro en el historial del shell.
 *
 * Antes de escribir hace verificación de ida y vuelta (descifra en memoria y
 * compara con el original): si no cuadra, falla y no deja artefacto.
 *
 * Uso:
 *   node tools/ugr-pipeline/build-package.mjs
 *   UGR_PACKAGE_PASSPHRASE='…' node tools/ugr-pipeline/build-package.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { decrypt, encrypt } from "../../public/ugr/src/backup/crypto.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PRIVATE_DIR = path.join(ROOT, "privado");
const PACKAGE_PATH = path.join(ROOT, "public/ugr/datasets/ugr/gi/package.enc.json");
const DOCENTS_PATH = path.join(PRIVATE_DIR, "docentes.json");
const CATALOG_PATH = path.join(PRIVATE_DIR, "catalogo.json");
const PROMPT = "Contraseña del paquete (no se muestra): ";

/**
 * Cifra el paquete. Aislada del resto para poder probarla sin terminal: el test
 * cifra con una contraseña de mentira y descifra con el mismo módulo que usa el
 * navegador.
 *
 * @param {{docents: Array, catalog: Object}} payload contenido del paquete.
 * @param {string} passphrase contraseña elegida por el autor.
 * @returns {Promise<{v: number, salt: string, iv: string, data: string}>}
 *   criptograma listo para `JSON.stringify`.
 */
export async function buildPackage(payload, passphrase) {
  return encrypt(JSON.stringify(payload), passphrase);
}

/**
 * Pide la contraseña por terminal sin eco. Se enmascara la escritura de
 * `readline` (no hay forma sin dependencias de silenciarla de otro modo) y se
 * imprime el prompt una sola vez.
 *
 * @returns {Promise<string>} contraseña tecleada.
 */
function promptPassphrase() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rl._writeToOutput = (str) => {
      if (str.includes(PROMPT)) rl.output.write(PROMPT);
      else rl.output.write("*");
    };
    rl.question(PROMPT, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

/** Forma estable para comparar el original con lo descifrado. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function main() {
  const docents = JSON.parse(readFileSync(DOCENTS_PATH, "utf8"));
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const payload = { docents, catalog };
  const plaintext = canonicalJson(payload);

  const fromEnv = process.env.UGR_PACKAGE_PASSPHRASE;
  const passphrase = fromEnv || (await promptPassphrase());
  if (!passphrase) throw new Error("contraseña vacía: el paquete no se genera");
  if (fromEnv) {
    process.stderr.write(
      "Aviso: has usado UGR_PACKAGE_PASSPHRASE; esa variable queda en el historial del shell.\n",
    );
  }

  const cipher = await buildPackage(payload, passphrase);

  // Ida y vuelta antes de escribir: si el descifrado no devuelve exactamente lo
  // mismo, no hay artefacto (mejor no publicar algo que luego no se puede abrir).
  const roundTrip = await decrypt(cipher, passphrase);
  if (canonicalJson(JSON.parse(roundTrip)) !== plaintext) {
    throw new Error("la verificación de ida y vuelta no coincide: no se escribe nada");
  }
  if (typeof passphrase === "string" && JSON.stringify(cipher).includes(passphrase)) {
    throw new Error("el criptograma contiene la contraseña: no se escribe nada");
  }

  mkdirSync(path.dirname(PACKAGE_PATH), { recursive: true });
  writeFileSync(PACKAGE_PATH, `${JSON.stringify(cipher, null, 2)}\n`, "utf8");

  const opinions = docents.reduce((n, d) => n + (d.profile?.opinions?.length || 0), 0);
  process.stdout.write(
    [
      `docents: ${docents.length} (opiniones: ${opinions})`,
      `subjects: ${Array.isArray(catalog.subjects) ? catalog.subjects.length : 0}`,
      `plano: ${Buffer.byteLength(plaintext, "utf8")} bytes`,
      `cifrado: ${Buffer.byteLength(JSON.stringify(cipher), "utf8")} bytes`,
      `escrito: ${path.relative(ROOT, PACKAGE_PATH)}`,
      "verificación de ida y vuelta: ok",
      "",
    ].join("\n"),
  );
}

// Solo si se ejecuta directamente: al importarlo desde un test no se toca el
// disco ni se pide contraseña.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  });
}
