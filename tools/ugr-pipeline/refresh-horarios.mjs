/**
 * Reconstruye el horario de `data.js` con los horarios de la ETSIIT.
 *
 * `data.js` es el horario que resuelve la app, y venía de una tanda anterior:
 * sus bloques de prácticas estaban a medias, la teoría se había quedado vieja en
 * algún grupo y las **optativas de cuarto** (que el horario sí publica) no
 * estaban. Aquí se reescribe con lo que dice `horarios-grupos.json`, que sale
 * del PDF oficial del curso:
 *
 *   - las asignaturas que ya están: se repasan **teoría y prácticas** grupo a
 *     grupo, y se quitan los subgrupos que el horario no lista;
 *   - las del plan que el horario publica: se **incorporan** con sus grupos, su
 *     teoría y sus prácticas, con el curso, el cuatrimestre, el carácter, la
 *     mención y los créditos que ya se saben de ellas;
 *   - las que el horario no publica (el TFG, las prácticas de empresa y alguna
 *     optativa sin grupos): se dejan intactas y se informan.
 *
 * Lo que no se toca: el nombre, el curso, el cuatrimestre, los créditos y el
 * turno de los grupos que ya existían.
 *
 * Uso: `node tools/ugr-pipeline/refresh-horarios.mjs`
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { subjectMatchKey } from "./guias.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const GRUPOS_PATH = path.join(ROOT, "tools/ugr-pipeline/horarios-grupos.json");
const GUIAS_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const PLAN_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const DECLARACION = "const SUBJECTS = ";
const HORA_TARDE = 15 * 60;

/** Franjas en forma canónica, para comparar sin que importe el orden. */
function franjasCanonicas(sesiones) {
  return (Array.isArray(sesiones) ? sesiones : [])
    .map((s) => `${s.dia} ${s.inicio} ${s.fin}`)
    .sort();
}

function minutos(hora) {
  const [h, m] = String(hora).split(":");
  return Number(h) * 60 + Number(m);
}

/** Turno de un grupo: de tarde si la mayoría de sus franjas caen por la tarde. */
function turnoDe(grupo) {
  const franjas = [...grupo.teoria, ...Object.values(grupo.practicas).flat()];
  if (!franjas.length) return "mañana";
  const tardes = franjas.filter((f) => minutos(f.inicio) >= HORA_TARDE).length;
  return tardes * 2 > franjas.length ? "tarde" : "mañana";
}

/** Los grupos de una asignatura tal como los publica el horario. */
function gruposDeHorario(porLetra, anteriores = []) {
  return Object.keys(porLetra)
    .sort()
    .map((letra) => {
      const delHorario = porLetra[letra];
      const previo = anteriores.find((g) => g.letra === letra);
      const etiquetas = Object.keys(delHorario.practicas).sort(
        (a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)),
      );
      const practicas = { subgrupos: etiquetas };
      for (const etiqueta of etiquetas) {
        practicas[etiqueta] = delHorario.practicas[etiqueta].map((s) => ({
          dia: s.dia,
          inicio: s.inicio,
          fin: s.fin,
        }));
      }
      return {
        letra,
        turno: previo?.turno || turnoDe(delHorario),
        teoria: delHorario.teoria.map((s) => ({ dia: s.dia, inicio: s.inicio, fin: s.fin })),
        practicas,
      };
    });
}

/** Créditos de cada asignatura según su guía, por nombre. */
function creditosPorNombre(guias) {
  const out = new Map();
  for (const guia of guias || []) {
    const clave = subjectMatchKey(guia.nombre || guia.titulo);
    if (clave && guia.creditos) out.set(clave, guia.creditos);
  }
  return out;
}

/**
 * Devuelve las asignaturas de `data.js` con el horario oficial: repasa las que
 * están e incorpora las del plan que el horario publica.
 *
 * @param {{subjects: Array, grupos: Object, plan: Array, guias: Array}} entrada
 *   asignaturas actuales, grupos por asignatura (`horarios-grupos.json`), filas
 *   del plan de las asignaturas candidatas y guías (para los créditos).
 * @returns {{subjects: Array, cambios: Object}}
 */
export function conHorarioOficial({ subjects, grupos, plan = [], guias = [] }) {
  const cambios = {
    teoria: [],
    practicas: [],
    subgruposAnadidos: [],
    subgruposQuitados: [],
    anadidas: [],
    codigosRepetidos: [],
    sinHorario: [],
  };
  const creditos = creditosPorNombre(guias);
  const yaEstan = new Set(subjects.map((s) => s.codigo));

  const repasadas = subjects.map((subject) => {
    const delHorario = grupos[subject.codigo];
    if (!delHorario) {
      cambios.sinHorario.push(subject.codigo);
      return subject;
    }

    const anteriores = subject.grupos || [];
    const siguientes = gruposDeHorario(delHorario, anteriores);
    for (const grupo of siguientes) {
      const previo = anteriores.find((g) => g.letra === grupo.letra);
      if (!previo) continue;
      if (franjasCanonicas(previo.teoria).join("|") !== franjasCanonicas(grupo.teoria).join("|")) {
        cambios.teoria.push(`${subject.codigo}-${grupo.letra}`);
      }
      const antes = previo.practicas?.subgrupos || [];
      const ahora = grupo.practicas.subgrupos;
      for (const etiqueta of ahora) {
        if (!antes.includes(etiqueta)) cambios.subgruposAnadidos.push(`${subject.codigo}-${etiqueta}`);
        else if (
          franjasCanonicas(previo.practicas?.[etiqueta]).join("|") !==
          franjasCanonicas(grupo.practicas[etiqueta]).join("|")
        ) {
          cambios.practicas.push(`${subject.codigo}-${etiqueta}`);
        }
      }
      for (const etiqueta of antes) {
        if (!ahora.includes(etiqueta)) cambios.subgruposQuitados.push(`${subject.codigo}-${etiqueta}`);
      }
    }
    return { ...subject, grupos: siguientes };
  });

  const nuevas = [];
  const vistos = new Set();
  for (const fila of plan) {
    if (!fila || !fila.codigo) continue;
    // El plan trae dos asignaturas distintas con el mismo código (`RI` es
    // Recuperación de Información y Robótica Industrial): el horario no las
    // distingue, así que entra la primera y la otra se queda en el plan.
    if (yaEstan.has(fila.codigo) || vistos.has(fila.codigo)) {
      if (vistos.has(fila.codigo)) cambios.codigosRepetidos.push(fila.codigo);
      continue;
    }
    vistos.add(fila.codigo);
    const delHorario = grupos[fila.codigo];
    if (!delHorario) continue;
    const clave = subjectMatchKey(fila.nombre);
    nuevas.push({
      codigo: fila.codigo,
      nombre: fila.nombre,
      curso: Number(fila.curso) || 0,
      cuatrimestre: Number(fila.cuatrimestre) || 0,
      creditos: creditos.get(clave) || 6,
      grupos: gruposDeHorario(delHorario),
    });
    cambios.anadidas.push(fila.codigo);
  }

  return { subjects: [...repasadas, ...nuevas], cambios };
}

/** El bloque `const SUBJECTS = [...]` de `data.js`, troceado. */
function leerData(source) {
  const inicio = source.indexOf(DECLARACION) + DECLARACION.length;
  const fin = source.lastIndexOf("]") + 1;
  if (inicio < DECLARACION.length || fin <= inicio) {
    throw new Error("data.js no tiene el bloque de SUBJECTS con la forma esperada");
  }
  return {
    cabecera: source.slice(0, inicio),
    subjects: JSON.parse(source.slice(inicio, fin)),
    cola: source.slice(fin),
  };
}

function main() {
  const { asignaturas } = JSON.parse(readFileSync(GRUPOS_PATH, "utf8"));
  const { guias } = JSON.parse(readFileSync(GUIAS_PATH, "utf8"));
  const fixture = JSON.parse(readFileSync(PLAN_PATH, "utf8"));
  const source = readFileSync(DATA_PATH, "utf8");
  const { cabecera, subjects, cola } = leerData(source);

  const { subjects: actualizadas, cambios } = conHorarioOficial({
    subjects,
    grupos: asignaturas,
    plan: fixture.extraSubjects || [],
    guias,
  });
  writeFileSync(DATA_PATH, `${cabecera}${JSON.stringify(actualizadas, null, 2)}${cola}`, "utf8");

  const lista = (nombre, valores) =>
    `${nombre}: ${valores.length}${valores.length ? ` (${valores.join(", ")})` : ""}`;
  process.stdout.write(
    [
      lista("teoría repasada", cambios.teoria),
      lista("prácticas corregidas", cambios.practicas),
      lista("subgrupos añadidos", cambios.subgruposAnadidos),
      lista("subgrupos quitados", cambios.subgruposQuitados),
      lista("asignaturas incorporadas", cambios.anadidas),
      lista("códigos repetidos en el plan (se queda el primero)", cambios.codigosRepetidos),
      lista("sin horario publicado (intactas)", cambios.sinHorario),
      `escrito: ${path.relative(ROOT, DATA_PATH)}`,
      "",
    ].join("\n"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}
