/**
 * Deja `sample-docents.json` con **opiniones inventadas**.
 *
 * La muestra publica los nombres reales de los profesores (los da la ETSIIT),
 * pero no el texto que opina nadie sobre ellos: eso vive en `privado/` y viaja
 * cifrado. Este script sustituye las opiniones del fixture por las de
 * `sample-opinions.js` y deja el fichero marcado con `opinionesFicticias: true`,
 * que es lo que el emisor propaga al catálogo para que la interfaz lo avise.
 *
 * Es idempotente: las opiniones se derivan de (asignatura, modalidad, nombre),
 * así que pasar dos veces el fichero por aquí no lo cambia.
 *
 * Uso: `node tools/ugr-pipeline/fictionalize-sample.mjs`
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OPINIONES_FICTICIAS, esOpinionFicticia, opinionesFicticias } from "./sample-opinions.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FIXTURE_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const perfiles = Array.isArray(fixture.profesores) ? fixture.profesores : [];

let cambiadas = 0;
fixture.profesores = perfiles.map((perfil) => {
  const opiniones = opinionesFicticias(perfil);
  if (JSON.stringify(opiniones) !== JSON.stringify(perfil.opinions || [])) cambiadas++;
  return { ...perfil, opinions: opiniones };
});
fixture.opinionesFicticias = true;

// Ni una opinión fuera del repertorio: si quedara texto de la hoja, es que el
// fichero traía algo que este script no ha sabido sustituir.
const intrusas = fixture.profesores
  .flatMap((perfil) => perfil.opinions || [])
  .filter((texto) => !esOpinionFicticia(texto));
if (intrusas.length) {
  throw new Error(`quedan opiniones que no son del repertorio: ${intrusas.slice(0, 3).join(" | ")}`);
}

writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

process.stdout.write(
  [
    `perfiles: ${fixture.profesores.length} (opiniones cambiadas: ${cambiadas})`,
    `opiniones del repertorio: ${OPINIONES_FICTICIAS.length}`,
    `wrote: ${path.relative(ROOT, FIXTURE_PATH)}`,
    "",
  ].join("\n"),
);
