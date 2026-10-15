/**
 * Descarga las guías docentes del Grado en Ingeniería Informática de la ETSIIT y
 * guarda, en `guias-docentes.json`, el profesorado de cada asignatura con sus
 * grupos. Es la fuente de las **asignaciones** (qué profesor da la teoría de una
 * letra o las prácticas de un subgrupo), que no está en los horarios.
 *
 * Lo que se guarda es el volcado crudo de las guías —nombre, curso y las dos
 * listas de profesorado—, no las asignaciones ya cruzadas con el catálogo: el
 * cruce lo hace `guias.js` al sembrar, para que un cambio en las reglas no
 * obligue a volver a salir a internet.
 *
 * Uso: `node tools/ugr-pipeline/scrape-guias.mjs`
 *
 * La página se pide con un User-Agent propio y con una pausa entre guías: son 96
 * peticiones seguidas a un servidor público y no hace falta ir a rebufo.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseGuia } from "./guias.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const INDEX_URL =
  "https://etsiit.ugr.es/informacion-academica/grados/graduadoa-ingenieria-informatica";
const USER_AGENT = "ugr-horario/1.0 (proyecto personal de horarios; una pasada por curso)";
const PAUSA_MS = 150;

/**
 * Enlaces a las guías docentes que aparecen en la página de la titulación.
 *
 * @param {string} html página de la titulación.
 * @param {string} [origin] origen con el que resolver un enlace relativo.
 * @returns {string[]} URLs absolutas en https, sin repetir y ordenadas.
 */
export function guiaUrls(html, origin = "https://etsiit.ugr.es") {
  const urls = new Set();
  for (const match of String(html || "").matchAll(/href="([^"]*\/guia-docente)"/g)) {
    const href = match[1].replace(/^http:/, "https:");
    urls.add(href.startsWith("/") ? `${origin}${href}` : href);
  }
  return [...urls].sort();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const index = await fetchText(INDEX_URL);
  const urls = guiaUrls(index);
  if (!urls.length) throw new Error("la página de la titulación no tiene enlaces a guías");

  const guias = [];
  const sinProfesorado = [];
  for (const url of urls) {
    const guia = { url, ...parseGuia(await fetchText(url)) };
    if (!guia.teorico.length && !guia.practico.length) sinProfesorado.push(guia.nombre);
    guias.push(guia);
    await sleep(PAUSA_MS);
  }

  const cursos = [...new Set(guias.map((g) => g.curso).filter(Boolean))];
  if (cursos.length > 1) {
    throw new Error(`las guías son de cursos distintos: ${cursos.join(", ")}`);
  }

  writeFileSync(
    OUT_PATH,
    `${JSON.stringify({ generadoDesde: INDEX_URL, curso: cursos[0] || "", guias }, null, 1)}\n`,
    "utf8",
  );

  const conProfesorado = guias.length - sinProfesorado.length;
  process.stdout.write(
    [
      `guías: ${guias.length} (con profesorado: ${conProfesorado})`,
      `sin profesorado: ${sinProfesorado.length}`,
      `curso: ${cursos[0] || "?"}`,
      `escrito: ${path.relative(ROOT, OUT_PATH)}`,
      "",
    ].join("\n"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  });
}
