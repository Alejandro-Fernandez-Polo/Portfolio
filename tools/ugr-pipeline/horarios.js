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
 * Texto de cada página del PDF, con los glifos pegados.
 *
 * @param {Buffer} buffer PDF completo.
 * @returns {string[]} una entrada por página, en orden.
 */
export function paginasDeTexto(buffer) {
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
    let salida = "";
    const re =
      /\/(F\d+)\s+[\d.]+\s+Tf|\[([^\]]*)\]\s*TJ|(\((?:\\.|[^()\\])*\)|<[0-9A-Fa-f\s]*>)\s*Tj/g;
    let m;
    while ((m = re.exec(stream))) {
      if (m[1]) {
        fuente = fuenteDe(m[1]);
      } else if (m[2] !== undefined) {
        for (const hex of m[2].matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
          salida += decodeHex(hex[1], fuente, tablas);
        }
      } else {
        const token = m[3];
        if (token.startsWith("<")) salida += decodeHex(token.slice(1, -1), fuente, tablas);
        else salida += token.slice(1, -1);
      }
    }
    paginas.push(salida);
  }
  return paginas;
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
 * @param {string[]} paginas texto de cada página.
 * @param {string[]} codigos códigos de asignatura que interesan.
 * @returns {Object<string, string[]>} etiquetas ordenadas por asignatura.
 */
export function subgruposPorAsignatura(paginas, codigos) {
  const conocidos = new Set(codigos);
  const porAsignatura = new Map();
  for (const pagina of paginas) {
    const plano = String(pagina || "").replace(/\s+/g, "");
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
