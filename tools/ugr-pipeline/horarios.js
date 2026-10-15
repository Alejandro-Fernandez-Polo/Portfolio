/**
 * Lectura de los horarios de la ETSIIT: qué subgrupos de prácticas tiene cada
 * asignatura.
 *
 * Los PDF de horarios se dibujan letra a letra con fuentes incrustadas, así que
 * el texto hay que reconstruirlo: cada página es el horario de un grupo de
 * teoría y cada celda de prácticas lleva su etiqueta (`FS (A1)`). De ahí sale la
 * lista **ordenada** de subgrupos de cada asignatura, que es lo que dice a qué
 * etiqueta corresponde cada número de grupo de prácticas de la guía docente:
 * `1` es el primero de la lista, `2` el segundo, etc. No hay regla que inventar
 * —el reparto por letra no es uniforme— y los dos documentos coinciden en el
 * total de grupos.
 *
 * La descarga vive en `scrape-horarios.mjs`; aquí está el parseo, para poder
 * probarlo con texto de mentira.
 */

import { inflateSync } from "node:zlib";

/** Índice `número de objeto → bytes del objeto` de un PDF sin streams de objetos. */
export function pdfObjects(buffer) {
  const texto = buffer.toString("latin1");
  const out = new Map();
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  while ((m = re.exec(texto))) {
    const fin = texto.indexOf("endobj", m.index);
    out.set(Number(m[1]), texto.slice(m.index + m[0].length, fin === -1 ? texto.length : fin));
  }
  return out;
}

/** Cuerpo del stream de un objeto, descomprimido si va en Flate. */
function streamOf(body) {
  if (!body) return null;
  const m = /stream\r?\n/.exec(body);
  if (!m) return null;
  const cabecera = body.slice(0, m.index);
  const fin = body.indexOf("endstream", m.index);
  const crudo = Buffer.from(body.slice(m.index + m[0].length, fin), "latin1");
  if (!cabecera.includes("FlateDecode")) return crudo.toString("latin1");
  try {
    return inflateSync(crudo).toString("latin1");
  } catch {
    return null;
  }
}

/**
 * Tabla `código de glifo → carácter` de un CMap ToUnicode.
 *
 * @param {string} cmap stream del CMap.
 * @returns {Map<number, string>}
 */
export function cmapTable(cmap) {
  const tabla = new Map();
  for (const bloque of String(cmap || "").matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const par of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      // El destino viene en UTF-16 big endian: se le da la vuelta para leerlo.
      const destino = Buffer.from(par[2], "hex");
      tabla.set(parseInt(par[1], 16), destino.swap16().toString("utf16le"));
    }
  }
  for (const bloque of String(cmap || "").matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const rango of bloque[1].matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
    )) {
      const desde = parseInt(rango[1], 16);
      const hasta = parseInt(rango[2], 16);
      const base = parseInt(rango[3], 16);
      for (let i = 0; i <= hasta - desde; i++) tabla.set(desde + i, String.fromCharCode(base + i));
    }
  }
  return tabla;
}

/**
 * Ítems de texto de cada página, con su posición: la rejilla del horario se lee
 * de ahí (la x da el día y la y la hora).
 *
 * @param {Buffer} buffer PDF completo.
 * @returns {Array<Array<{x: number, y: number, texto: string}>>} una entrada por página.
 */
export function paginasDeItems(buffer) {
  const objetos = pdfObjects(buffer);

  const tablas = new Map();
  const nombres = new Map();
  for (const [num, body] of objetos) {
    const ref = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(body);
    if (ref) {
      const tabla = cmapTable(streamOf(objetos.get(Number(ref[1]))));
      if (tabla.size) tablas.set(num, tabla);
    }
    for (const par of body.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const refs = nombres.get(par[1]) || new Set();
      refs.add(Number(par[2]));
      nombres.set(par[1], refs);
    }
  }

  const fuenteDe = (nombre) => {
    const refs = nombres.get(nombre);
    return refs && refs.size === 1 ? [...refs][0] : null;
  };

  const paginas = [];
  for (const [, body] of objetos) {
    if (!/\/Type\s*\/Page\b/.test(body)) continue;
    const ref = /\/Contents\s+(\d+)\s+0\s+R/.exec(body);
    const stream = ref ? streamOf(objetos.get(Number(ref[1]))) : streamOf(body);
    if (!stream) {
      paginas.push("");
      continue;
    }
    let fuente = null;
    let x = 0;
    let y = 0;
    const items = [];
    const re =
      /\/(F\d+)\s+[\d.]+\s+Tf|([\d.-]+)\s+([\d.-]+)\s+Td|\[([^\]]*)\]\s*TJ|(\((?:\\.|[^()\\])*\)|<[0-9A-Fa-f\s]*>)\s*Tj/g;
    let m;
    while ((m = re.exec(stream))) {
      if (m[1]) {
        fuente = fuenteDe(m[1]);
      } else if (m[2] !== undefined) {
        x = Number(m[2]);
        y = Number(m[3]);
      } else if (m[4] !== undefined) {
        // Una tirada de texto (`[(ED) -3 (PDOO)] TJ`) es un ítem, no uno por
        // trozo: así una celda con un código suelto se lee de un tirón.
        let texto = "";
        for (const hex of m[4].matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
          texto += decodeHex(hex[1], fuente, tablas);
        }
        items.push({ x, y, texto });
      } else {
        const token = m[5];
        const texto = token.startsWith("<")
          ? decodeHex(token.slice(1, -1), fuente, tablas)
          : token.slice(1, -1);
        items.push({ x, y, texto });
      }
    }
    paginas.push(items);
  }
  return paginas;
}

/**
 * Texto de cada página, con los glifos pegados.
 *
 * @param {Buffer} buffer PDF completo.
 * @returns {string[]} una entrada por página, en orden.
 */
export function paginasDeTexto(buffer) {
  return paginasDeItems(buffer).map((items) => items.map((i) => i.texto).join(""));
}

function decodeHex(hex, fuente, tablas) {
  const tabla = tablas.get(fuente);
  if (!tabla) return "";
  const limpio = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < limpio.length; i += 2) {
    out += tabla.get(parseInt(limpio.slice(i, i + 2), 16)) ?? "";
  }
  return out;
}

/**
 * Etiquetas de subgrupo de prácticas por asignatura, tal como aparecen en las
 * páginas de horarios. El código va pegado a la palabra anterior (el PDF se
 * dibuja glifo a glifo), así que se busca el sufijo que sea un código conocido.
 *
 * @param {Array<string|Array>} paginas texto de cada página o sus ítems.
 * @param {string[]} codigos códigos de asignatura que interesan.
 * @returns {Object<string, string[]>} etiquetas ordenadas por asignatura.
 */
export function subgruposPorAsignatura(paginas, codigos) {
  const conocidos = new Set(codigos);
  const porAsignatura = new Map();
  for (const pagina of paginas) {
    const plano = (Array.isArray(pagina) ? pagina.map((i) => i.texto).join("") : String(pagina || ""))
      .replace(/\s+/g, "");
    for (const m of plano.matchAll(/([A-Z]{2,6})\(([A-F])(\d)\)/g)) {
      let codigo = m[1];
      for (let corte = 0; corte < codigo.length; corte++) {
        if (conocidos.has(codigo.slice(corte))) {
          codigo = codigo.slice(corte);
          break;
        }
      }
      if (!conocidos.has(codigo)) continue;
      const etiquetas = porAsignatura.get(codigo) || new Set();
      etiquetas.add(`${m[2]}${m[3]}`);
      porAsignatura.set(codigo, etiquetas);
    }
  }
  const out = {};
  for (const [codigo, etiquetas] of [...porAsignatura].sort()) {
    out[codigo] = [...etiquetas].sort(
      (a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)),
    );
  }
  return out;
}

/** Día de la semana por el nombre con el que lo rotula el horario. */
const DIAS = {
  Lunes: "lunes",
  Martes: "martes",
  Miércoles: "miercoles",
  Jueves: "jueves",
  Viernes: "viernes",
};

const HORA = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;

/**
 * Franjas de cada subgrupo de prácticas leídas de la rejilla: cada celda lleva
 * su etiqueta (`FS (A1)`) y de su posición salen el día (la columna, por la x) y
 * la hora (la fila, por la y). Una etiqueta puede salir varias veces —una por
 * sesión semanal— y aquí se devuelven sin repetir y en orden.
 *
 * @param {Array<Array<{x: number, y: number, texto: string}>>} paginas ítems por página.
 * @param {string[]} codigos códigos de asignatura que interesan.
 * @returns {Object<string, Object<string, Array<{dia: string, inicio: string, fin: string}>>>}
 */
export function franjasDeSubgrupos(paginas, codigos) {
  return practicasPorAsignatura(gruposDeHorario(paginas, codigos));
}

/**
 * Etiquetas de prácticas de cada asignatura a partir de sus grupos, en orden de
 * letra y número: es lo que necesita el cruce con la guía docente (el número de
 * grupo de la guía es la posición en esta lista).
 *
 * @param {Object} grupos grupos por asignatura (`gruposDeHorario`).
 * @returns {Object<string, Object<string, Array>>} etiquetas con sus franjas.
 */
export function practicasPorAsignatura(grupos) {
  const out = {};
  for (const [codigo, porLetra] of Object.entries(grupos || {})) {
    const etiquetas = {};
    for (const letra of Object.keys(porLetra).sort()) {
      for (const etiqueta of Object.keys(porLetra[letra].practicas || {})) {
        etiquetas[etiqueta] = porLetra[letra].practicas[etiqueta];
      }
    }
    out[codigo] = etiquetas;
  }
  return out;
}

/**
 * Todo lo que el horario publica de cada asignatura, por letra de grupo: su
 * **teoría** (las celdas que llevan solo el código) y sus **subgrupos de
 * prácticas** (las celdas con etiqueta), cada uno con sus franjas.
 *
 * Cada página del PDF es el horario de un grupo. La letra sale del título
 * (`1º A`, `3DGII`, `3GII(IS-A)`, `… – B`) y, cuando el título no la dice —las
 * páginas de mención de cuarto—, de las propias etiquetas de prácticas, que son
 * de ese grupo.
 *
 * @param {Array<Array<{x: number, y: number, texto: string}>>} paginas ítems por página.
 * @param {string[]} codigos códigos de asignatura que interesan.
 * @returns {Object<string, Object<string, {teoria: Array, practicas: Object}>>}
 */
export function gruposDeHorario(paginas, codigos) {
  const conocidos = new Set(codigos);
  const porAsignatura = new Map();

  for (const items of paginas) {
    if (!Array.isArray(items) || !items.length) continue;
    const lineas = agruparEnLineas(items);

    const dias = [];
    const horas = [];
    for (const linea of lineas) {
      for (const hallado of buscarEnLinea(linea, /Lunes|Martes|Miércoles|Jueves|Viernes/g)) {
        dias.push({ x: hallado.x, dia: DIAS[hallado.texto] });
      }
      for (const hallado of buscarEnLinea(linea, /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g)) {
        horas.push({ y: linea[0].y, hora: hallado.match });
      }
    }
    if (!dias.length || !horas.length) continue;

    // Celdas: los trozos que comparten posición. Una celda de teoría lleva solo
    // el código; una de prácticas, `FS (A1)`.
    const celdas = new Map();
    for (const item of items) {
      const clave = `${item.x.toFixed(1)}@${item.y.toFixed(1)}`;
      const celda = celdas.get(clave) || { x: item.x, y: item.y, texto: "" };
      celda.texto += item.texto;
      celdas.set(clave, celda);
    }

    const etiquetas = [];
    const numeradas = [];
    const teoria = [];
    for (const celda of celdas.values()) {
      const texto = celda.texto.trim();
      // `FS (A1)`: subgrupo de un grupo de teoría.
      const conLetra = /^([A-Z]{1,4})\s*\(\s*([A-F])\s*(\d)\s*\)$/.exec(texto);
      if (conLetra) {
        const codigo = codigoConocido(conLetra[1], conocidos);
        if (codigo) {
          etiquetas.push({ codigo, letra: conLetra[2], etiqueta: `${conLetra[2]}${conLetra[3]}`, x: celda.x, y: celda.y });
        }
        continue;
      }
      // `DGP1`: las optativas de cuarto numeran sus prácticas sin letra, porque
      // tienen un solo grupo; en la app ese grupo es la A.
      const numerada = /^([A-Z]{2,4})(\d)$/.exec(texto);
      if (numerada && conocidos.has(numerada[1])) {
        numeradas.push({ codigo: numerada[1], letra: "A", etiqueta: `A${numerada[2]}`, x: celda.x, y: celda.y });
        continue;
      }
      if (/^[A-Z]{2,4}$/.test(texto) && conocidos.has(texto)) {
        teoria.push({ codigo: texto, x: celda.x, y: celda.y });
      }
    }

    // La letra de la página: el título, o la de sus etiquetas. Si no la dice
    // —las páginas de optativas, que numeran sus prácticas y no tienen letra—
    // es la A: esas asignaturas tienen un solo grupo.
    const letra =
      letraDePagina(tituloDePagina(items), [...etiquetas, ...numeradas].map((e) => e.letra)) ||
      (teoria.length || numeradas.length ? "A" : "");
    if (!letra) continue;

    const anota = (codigo, bloque, clave, franja) => {
      const asignatura = porAsignatura.get(codigo) || new Map();
      const porLetra = asignatura.get(letra) || { teoria: [], practicas: {} };
      // La misma franja puede salir en dos páginas (un grupo de mención cursa
      // asignaturas comunes con su grupo de curso): se guarda una vez.
      const repetida = (lista) =>
        lista.some((s) => s.dia === franja.dia && s.inicio === franja.inicio);
      if (bloque === "teoria") {
        if (!repetida(porLetra.teoria)) porLetra.teoria.push(franja);
      } else {
        const sesiones = porLetra.practicas[clave] || [];
        if (!repetida(sesiones)) sesiones.push(franja);
        porLetra.practicas[clave] = sesiones;
      }
      asignatura.set(letra, porLetra);
      porAsignatura.set(codigo, asignatura);
    };

    for (const celda of teoria) {
      const franja = franjaDe(celda, dias, horas);
      if (franja) anota(celda.codigo, "teoria", "", franja);
    }
    for (const celda of [...etiquetas, ...numeradas]) {
      const franja = franjaDe(celda, dias, horas);
      if (franja) anota(celda.codigo, "practicas", celda.etiqueta, franja);
    }
  }

  const out = {};
  for (const [codigo, porLetra] of [...porAsignatura].sort()) {
    out[codigo] = {};
    for (const letra of [...porLetra.keys()].sort()) {
      const grupo = porLetra.get(letra);
      const practicas = {};
      for (const etiqueta of Object.keys(grupo.practicas).sort(
        (a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)),
      )) {
        practicas[etiqueta] = ordenarFranjas(grupo.practicas[etiqueta]);
      }
      out[codigo][letra] = { teoria: ordenarFranjas(grupo.teoria), practicas };
    }
  }
  return out;
}

/** El título de la página: los ítems de la fila más alta. */
function tituloDePagina(items) {
  const tope = Math.max(...items.map((i) => i.y));
  return items
    .filter((i) => i.y > tope - 4)
    .map((i) => i.texto)
    .join("")
    .trim();
}

/**
 * La letra del grupo de una página: del título (`1º A`, `3DGII`,
 * `3GII(IS-A)`, `… – B`) y, si no la dice —las páginas de mención de cuarto—, de
 * las etiquetas de prácticas, que son de ese grupo.
 */
function letraDePagina(titulo, letrasDeEtiquetas) {
  const enTitulo =
    /^\dº?\s*([A-F])\b/.exec(titulo) ||
    /^\d([A-F])GII\b/.exec(titulo) ||
    /\(\s*[A-Za-z]+\s*[-–]\s*([A-F])\s*\)/.exec(titulo) ||
    /[-–]\s*([A-F])\s*\)/.exec(titulo);
  if (enTitulo) return enTitulo[1];
  const comunes = [...new Set(letrasDeEtiquetas)];
  return comunes.length === 1 ? comunes[0] : "";
}

/** El código de asignatura que acaba en `codigo`, si es uno de los conocidos. */
function codigoConocido(texto, conocidos) {
  for (let corte = 0; corte < texto.length; corte++) {
    if (conocidos.has(texto.slice(corte))) return texto.slice(corte);
  }
  return "";
}

/** Franja de una celda: el día más cercano por x y la hora más cercana por y. */
function franjaDe(celda, dias, horas) {
  const dia = masCercano(dias, celda.x, (d) => d.x);
  const fila = masCercano(horas, celda.y, (h) => h.y);
  if (!dia || !fila) return null;
  return { dia: dia.dia, inicio: fila.hora[1], fin: fila.hora[2] };
}

/** Franjas ordenadas por día y hora de comienzo. */
function ordenarFranjas(franjas) {
  return franjas
    .slice()
    .sort((a, b) => a.dia.localeCompare(b.dia) || minutos(a.inicio) - minutos(b.inicio));
}


/**
 * Agrupa los ítems en filas por su altura: cada celda del horario es una fila y
 * dentro de ella los trozos van en orden de lectura.
 *
 * @param {Array<{x: number, y: number, texto: string}>} items ítems de una página.
 * @returns {Array<Array>} filas, cada una en orden de lectura.
 */
function agruparEnLineas(items) {
  const filas = [];
  for (const item of items) {
    const fila = filas.find((f) => Math.abs(f[0].y - item.y) < 2);
    if (fila) fila.push(item);
    else filas.push([item]);
  }
  return filas;
}

/**
 * Busca un patrón en el texto reunido de una fila y devuelve cada coincidencia
 * con la x del trozo donde empieza (el avance de los glifos no está en la x).
 *
 * @param {Array} linea fila de ítems.
 * @param {RegExp} patron patrón global.
 * @returns {Array<{match: Array, texto: string, x: number}>}
 */
function buscarEnLinea(linea, patron) {
  const texto = linea.map((i) => i.texto).join("");
  const out = [];
  for (const match of texto.matchAll(patron)) {
    let recorrido = 0;
    let x = linea[linea.length - 1].x;
    for (const item of linea) {
      recorrido += item.texto.length;
      if (match.index < recorrido) {
        x = item.x;
        break;
      }
    }
    out.push({ match, texto: match[0], x });
  }
  return out;
}

/** Minutos de una hora `H:MM`. */
function minutos(hora) {
  const [h, m] = String(hora).split(":");
  return Number(h) * 60 + Number(m);
}

/** El elemento de `lista` cuya clave numérica está más cerca de `valor`. */
function masCercano(lista, valor, clave) {
  return lista.reduce((mejor, actual) =>
    Math.abs(clave(actual) - valor) < Math.abs(clave(mejor) - valor) ? actual : mejor,
  );
}


/**
 * Agrupa los ítems en líneas por su altura: el horario dibuja unas etiquetas de
 * una tirada (`FS (A1)`) y otras glifo a glifo, así que hay que volver a juntar
 * las de la misma fila antes de leer nada.
 *
 * @param {Array<{x: number, y: number, texto: string}>} items ítems de una página.
 * @returns {Array<Array>} líneas, cada una ordenada por x.
 */
