/**
 * Las opiniones de la **muestra** son ficticias.
 *
 * La app sin contraseña enseña los nombres reales de los profesores —los publica
 * la ETSIIT y son currículo público—, pero **no puede publicar lo que opina
 * nadie sobre ellos**: el texto de la hoja es de terceros y viaja cifrado en el
 * paquete. En su lugar, cada perfil de la muestra lleva opiniones **inventadas**
 * y genéricas, y la interfaz lo dice al leerlas.
 *
 * Son estables: se derivan de la terna (asignatura, modalidad, nombre) con un
 * hash, así que regenerar la muestra no las cambia y el proceso es idempotente.
 */

import { createHash } from "node:crypto";

/**
 * Opiniones de ejemplo. Ninguna habla de una persona concreta: describen cosas
 * que podría decir cualquiera de una asignatura, y ninguna copia texto de la
 * hoja.
 */
export const OPINIONES_FICTICIAS = [
  "Explica con ejemplos y deja las dudas para el final de la clase.",
  "Las transparencias siguen el temario y se entienden bien.",
  "Conviene llevar los ejercicios hechos antes de la sesión práctica.",
  "Va al ritmo del grupo y se para cuando alguien pregunta.",
  "Responde en tutoría sin problema y con detalle.",
  "Los exámenes se parecen bastante a lo que se hace en clase.",
  "Da material complementario para quien quiera profundizar.",
  "La asignatura se aprueba con trabajo constante más que con atracones.",
  "Usa ejemplos actuales, se agradece para verle sentido al temario.",
  "Es exigente con la entrega, pero avisa de las fechas con tiempo.",
  "En las prácticas conviene preguntar pronto y no dejarlo todo al final.",
  "Las clases son participativas si el grupo se anima a preguntar.",
  "Corrige con criterio y deja claro de dónde sale cada punto.",
  "Avisa del nivel de dificultad desde el primer día.",
  "Se apoya mucho en la documentación oficial de la asignatura.",
  "Si sigues el temario al día, no hace falta estudiar de cero.",
  "Los grupos pequeños de prácticas funcionan mejor que la clase grande.",
  "Ha cambiado algún tema este curso y se nota la preparación.",
  "Puntual y ordenado: las sesiones empiezan a la hora.",
  "Recomienda libros y enlaces, no obliga a comprar nada.",
  "Las correcciones de los ejercicios llegan con la siguiente sesión.",
  "Pide participación en clase, pero no obliga a intervenir.",
  "Se nota la experiencia: resuelve las dudas sin salirse del temario.",
  "El temario es amplio; lo importante se marca en clase.",
];

/** Hash hex de la semilla, con un prefijo propio para no compartir dominio. */
function hashDe(semilla) {
  return createHash("sha256").update(`ugr-muestra:opinion:${semilla}`, "utf8").digest("hex");
}

/** Entero a partir de un tramo del hash. */
function tramo(hash, desde, largo = 4) {
  return parseInt(hash.slice(desde, desde + largo), 16);
}

/**
 * Opiniones inventadas de un perfil de la muestra. Deterministas y sin repes.
 *
 * @param {{subjectCode: string, modalidad: string, name: string}} perfil
 * @returns {string[]} de 0 a 2 opiniones del repertorio.
 */
export function opinionesFicticias({ subjectCode, modalidad, name } = {}) {
  const h = hashDe(`${subjectCode || ""}|${modalidad || ""}|${name || ""}`);
  // Reparto: la mayoría con una opinión, algunas con dos y unas pocas sin
  // ninguna, para que la muestra no parezca una plantilla.
  const cuantas = tramo(h, 0, 2) % 10 < 6 ? 1 : tramo(h, 0, 2) % 10 < 9 ? 2 : 0;
  const elegidas = [];
  for (let i = 0; i < cuantas; i++) {
    const texto = OPINIONES_FICTICIAS[tramo(h, 4 + i * 4) % OPINIONES_FICTICIAS.length];
    if (!elegidas.includes(texto)) elegidas.push(texto);
  }
  return elegidas;
}

/**
 * ¿Este texto es una de las opiniones de ejemplo? Sirve para comprobar que la
 * muestra no publica texto real y que lo que lleva lo ha puesto este módulo.
 *
 * @param {string} texto
 * @returns {boolean}
 */
export function esOpinionFicticia(texto) {
  return OPINIONES_FICTICIAS.includes(texto);
}
