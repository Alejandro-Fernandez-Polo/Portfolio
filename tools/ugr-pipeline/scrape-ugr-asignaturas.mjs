/**
 * Scrapeo del **profesorado y los grupos** de las asignaturas del Grado en las
 * páginas de la UGR (las que el autor señaló), y comparación con lo que ya
 * tenemos de la ETSIIT.
 *
 * Fuente: `https://www.ugr.es/estudiantes/grados/grado-ingenieria-informatica`
 * y una página por asignatura, todas enlazadas desde ahí. Cada página trae la
 * ficha (curso, semestre, tipo, centro, departamento), el **profesorado**
 * (teoría por letra de grupo, prácticas por número) y el **horario** (de ahí se
 * sacan los grupos que de verdad tiene la asignatura).
 *
 * Salidas:
 *   - `tools/ugr-pipeline/ugr-asignaturas.json` — el volcado de la UGR.
 *   - `planes/discrepancias-ugr.md` — dónde no cuadra con lo nuestro, para
 *     revisar a mano.
 *
 * Uso: `node tools/ugr-pipeline/scrape-ugr-asignaturas.mjs [--limit N]`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const INDICE = "https://www.ugr.es/estudiantes/grados/grado-ingenieria-informatica";
const SALIDA = path.join(ROOT, "tools/ugr-pipeline/ugr-asignaturas.json");
const INFORME = path.join(ROOT, "planes/discrepancias-ugr.md");
const USER_AGENT = "ugr-horario/1.0 (herramienta personal del autor)";

const sinEtiquetas = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú").replace(/&Ntilde;/g, "Ñ")
    .replace(/\s+/g, " ")
    .trim();

async function pedir(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.text();
}

/** Enlaces a las páginas de asignatura del índice de la titulación. */
function enlacesDeAsignatura(html) {
  const urls = new Set();
  const re = /href="([^"]*\/estudiantes\/grados\/grado-ingenieria-informatica\/[a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].startsWith("/") ? `https://www.ugr.es${m[1]}` : m[1];
    if (/\/grado-ingenieria-informatica\/?$/.test(url)) continue; // el índice
    urls.add(url.replace(/\/$/, ""));
  }
  return [...urls].sort();
}

/** El profesorado de una sección: «Teoría» o «Prácticas», con sus grupos. */
function profesorado(html, seccion) {
  const bloque = new RegExp(`<h3[^>]*>\\s*${seccion}\\s*</h3>([\\s\\S]*?)(?=<h3|<h2|$)`, "i").exec(html);
  if (!bloque) return [];
  const filas = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(bloque[1]))) {
    const texto = sinEtiquetas(m[1]);
    const grupos = (texto.match(/Grupos?\s+(.+)$/i) || [])[1] || "";
    const nombre = texto.replace(/Grupos?\s+.*$/i, "").trim();
    if (!nombre) continue;
    const lista = grupos
      .split(/\s*(?:,|y)\s*/i)
      .map((g) => g.trim())
      .filter(Boolean);
    filas.push({ nombre, grupos: lista.length ? lista : [] });
  }
  return filas;
}

/** Grupos que el horario de la página dice que existen (teoría y prácticas). */
function gruposDelHorario(html) {
  const grupos = new Set();
  const re = /Grupo:\s*([A-Za-z0-9]+)/g;
  let m;
  while ((m = re.exec(sinEtiquetas(html)))) grupos.add(m[1]);
  return [...grupos].sort();
}

function ficha(html) {
  const campo = (etiqueta) => {
    const re = new RegExp(`<t[hd][^>]*>\\s*${etiqueta}\\s*</t[hd]>\\s*<t[hd][^>]*>([\\s\\S]*?)</t[hd]>`, "i");
    const m = re.exec(html);
    return m ? sinEtiquetas(m[1]) : "";
  };
  const titulo = sinEtiquetas((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1] || "");
  return {
    titulo,
    curso: campo("Curso"),
    semestre: campo("Semestre"),
    tipo: campo("Tipo"),
    departamento: campo("Departamento"),
  };
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 0;

  const soloInforme = process.argv.includes("--solo-informe");
  let asignaturas = [];
  let fallos = [];
  if (soloInforme) {
    const guardado = JSON.parse(readFileSync(SALIDA, "utf8"));
    asignaturas = guardado.asignaturas;
    fallos = guardado.fallos || [];
    console.log(`volcado ya hecho: ${asignaturas.length} asignaturas`);
  }

  const indice = soloInforme ? "" : await pedir(INDICE);
  const todas = soloInforme ? [] : enlacesDeAsignatura(indice);
  const urls = limit ? todas.slice(0, limit) : todas;
  if (!soloInforme) console.log(`asignaturas en el índice: ${todas.length}${limit ? ` (se hacen ${urls.length})` : ""}`);

  for (const [i, url] of urls.entries()) {
    try {
      const html = await pedir(url);
      const f = ficha(html);
      asignaturas.push({
        url,
        slug: url.split("/").pop(),
        ...f,
        teoria: profesorado(html, "Teoría"),
        practicas: profesorado(html, "Prácticas"),
        gruposHorario: gruposDelHorario(html),
      });
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${urls.length}`);
    } catch (err) {
      fallos.push(`${url} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // sin prisa: es una página pública
  }

  if (!soloInforme) {
    writeFileSync(SALIDA, JSON.stringify({ fuente: INDICE, generado: new Date().toISOString().slice(0, 10), asignaturas, fallos }, null, 2));
    const conTeoria = asignaturas.filter((a) => a.teoria.length).length;
    console.log(`escrito: ${path.relative(ROOT, SALIDA)} · ${asignaturas.length} asignaturas · con teoría: ${conTeoria} · fallos: ${fallos.length}`);
  }

  // ── Comparación con lo que tenemos de la ETSIIT
  const guias = JSON.parse(readFileSync(path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json"), "utf8")).guias;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  /** Nuestro nombre lleva el código («… (296113T)») y el título, el prefijo. */
  const limpiarTitulo = (t) => String(t || "").replace(/^\s*Guía docente de\s*/i, "").replace(/\s*\(\d+[A-Z0-9]*\)\s*$/, "").trim();
  const porTitulo = new Map(guias.map((g) => [norm(limpiarTitulo(g.nombre || g.titulo)), g]));
  const gruposDe = (lista) => [...new Set(lista.flatMap((e) => e.grupos))].sort();
  const gente = (lista) => [...new Set(lista.map((e) => norm(e.nombre)))].sort();

  const filas = [];
  const sinPareja = [];
  asignaturas.forEach((a) => {
    const guia = porTitulo.get(norm(limpiarTitulo(a.titulo)));
    if (!guia) {
      sinPareja.push(a);
      return;
    }
    const problemas = [];
    const teoriaUgr = gente(a.teoria);
    const teoriaEtsiit = gente(guia.teorico || []);
    if (JSON.stringify(teoriaUgr) !== JSON.stringify(teoriaEtsiit)) {
      problemas.push(`teoría: UGR [${teoriaUgr.join(", ") || "nadie"}] vs ETSIIT [${teoriaEtsiit.join(", ") || "nadie"}]`);
    }
    const practUgr = gente(a.practicas);
    const practEtsiit = gente(guia.practico || []);
    if (JSON.stringify(practUgr) !== JSON.stringify(practEtsiit)) {
      problemas.push(`prácticas: UGR [${practUgr.join(", ") || "nadie"}] vs ETSIIT [${practEtsiit.join(", ") || "nadie"}]`);
    }
    // Letras de teoría y número de prácticas, por separado: el horario de la UGR
    // dice qué grupos existen de verdad (los números son prácticas y las letras,
    // teoría) y la guía dice cuántos y cuáles.
    const letras = (lista) => [...new Set(lista.filter((g) => !/^\d+$/.test(g)))].sort();
    const numeros = (lista) => [...new Set(lista.filter((g) => /^\d+$/.test(g)))].sort((x, y) => Number(x) - Number(y));
    const letrasUgr = letras(a.gruposHorario);
    const letrasGuia = letras((guia.teorico || []).flatMap((e) => e.grupos));
    if (letrasUgr.length && JSON.stringify(letrasUgr) !== JSON.stringify(letrasGuia)) {
      problemas.push(`letras de teoría: UGR [${letrasUgr.join(", ")}] vs ETSIIT [${letrasGuia.join(", ") || "ninguna"}]`);
    }
    const numUgr = numeros(a.gruposHorario).length || numeros(a.practicas.flatMap((e) => e.grupos)).length;
    const numGuia = numeros((guia.practico || []).flatMap((e) => e.grupos)).length;
    if (numUgr && numUgr !== numGuia) {
      problemas.push(`subgrupos de prácticas: UGR ${numUgr} vs ETSIIT ${numGuia}`);
    }
    if (problemas.length) filas.push({ nombre: a.titulo, problemas });
  });

  let md = `# Discrepancias UGR ↔ ETSIIT\n\n`;
  md += `Comparación de las páginas de la UGR (${asignaturas.length} asignaturas, volcadas el ${new Date().toISOString().slice(0, 10)}) con las guías de la ETSIIT.\n\n`;
  md += `**${filas.length} asignaturas con diferencias** de ${asignaturas.length}. Marca la última columna con lo que es cierto.\n\n`;
  md += `| # | Asignatura | Diferencia | ¿Cuál es cierto? |\n|---|---|---|---|\n`;
  filas.forEach((f, i) => {
    md += `| ${i + 1} | ${f.nombre} | ${f.problemas.join(" · ")} | |\n`;
  });
  md += `\n## En la UGR pero no emparejadas con una guía nuestra (${sinPareja.length})\n\n`;
  md += `| # | Asignatura | Curso | Tipo |\n|---|---|---|---|\n`;
  sinPareja.forEach((a, i) => {
    md += `| ${i + 1} | ${a.titulo} | ${a.curso} | ${a.tipo} |\n`;
  });
  if (fallos.length) {
    md += `\n## Páginas que fallaron (${fallos.length})\n\n`;
    fallos.forEach((f) => { md += `- ${f}\n`; });
  }
  writeFileSync(INFORME, md);
  console.log(`escrito: ${path.relative(ROOT, INFORME)} · ${filas.length} asignaturas con diferencias · ${sinPareja.length} sin emparejar`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
