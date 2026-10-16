/**
 * Asignaciones de grupo que la ETSIIT publica en sus guías docentes.
 *
 * Cada guía trae una sección «Profesorado» con dos listas: la de teoría, donde
 * cada profesor dice **qué letra de grupo** imparte (`Grupo: A`, `Grupos: B y F`),
 * y la de prácticas, donde dice **qué número de grupo de prácticas** lleva
 * (`Grupos: 1, 3`). Es el único sitio público donde está esa asignación: los
 * horarios dan las horas y el aula, pero no quién da cada grupo.
 *
 * El número de grupo de prácticas y la etiqueta del horario son lo mismo visto
 * de dos maneras: la numeración recorre los subgrupos **en orden**, así que el
 * grupo `1` es el primero de la lista y así hasta el último. Esa lista no se
 * deduce: la publican los horarios de la ETSIIT, que dibujan cada subgrupo en su
 * franja (`FS (A1)`), y la lee `horarios.js`. El reparto por letra no es
 * uniforme —`IG` tiene A y B con tres subgrupos y C, D y E con dos— y por eso no
 * hay ninguna regla que lo reconstruya: los dos documentos coinciden en el total
 * de grupos de cada asignatura, y el número de la guía es la posición en la
 * lista del horario.
 *
 * Las dos funciones que tocan red o disco viven en `scrape-guias.mjs`; aquí solo
 * hay transformación pura, para poder probarla sin salir a internet.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const pathJoin = path.join;

/**
 * Quita el punto final que la guía añade tras el nombre y colapsa los espacios:
 * «María del Mar Abad Grau.» y «María del Mar Abad Grau» son la misma persona.
 *
 * @param {string} nombre nombre tal cual aparece en la guía.
 * @returns {string} nombre normalizado.
 */
export function normalizePersonName(nombre) {
  return String(nombre || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .trim();
}

/**
 * Clave con la que se cruzan los nombres de asignatura de la guía y del
 * catálogo: sin acentos, sin paréntesis (la guía añade la especialidad de las
 * optativas) y sin puntuación.
 *
 * @param {string} texto nombre de asignatura.
 * @returns {string} clave de comparación.
 */
export function subjectMatchKey(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Parte la lista de grupos de una línea de la guía: `"A y B"`, `"1, 3"`,
 * `"12, 4 y 6"`.
 *
 * @param {string} texto lista tal cual.
 * @returns {string[]} grupos, sin repetir y en orden de aparición.
 */
function splitGrupos(texto) {
  const out = [];
  for (const parte of String(texto || "").split(/\s*,\s*|\s+y\s+/)) {
    const valor = parte.trim();
    if (valor && !out.includes(valor)) out.push(valor);
  }
  return out;
}

/**
 * Saca de la sección «Profesorado» las dos listas de la guía. El bloque termina
 * donde empieza «Tutorías», que es la sección siguiente.
 *
 * @param {string} bloque HTML de la sección de profesorado.
 * @returns {{teorico: Array, practico: Array}}
 */
function parseProfesorado(bloque) {
  const out = { teorico: [], practico: [] };
  const titulos = [...bloque.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/g)];
  for (const titulo of titulos) {
    const modalidad = titulo[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
    const bucket = modalidad.startsWith("te") ? out.teorico : out.practico;
    for (const li of titulo[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const texto = li[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (!texto) continue;
      const grupos = texto.match(/Grupos?:\s*(.+)$/);
      const nombre = normalizePersonName(texto.replace(/Grupos?:.*$/, ""));
      if (!nombre) continue;
      bucket.push({ nombre, grupos: grupos ? splitGrupos(grupos[1]) : [] });
    }
  }
  return out;
}

/**
 * Valor de uno de los campos de cabecera de la guía (`Curso`, `Semestre`,
 * `Créditos`, `Tipo`), que van como encabezado seguido de su valor.
 *
 * @param {string} html HTML de la guía.
 * @param {string} campo nombre del campo.
 * @returns {string} valor, o cadena vacía si no está.
 */
function campoDeGuia(html, campo) {
  const marca = `>${campo}</h2>`;
  const desde = html.indexOf(marca);
  if (desde === -1) return "";
  const texto = html
    .slice(desde + marca.length, desde + marca.length + 200)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texto.split(" ")[0] || "";
}

/**
 * Lee una guía docente y devuelve lo que interesa de ella: el nombre de la
 * asignatura, el curso al que pertenece la guía, sus créditos y el profesorado
 * con sus grupos.
 *
 * @param {string} html HTML de la guía.
 * @returns {{titulo: string, nombre: string, curso: string, creditos: number,
 *   semestre: number, teorico: Array, practico: Array}}
 */
export function parseGuia(html) {
  const page = String(html || "");
  const h1 = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const titulo = h1
    ? h1[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
  const curso = page.match(/Curso\s*(20\d\d\s*\/\s*20\d\d)/);
  const seccion = page.match(/<h2[^>]*>\s*Profesorado\s*<\/h2>([\s\S]*?)(<h2[^>]*>\s*Tutor|$)/);
  const profesorado = seccion ? parseProfesorado(seccion[1]) : { teorico: [], practico: [] };
  return {
    titulo,
    // La guía titula «Guía docente de X (2961123)»: para cruzar con el catálogo
    // sobra el prefijo y sobra el código del plan, que no es el de la app.
    nombre: titulo.replace(/^Gu[ií]a docente de\s*/i, "").trim(),
    curso: curso ? curso[1].replace(/\s+/g, "") : "",
    creditos: Number(campoDeGuia(page, "Créditos")) || 0,
    semestre: Number(campoDeGuia(page, "Semestre")) || 0,
    ...profesorado,
  };
}

/** ¿La asignatura del catálogo tiene ese grupo de teoría? */
function tieneGrupo(subject, letra) {
  return (subject.grupos || []).some((g) => g.letra === letra);
}

/** ¿La asignatura del catálogo tiene ese subgrupo de prácticas? */
function tieneSubgrupo(subject, etiqueta) {
  return (subject.grupos || []).some((g) =>
    (g.practicas?.subgrupos || []).includes(etiqueta),
  );
}

/**
 * Cruza las guías con el catálogo y devuelve las asignaciones en la forma
 * canónica de `DOCENTES`: una por (asignatura, letra de grupo o subgrupo).
 *
 * Solo se emite lo que el catálogo puede colocar: si la guía numera más grupos
 * de prácticas de los que el horario tiene subgrupos, los que sobran se cuentan
 * en `sinEtiqueta` en vez de inventar un destino. Lo mismo con las letras de
 * teoría que el horario no tiene.
 *
 * @param {{guias: Array, subjects: Array, subgrupos: Object}} entrada guías
 *   leídas, asignaturas del catálogo con horario (`SUBJECTS` de `data.js`) y los
 *   subgrupos de cada asignatura en orden, con sus franjas
 *   (`horarios-subgrupos.json`).
 * @returns {{asignaciones: Array, sinGuia: string[], conflictos: string[], sinEtiqueta: string[]}}
 */
/**
 * Correcciones puntuales de nombres de profesor.
 *
 * Las dos fuentes del dato —las **guías** de la ETSIIT (de donde salen las
 * asignaciones) y el **volcado de la hoja** (de donde salen los perfiles)—
 * escriben a veces el mismo nombre de forma distinta, y como la clave de un
 * perfil es `(asignatura, modalidad, nombre)`, con una tilde de diferencia el
 * perfil no se encuentra y ese grupo se queda sin dificultad, sin ficha y sin
 * comentarios.
 *
 * Esto es una **corrección de datos, de una vez**: la lista es corta, son casos
 * vistos uno a uno y no hay más. No es un normalizador ni un «fuzzy match»: no
 * merece la pena montar eso para un puñado de erratas que ya están aquí
 * escritas (el porqué, en `planes/TECH-DEBT.md`).
 *
 * La tabla se aplica en los dos lados (asignaciones y perfiles) y es idempotente:
 * el nombre canónico no se corrige a sí mismo.
 */
const CORRECCIONES_NOMBRES = {
  // La guía escribe el apellido con jota; la hoja, con g (lo correcto).
  "Miguel Gea Mejías": "Miguel Gea Megías",
  // La guía pone el nombre de pila completo; la hoja, el de siempre.
  "Rosa Ana Montes Soldado": "Rosana Montes Soldado",
  // El apellido «de la» va en minúscula (lo trae bien la hoja).
  "José Luis Padilla De la Torre": "José Luis Padilla de la Torre",
  // Tildes que la hoja perdió (la guía las trae bien).
  "Jose Luis Garrido Bullejos": "José Luis Garrido Bullejos",
  "Luis Lopez Escudero": "Luis López Escudero",
  "María José Rodriguez Fortiz": "María José Rodríguez Fortiz",
  "Antonio Javier Fernandez Ares": "Antonio Javier Fernández Ares",
  // Un asterisco de la hoja pegado al apellido.
  "José Antonio Jiménez Madrid*": "José Antonio Jiménez Madrid",
};

/** Aplica la tabla de correcciones (idempotente). */
export function corregirNombre(nombre) {
  const limpio = String(nombre || "").trim();
  return CORRECCIONES_NOMBRES[limpio] || limpio;
}

const UGR_ASIGNATURAS = pathJoin(ROOT, "tools/ugr-pipeline/ugr-asignaturas.json");

/** Nuestro `nombre` lleva el código («… (296113T)») y la UGR no. */
const sinCodigo = (t) => String(t || "").replace(/^\s*Guía docente de\s*/i, "").replace(/\s*\(\d+[A-Z0-9]*\)\s*$/, "").trim().toLowerCase();

/**
 * Relleno del profesorado con las páginas de la **UGR** (`ugr-asignaturas.json`).
 *
 * Decisión del autor (2026-10-16): **donde la UGR contradice a la ETSIIT, manda la
 * ETSIIT**; la UGR solo **rellena** lo que la guía de la ETSIIT no publica (las
 * asignaturas de mención salen sin profesorado en sus guías). Por eso se rellena
 * **solo lo que falta** —teoría o prácticas por separado— y **nunca** se pisa un
 * dato que ya esté: un conflicto de verdad se queda con lo de la ETSIIT. El cotejo
 * de las 96 asignaturas, fila a fila y ya resuelto, está en `planes/discrepancias-ugr.md`.
 */
function rellenoDeLaUGR() {
  if (!existsSync(UGR_ASIGNATURAS)) return new Map();
  const volcado = JSON.parse(readFileSync(UGR_ASIGNATURAS, "utf8"));
  const porTitulo = new Map();
  (volcado.asignaturas || []).forEach((a) => {
    porTitulo.set(sinCodigo(a.titulo), {
      teorico: (a.teoria || []).map((e) => ({ nombre: e.nombre, grupos: e.grupos })),
      practico: (a.practicas || []).map((e) => ({ nombre: e.nombre, grupos: e.grupos })),
    });
  });
  return porTitulo;
}

/** Las guías, con el profesorado que la UGR publica y la ETSIIT no. */
export function guiasConRelleno(guias) {
  const relleno = rellenoDeLaUGR();
  return (Array.isArray(guias) ? guias : []).map((guia) => {
    const u = relleno.get(sinCodigo(guia.nombre || guia.titulo));
    if (!u) return guia;
    const teorico = (guia.teorico || []).length ? guia.teorico : u.teorico;
    const practico = (guia.practico || []).length ? guia.practico : u.practico;
    return { ...guia, teorico, practico };
  });
}

export function buildAsignaciones({ guias, subjects, subgrupos }) {
  const porNombre = new Map();
  for (const guia of guiasConRelleno(guias)) {
    const clave = subjectMatchKey(guia.nombre || guia.titulo);
    if (clave && !porNombre.has(clave)) porNombre.set(clave, guia);
  }

  const asignaciones = [];
  const sinGuia = [];
  const conflictos = [];
  const sinEtiqueta = [];

  for (const subject of Array.isArray(subjects) ? subjects : []) {
    const guia = porNombre.get(subjectMatchKey(subject.nombre));
    if (!guia) {
      sinGuia.push(subject.codigo);
      continue;
    }

    const etiquetas = Object.keys(subgrupos?.[subject.codigo] || {});

    // Un destino, un profesor: la guía a veces lista al mismo grupo con dos
    // nombres (docencia compartida) y el modelo solo admite uno por clave, así
    // que se queda el primero y el otro se informa en vez de perderse en
    // silencio.
    const puestos = new Map();
    const pon = (destino, modalidad, nombreCrudo) => {
      // Se normaliza aquí también, y no solo al parsear: el volcado guardado es
      // el del último scrapeo, y así un cambio en el parser no deja nombres con
      // el punto final pegado en los datos ya guardados.
      const nombre = corregirNombre(normalizePersonName(nombreCrudo));
      if (!nombre) return;
      const key = `${subject.codigo}-${destino}`;
      const previo = puestos.get(key);
      if (previo !== undefined) {
        if (previo !== nombre) conflictos.push(`${key}: ${previo} / ${nombre}`);
        return;
      }
      puestos.set(key, nombre);
      asignaciones.push({ key, name: nombre, subjectCode: subject.codigo, groupLetter: destino, modalidad });
    };

    for (const entrada of guia.teorico || []) {
      for (const letra of entrada.grupos || []) {
        if (tieneGrupo(subject, letra)) pon(letra, "Teoría", entrada.nombre);
      }
    }
    for (const entrada of guia.practico || []) {
      for (const numero of entrada.grupos || []) {
        const etiqueta = etiquetas[Number(numero) - 1];
        // Lo que no tiene destino se informa en vez de colocarlo donde no toca;
        // sin repetir, que un grupo con dos nombres lo diría dos veces.
        const sinDestino = !etiqueta
          ? `${subject.codigo}-nº${numero}`
          : !tieneSubgrupo(subject, etiqueta)
            ? `${subject.codigo}-${etiqueta}`
            : "";
        if (sinDestino) {
          if (!sinEtiqueta.includes(sinDestino)) sinEtiqueta.push(sinDestino);
          continue;
        }
        pon(etiqueta, "Prácticas", entrada.nombre);
      }
    }
  }

  return { asignaciones, sinGuia, conflictos, sinEtiqueta };
}
