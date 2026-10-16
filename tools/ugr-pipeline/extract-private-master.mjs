/**
 * Extracción del maestro privado de `/ugr` desde el volcado de la hoja.
 *
 * La verdad de los datos es `public/ugr/datasets/docentes_excel.json` —el
 * volcado de la hoja pública de la ETSIIT, 426 filas con la identidad
 * (asignatura, modalidad, profesor)—. A partir de él este script escribe en
 * `privado/` (ignorado por git) el catálogo maestro que luego cifra
 * `build-package.mjs`:
 *
 *   - `privado/catalogo.json` — el catálogo completo: las 42 asignaturas con
 *     horario (de `data.js`) enriquecidas con `caracter`, `mencion`, dificultad y
 *     descripción por modalidad; los perfiles de profesor del volcado; las 5
 *     menciones; los tutores de TFG y los másteres; y las asignaturas del plan
 *     que la app no planifica.
 *   - `privado/descartados.json` — los comentarios que la propia hoja descarta
 *     (no entran al catálogo, pero no se pierden).
 *
 * Reglas que respeta y conviene no romper:
 *   - **El `autor` de cada comentario no se copia**: lo descarta
 *     `normalizeComentarios` (`src/solver/catalog.js`), que es el único punto
 *     por el que los comentarios entran al modelo.
 *   - **Las asignaciones no salen del volcado**: la hoja dice qué profesor da
 *     cada (asignatura, modalidad), pero no las letras de grupo. Quién da cada
 *     letra y cada subgrupo lo publican las guías docentes de la ETSIIT
 *     (`guias-docentes.json`, cruzado con los subgrupos de los horarios en
 *     `horarios-grupos.json`), así que el maestro las recibe de
 *     `buildAsignaciones`, las mismas que siembra la muestra.
 *   - El sufijo `" (optativa)"` de `asignatura` **no** es decorativo ni
 *     sistemático: la hoja lo usa en unas optativas y no en otras, y es lo
 *     único que distingue las dos asignaturas que comparten código (`RI` =
 *     Recuperación de Información y Robótica Industrial). Al código se le quita
 *     el sufijo para cruzarlo con el plan, y la etiqueta cruda se conserva tal
 *     cual en cada perfil de profesor.
 *   - Estas etiquetas de dificultad no se inventan: si aparece una que
 *     `difficultyFromLabel` no conoce, la extracción falla en voz alta en vez de
 *     escribir un `null` silencioso.
 *
 * La transformación pura vive en `buildMaster` para poder probarla sin tocar
 * disco; el arranque (leer, validar y escribir) solo ocurre al ejecutar el
 * fichero.
 *
 * Uso: `node tools/ugr-pipeline/extract-private-master.mjs`
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

import {
  attachDocents,
  attachPlan,
  difficultyFromLabel,
  fromLegacySubjects,
  normalizeProfesor,
  profesorKey,
  validateCatalog,
} from "../../public/ugr/src/solver/catalog.js";
import { validateCatalogJSON } from "../../public/ugr/src/ingest/schema.js";
import { buildAsignaciones, corregirNombre, subjectMatchKey } from "./guias.js";
import { practicasPorAsignatura } from "./horarios.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Asignaturas del plan que el índice del volcado no trae (sus datos, de la guía). */
const PLAN_FUERA_DEL_INDICE = [
  {
    codigo: "PFG",
    nombre: "Proyecto Fin de Grado",
    curso: 4,
    cuatrimestre: 2,
    creditos: 12,
    caracter: "Trabajo Fin de Grado",
    mencion: "Común",
  },
  {
    codigo: "PE",
    nombre: "Prácticas de Empresa",
    curso: 4,
    cuatrimestre: 2,
    creditos: 12,
    caracter: "Optativa",
    mencion: "Común",
  },
];
const PRIVATE_DIR = path.join(ROOT, "privado");
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const DUMP_PATH = path.join(ROOT, "public/ugr/datasets/docentes_excel.json");
const GUIAS_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const GRUPOS_PATH = path.join(ROOT, "tools/ugr-pipeline/horarios-grupos.json");
const CATALOG_PATH = path.join(PRIVATE_DIR, "catalogo.json");
const DISCARDED_PATH = path.join(PRIVATE_DIR, "descartados.json");

/**
 * Lee un global declarado con `const` en un script clásico (`data.js`): no son
 * propiedades de `window`, así que se evalúan en un contexto de `vm` y se
 * recoge el valor por su nombre.
 *
 * @param {string} filePath ruta absoluta del script clásico.
 * @param {string} name nombre del global a recoger.
 * @returns {Array} el array declarado, o falla si no lo es.
 */
function loadLegacyGlobal(filePath, name) {
  const source = readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__VALUE__ = ${name};`, sandbox, {
    filename: filePath,
  });
  const value = sandbox.__VALUE__;
  if (!Array.isArray(value)) {
    throw new Error(`${name} de ${filePath} no es un array`);
  }
  return value;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** `"CII (optativa)"` → `"CII"`, el código con el que se cruza con el plan. */
function subjectCodeOf(asignatura) {
  return String(asignatura).replace(/\s*\(optativa\)$/, "").trim();
}

const MODALIDADES = ["Teoría", "Prácticas"];
const MODALITY_KEYS = { "Teoría": "teoria", "Prácticas": "practicas" };

/**
 * Convierte el volcado en el catálogo maestro (transformación pura: ni lee ni
 * escribe ficheros, y no toca el volcado).
 *
 * @param {Object} dump volcado (`docentes`, `indiceAsignaturas`, `menciones`…).
 * @param {Array} legacySubjects asignaturas con horario de `data.js`.
 * @returns {{catalog: Object, stats: Object}} catálogo y cifras del proceso.
 */
/**
 * Cómo se han obtenido los datos, línea a línea. Viaja dentro del maestro y, con
 * él, **dentro del paquete cifrado**: quien lo abra con la contraseña ve de dónde
 * sale cada cosa.
 */
const PROCEDENCIA = [
  "Fuente 1 · Guías docentes de la ETSIIT: `scrape-guias.mjs` sobre https://etsiit.ugr.es/informacion-academica/grados/graduadoa-ingenieria-informatica → `tools/ugr-pipeline/guias-docentes.json`. Da el profesorado por asignatura: teoría por LETRA de grupo («Grupo: A») y prácticas por NÚMERO de grupo («Grupos: 1, 3»).",
  "Fuente 2 · Horarios de la ETSIIT: `scrape-horarios.mjs` sobre https://etsiit.ugr.es/docencia/grados/horarios (PDF «Horarios GII») → `horarios-grupos.json`. Da QUÉ subgrupos de prácticas existen y en qué franja; el número de la guía es la POSICIÓN en esa lista.",
  "Fuente 3 · Páginas de asignatura de la UGR: `scrape-ugr-asignaturas.mjs` sobre https://www.ugr.es/estudiantes/grados/grado-ingenieria-informatica y sus 96 páginas → `ugr-asignaturas.json`. Da la ficha (curso, semestre, tipo, departamento), el profesorado (teoría por letra, prácticas por número) y los grupos que declara su horario.",
  "Autoridad entre las fuentes 1 y 3 (decisión del autor, 2026-10-16): donde la UGR CONTRADICE a la ETSIIT, manda la ETSIIT. La UGR solo RELLENA lo que la guía de la ETSIIT no publica (las asignaturas de mención salen sin profesorado en sus guías). El relleno se aplica solo donde FALTA —teoría o prácticas por separado— y nunca pisa lo que ya hay; el cotejo de las 96 asignaturas, con lo que manda en cada diferencia, está en `planes/discrepancias-ugr.md`.",
  "Fuente 4 · Volcado de la hoja de cálculo del autor: `public/ugr/datasets/docentes_excel.json` (426 filas) → `extract-private-master.mjs` → este catálogo. Da los PERFILES: dificultad por modalidad, opiniones y comentarios. El autor de cada comentario no se copia (`normalizeComentarios`): entran sin atribución.",
  "Muestra pública: `tools/ugr-pipeline/sample-docents.json` (perfiles del autor) + las guías y los horarios → `emit-seed.mjs` → `public/ugr/docentes.js` y `datasets/ugr/gi/2026-1.json`. Es lo que sirve la app sin contraseña.",
  "Paquete cifrado: `build-package.mjs` cifra este catálogo (AES-GCM con PBKDF2 de 600 000 iteraciones) → `public/ugr/datasets/ugr/gi/package.enc.json`. La contraseña no se guarda en ningún sitio.",
  "Correcciones de nombres aplicadas al cruzar fuentes (tabla en `guias.js`, con su motivo): «Miguel Gea Mejías» → «Miguel Gea Megías» (errata de la guía; «Megías» en la hoja); «Rosa Ana Montes Soldado» → «Rosana Montes Soldado»; «José Luis Padilla De la Torre» → «…de la Torre»; «Jose Luis Garrido Bullejos» → «José…»; «Luis Lopez Escudero» → «…López…»; «María José Rodriguez Fortiz» → «…Rodríguez…»; «Antonio Javier Fernandez Ares» → «…Fernández…» (tildes que la hoja perdió); «José Antonio Jiménez Madrid*» → «…Madrid» (asterisco pegado). La clave de un perfil es (asignatura, modalidad, nombre): sin esto el perfil no se encontraba y el grupo se quedaba sin insignia, sin ficha y sin comentarios.",
  "Huecos conocidos y no corregidos: «Juan Miguel» / «Juan Manuel» Medina Rodríguez (FBD|Prácticas) podría ser otra persona; la auditoría (`privado/auditoria-huecos.mjs` → `privado/huecos-datos.md`) los lista todos con una columna para revisar a mano.",
  "Qué es privado y qué es público: el volcado completo (perfiles con comentarios y opiniones) solo viaja cifrado; la muestra publica las asignaciones reales de las guías, el plan y unos pocos perfiles. El historial de git y los `docentes_excel.*` locales conservan el texto plano antiguo por decisión expresa del autor: no se reescribe la historia.",
];

export function buildMaster(dump, legacySubjects, guias = [], subgrupos = {}) {
  const rows = Array.isArray(dump.docentes) ? dump.docentes : [];
  const catalogCodes = new Set(legacySubjects.map((s) => s.codigo));
  const unknownLabels = new Set();

  /**
   * Color de una etiqueta del volcado, apuntando las que no se conocen para
   * fallar al final en vez de escribir un hueco silencioso.
   */
  function colorOf(label) {
    const color = difficultyFromLabel(label);
    if (color === null && label) unknownLabels.add(String(label));
    return color;
  }

  // ─── Perfiles de profesor: uno por (asignatura, modalidad, nombre) ─────────
  // La clave del volcado es casi única (424 de 426 filas); las 2 repetidas son
  // filas duplicadas de la hoja, así que sus opiniones se funden en el perfil (el
  // modelo admite varias) y se informa de cuántas se fundieron.
  const profesoresByKey = new Map();
  let mergedRows = 0;
  for (const row of rows) {
    const subjectCode = subjectCodeOf(row.asignatura);
    const modalidad = row.tipo;
    // El nombre del volcado pasa por la tabla de correcciones: es lo que hace
    // que su clave case con la asignación de la guía (ver `guias.js`).
    const profesor = corregirNombre(row.profesor);
    const key = profesorKey(subjectCode, modalidad, profesor);
    const existing = profesoresByKey.get(key);
    if (existing) {
      mergedRows += 1;
      if (row.opinion && !existing.opinions.includes(row.opinion)) {
        existing.opinions.push(row.opinion);
      }
      continue;
    }
    profesoresByKey.set(key, {
      subjectCode,
      modalidad,
      asignatura: String(row.asignatura),
      name: profesor,
      dificultad: colorOf(row.dificultadProfesor),
      opinions: row.opinion ? [row.opinion] : [],
      cruzada: row.cruzada === true,
      comentarios: Array.isArray(row.comentarios) ? row.comentarios : [],
    });
  }
  if (unknownLabels.size) {
    throw new Error(`etiquetas de dificultad desconocidas: ${[...unknownLabels].join(", ")}`);
  }
  const profesores = [...profesoresByKey.values()].map(normalizeProfesor).filter(Boolean);
  if (profesores.length !== profesoresByKey.size) {
    throw new Error(
      `se perdieron profesores al normalizar: ${profesoresByKey.size} → ${profesores.length}`,
    );
  }

  // ─── Dificultad y descripción de la asignatura, por modalidad ──────────────
  // La hoja las repite en cada fila, pero son iguales dentro de cada
  // (asignatura, modalidad): se comprobó sobre las 185 parejas del volcado, así
  // que se toma el primer valor y se informa si dos filas de la misma pareja
  // discrepan. Hoy solo discrepan las dos filas duplicadas de CII y la pareja que
  // la hoja llama `RI` (dos asignaturas distintas con el mismo código, que no
  // están en el catálogo con horario y por eso no llegan a las asignaturas).
  const subjectDifficulty = new Map();
  const subjectDescription = new Map();
  const conflicts = [];
  for (const row of rows) {
    const pair = `${subjectCodeOf(row.asignatura)}|${row.tipo}`;
    const difficulty = colorOf(row.dificultadAsignatura);
    const description = row.descripcionAsignatura || "";
    if (difficulty && subjectDifficulty.has(pair) && subjectDifficulty.get(pair) !== difficulty) {
      conflicts.push(`${pair}: dificultad`);
    } else if (difficulty && !subjectDifficulty.has(pair)) {
      subjectDifficulty.set(pair, difficulty);
    }
    if (description && subjectDescription.has(pair) && subjectDescription.get(pair) !== description) {
      conflicts.push(`${pair}: descripción`);
    } else if (description && !subjectDescription.has(pair)) {
      subjectDescription.set(pair, description);
    }
  }

  // ─── Asignaturas con horario, enriquecidas con el plan ─────────────────────
  const indexRows = Array.isArray(dump.indiceAsignaturas) ? dump.indiceAsignaturas : [];
  const indexByCode = new Map();
  for (const entry of indexRows) {
    if (!indexByCode.has(entry.codigo)) indexByCode.set(entry.codigo, []);
    indexByCode.get(entry.codigo).push(entry);
  }

  const enrichedSubjects = legacySubjects.map((subject) => {
    const entry = (indexByCode.get(subject.codigo) || [])[0];
    const out = { ...subject };
    if (entry) {
      out.caracter = String(entry.tipo || "");
      out.mencion = String(entry.mencion || "");
    }
    const teoria = subjectDifficulty.get(`${subject.codigo}|Teoría`);
    const practicas = subjectDifficulty.get(`${subject.codigo}|Prácticas`);
    if (teoria || practicas) {
      // Claves por modalidad tal cual las usa el volcado: `normalizeSubject` las
      // pasa a `teoria`/`practicas` en la forma canónica.
      out.dificultad = {
        ...(teoria ? { "Teoría": teoria } : {}),
        ...(practicas ? { "Prácticas": practicas } : {}),
      };
    }
    const descTeoria = subjectDescription.get(`${subject.codigo}|Teoría`);
    const descPracticas = subjectDescription.get(`${subject.codigo}|Prácticas`);
    if (descTeoria || descPracticas) {
      out.descripcion = {
        ...(descTeoria ? { "Teoría": descTeoria } : {}),
        ...(descPracticas ? { "Prácticas": descPracticas } : {}),
      };
    }
    return out;
  });

  const missingIndex = enrichedSubjects.filter((s) => !indexByCode.has(s.codigo));
  if (missingIndex.length) {
    throw new Error(
      `asignaturas del catálogo sin fila en el plan: ${missingIndex.map((s) => s.codigo).join(", ")}`,
    );
  }

  // ─── El resto del plan ─────────────────────────────────────────────────────
  // El plan trae asignaturas distintas con el mismo código (`RI` es
  // Recuperación de Información y Robótica Industrial): se compara también el
  // nombre, o la segunda desaparecería del catálogo.
  const nombresEnCatalogo = new Map(
    enrichedSubjects.map((s) => [s.codigo, subjectMatchKey(s.nombre)]),
  );
  const creditosDeGuia = new Map(
    (Array.isArray(guias) ? guias : [])
      .filter((g) => g && g.creditos)
      .map((g) => [subjectMatchKey(g.nombre || g.titulo), g.creditos]),
  );
  const extraSubjects = indexRows
    .filter((entry) => {
      if (!catalogCodes.has(entry.codigo)) return true;
      // La comparación de nombres es la misma que usa el cruce con las guías:
      // sin acentos ni puntuación, que el plan y el catálogo no escriben igual.
      return nombresEnCatalogo.get(entry.codigo) !== subjectMatchKey(entry.nombreCompleto);
    })
    .map((entry) => ({
      codigo: entry.codigo,
      nombre: String(entry.nombreCompleto || ""),
      curso: Number(entry.curso),
      cuatrimestre: Number(entry.cuatrimestre),
      creditos: creditosDeGuia.get(subjectMatchKey(entry.nombreCompleto)) || 6,
      caracter: String(entry.tipo || ""),
      mencion: String(entry.mencion || ""),
    }))
    // El índice del volcado no trae el TFG ni las prácticas de empresa, y sin
    // ellos los 240 ECTS del grado no cuadran (12 + 12). Sus datos son de sus
    // guías: 12 créditos cada uno, de cuarto, segundo cuatrimestre.
    .concat(PLAN_FUERA_DEL_INDICE.map((s) => ({ ...s })));

  const staff = (list) =>
    (Array.isArray(list) ? list : []).map((entry) => ({
      nombre: entry.nombre,
      dificultad: colorOf(entry.dificultad),
      opinion: entry.opinion || "",
    }));

  const meta = {
    procedencia: PROCEDENCIA,
    university: "UGR",
    degree: "GI",
    plan: "2022",
    version: "2026-1",
    // Sin hash: la integridad del maestro la da el cifrado (AES-GCM) del
    // paquete, no un hash de contenido que nadie verifica.
    hash: "",
    sources: ["volcado", "guías"],
    // El maestro es el dato real del autor, no la muestra pública del repo.
    sampleDocents: false,
  };

  const catalog = fromLegacySubjects(enrichedSubjects, meta);
  // Las asignaciones son las de las guías docentes, no las del volcado: el
  // maestro y la muestra llevan las mismas (son públicas y sin opiniones).
  attachDocents(
    catalog,
    buildAsignaciones({ guias, subjects: enrichedSubjects, subgrupos }).asignaciones,
  );
  attachPlan(catalog, {
    profesores,
    menciones: dump.menciones,
    tutoresTfg: staff(dump.tutoresTfg),
    masteres: staff(dump.masteres),
    extraSubjects,
  });

  // Invariante: si el volcado tiene filas de una (asignatura, modalidad) del
  // catálogo, la asignatura **ya normalizada** tiene que salir con su dificultad.
  // Se comprueba sobre el catálogo, no sobre el borrador, para que cubra también
  // los cambios de forma (las claves por modalidad, por ejemplo): un desajuste
  // ahí descartaba la dificultad en silencio y la app mostraba un hueco.
  const paresConFilas = new Set(
    rows
      .filter((row) => catalogCodes.has(subjectCodeOf(row.asignatura)))
      .map((row) => `${subjectCodeOf(row.asignatura)}|${row.tipo}`),
  );
  const missingDifficulty = [];
  for (const subject of catalog.subjects) {
    for (const modalidad of MODALIDADES) {
      if (!paresConFilas.has(`${subject.codigo}|${modalidad}`)) continue;
      if (!subject.dificultad?.[MODALITY_KEYS[modalidad]]) {
        missingDifficulty.push(`${subject.codigo}|${modalidad}`);
      }
    }
  }
  if (missingDifficulty.length) {
    throw new Error(
      `asignaturas con filas en el volcado pero sin dificultad en el plan: ${missingDifficulty.join(", ")}`,
    );
  }

  return {
    catalog,
    stats: {
      mergedRows,
      conflicts,
      comentarios: profesores.reduce((n, p) => n + p.comentarios.length, 0),
      opinions: profesores.reduce((n, p) => n + p.opinions.length, 0),
    },
  };
}

async function main() {
  const legacySubjects = loadLegacyGlobal(DATA_PATH, "SUBJECTS");
  const dump = JSON.parse(readFileSync(DUMP_PATH, "utf8"));
  const guiasFixture = JSON.parse(readFileSync(GUIAS_PATH, "utf8"));
  const gruposFixture = JSON.parse(readFileSync(GRUPOS_PATH, "utf8"));
  const { catalog, stats } = buildMaster(
    dump,
    legacySubjects,
    guiasFixture.guias || [],
    practicasPorAsignatura(gruposFixture.asignaturas || {}),
  );

  // Puerta de calidad: si el catálogo no pasa el mismo esquema y las mismas
  // comprobaciones que exige el cliente al descargarlo, no se escribe.
  const schemaCheck = validateCatalogJSON(catalog);
  if (!schemaCheck.ok) {
    throw new Error(`el catálogo no pasa el esquema: ${JSON.stringify(schemaCheck.errors)}`);
  }
  const semanticCheck = validateCatalog(catalog);
  if (!semanticCheck.ok) {
    throw new Error(`el catálogo no es válido: ${semanticCheck.errors.join("; ")}`);
  }

  writeJson(CATALOG_PATH, catalog);
  writeJson(DISCARDED_PATH, dump.comentariosDescartados || []);

  process.stdout.write(
    [
      `asignaturas: ${catalog.subjects.length} (+${catalog.extraSubjects.length} del plan sin horario)`,
      `profesores: ${catalog.profesores.length} (opiniones: ${stats.opinions}, comentarios: ${stats.comentarios})`,
      `menciones: ${catalog.menciones.length}`,
      `tutoresTfg: ${catalog.tutoresTfg.length}, masteres: ${catalog.masteres.length}`,
      `filas fundidas por clave repetida: ${stats.mergedRows}`,
      `discrepancias dentro de la misma (asignatura, modalidad): ${stats.conflicts.length}`,
      `escrito: ${path.relative(ROOT, CATALOG_PATH)}`,
      `escrito: ${path.relative(ROOT, DISCARDED_PATH)}`,
      "",
    ].join("\n"),
  );
}

// Solo si se ejecuta directamente: al importarlo desde un test no se toca disco.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  });
}
