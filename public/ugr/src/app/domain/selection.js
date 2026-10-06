/**
 * Reglas puras de selección y grupos (Bloque 3, rebanada B3-a).
 *
 * Extraídas del monolito `public/ugr/app.js` sin cambio de comportamiento:
 * aquí vive la única implementación y el IIFE clásico delega vía
 * `deps.domain`. Funciones puras — sin DOM, sin globals, sin estado: los
 * mapas (`selectedSubjects`, `groupChoices`) y el catálogo llegan por
 * parámetro y las mutaciones se aplican sobre los objetos que el llamante
 * posee (el monolito conserva `saveState()` y cualquier render).
 */

/**
 * Subgrupo preferente por letra inicial del apellido (regla legacy A–F → 1,
 * G–M → 2, N–S → 3, T–Z → 4).
 *
 * Se compara en mayúsculas para que `garcía` y `García` caigan en el mismo
 * tramo. `null` cuando no hay apellido o la primera letra cae fuera de A–Z
 * (números, espacios, `Ñ`…): el llamante trata `null` como "sin preferencia".
 *
 * @param {string} apellido apellido introducido por la persona.
 * @returns {number|null} `1|2|3|4` o `null` si no hay tramo aplicable.
 */
export function getSubgrupoForApellido(apellido) {
  if (!apellido) return null;
  const first = apellido.toUpperCase().charAt(0);
  if (first >= 'A' && first <= 'F') return 1;
  if (first >= 'G' && first <= 'M') return 2;
  if (first >= 'N' && first <= 'S') return 3;
  if (first >= 'T' && first <= 'Z') return 4;
  return null;
}

/**
 * Elección por defecto de una materia: primer grupo de teoría y su primer
 * subgrupo de prácticas (o `null` si el grupo no tiene).
 *
 * Réplica del cuerpo de `initGroupChoice` sin el guard de "ya existe", que se
 * queda en `app.js`: aquí se calcula el valor, allí decide si se guarda.
 * Devuelve `null` cuando la materia no tiene grupos, para que el llamante no
 * cree la entrada (el legacy salía sin asignar nada).
 *
 * @param {Object} subject materia con la forma de `SUBJECTS`.
 * @returns {{teoria: string, practica: string|null}|null} elección inicial o
 *   `null` si la materia no tiene `grupos[0]`.
 */
export function buildGroupChoice(subject) {
  const defaultGroup = subject && subject.grupos && subject.grupos[0];
  if (!defaultGroup) return null;
  return {
    teoria: defaultGroup.letra,
    practica: defaultGroup.practicas && defaultGroup.practicas.subgrupos.length > 0
      ? defaultGroup.practicas.subgrupos[0]
      : null
  };
}

/**
 * Aplica el turno preferente a una elección de grupo, mutándola.
 *
 * Réplica de `applyGroupPreference`: `indiferente` es no-op; si hay grupos en
 * el turno se pasa al primero de ellos y se recoloca la práctica conservando
 * el número de subgrupo actual si ese grupo lo ofrece, si no se cae al primer
 * subgrupo; sin prácticas el resultado es `practica = null`. Si el turno no
 * tiene grupos, la elección no cambia.
 *
 * @param {{teoria: string, practica: string|null}|null|undefined} choice
 *   elección a mutar (`state.groupChoices[codigo]`); `null`/`undefined` → no-op.
 * @param {Object} subject materia con la forma de `SUBJECTS`.
 * @param {string} turno `'mañana' | 'tarde' | 'indiferente'`.
 * @returns {Object|null} la misma referencia `choice` mutada (o intacta).
 */
export function applyTurnoPreference(choice, subject, turno) {
  if (turno === 'indiferente') return choice;
  if (!choice) return choice;

  // Primer grupo del turno: el orden del catálogo decide el desempate.
  const matchingGroups = subject.grupos.filter(g => g.turno === turno);
  if (matchingGroups.length > 0) {
    const bestGroup = matchingGroups[0];
    choice.teoria = bestGroup.letra;
    if (bestGroup.practicas && bestGroup.practicas.subgrupos.length > 0) {
      // Intenta mantener el subgrupo actual si el nuevo grupo lo tiene.
      const currentSub = choice.practica;
      const subgrupoNum = currentSub ? currentSub.replace(/[A-Z]/g, '') : null;
      if (subgrupoNum) {
        const targetSub = bestGroup.letra + subgrupoNum;
        if (bestGroup.practicas.subgrupos.includes(targetSub)) {
          choice.practica = targetSub;
        } else {
          choice.practica = bestGroup.practicas.subgrupos[0];
        }
      } else {
        choice.practica = bestGroup.practicas.subgrupos[0];
      }
    } else {
      choice.practica = null;
    }
  }
  return choice;
}

/**
 * Regla por apellido sobre todas las materias seleccionadas: muta
 * `groupChoices[codigo].practica` al subgrupo `letra + número` cuando el
 * grupo activo lo ofrece.
 *
 * Réplica del bucle de `applyApellidoRule` SIN `saveState()` — la persistencia
 * es responsabilidad del monolito. Las materias no seleccionadas, las que no
 * existen en el catálogo, las sin elección y las cuyo grupo no tiene
 * prácticas se ignoran; el subgrupo solo se cambia si ya coincide con la
 * regla, nunca se desasigna uno distinto.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }` (mutado).
 * @param {Array} subjects catálogo de materias (`SUBJECTS` en producción).
 * @param {string} apellido apellido actual; sin tramo aplicable → no-op.
 * @returns {void}
 */
export function applyApellidoSubgroups(selectedSubjects, groupChoices, subjects, apellido) {
  const subgrupoNum = getSubgrupoForApellido(apellido);
  if (!subgrupoNum) return;

  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;
    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group || !group.practicas || !group.practicas.subgrupos.length) return;

    const targetSub = group.letra + subgrupoNum;
    if (group.practicas.subgrupos.includes(targetSub)) {
      groupChoices[codigo].practica = targetSub;
    }
  });
}
