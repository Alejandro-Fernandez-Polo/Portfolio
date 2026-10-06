/**
 * Reglas puras de calendario (Bloque 3, rebanada B3-a).
 *
 * Extraídas del monolito `public/ugr/app.js` sin cambio de comportamiento:
 * aquí vive la única implementación y el IIFE clásico delega vía
 * `deps.domain`. Construyen datos (entradas de horario y claves de conflicto)
 * pero NUNCA pintan: el render semanal/lista sigue en `app.js`.
 */

/**
 * Horario activo: entradas planas de teoría y práctica de las materias
 * seleccionadas según su elección de grupos.
 *
 * Réplica exacta de `getActiveSchedule`. Cada entrada lleva las claves
 * `codigo, nombre, tipo, grupo, letra, dia, inicio, fin, color` — `color` es
 * el código de la materia (legacy: el CSS lo resuelve por clase). La teoría
 * usa `tipo: 'Teoría'`, `grupo: 'Grupo <letra>'` y `letra`; la práctica
 * `tipo: 'Práctica'`, `grupo: 'Subgrupo <sub>'` y `letra: null` (así
 * `getEntryDificultadLabel` no pide dificultad por subgrupo).
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {Array} subjects catálogo de materias (`SUBJECTS` en producción).
 * @returns {Array<Object>} entradas en orden de iteración de la selección.
 */
export function buildActiveSchedule(selectedSubjects, groupChoices, subjects) {
  const entries = [];
  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;

    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group) return;

    // Sesiones de teoría
    group.teoria.forEach(session => {
      entries.push({
        codigo: subject.codigo,
        nombre: subject.nombre,
        tipo: 'Teoría',
        grupo: `Grupo ${group.letra}`,
        letra: group.letra,
        dia: session.dia,
        inicio: session.inicio,
        fin: session.fin,
        color: subject.codigo
      });
    });

    // Sesiones de práctica (solo si la elección apunta a un subgrupo real)
    if (choice.practica && group.practicas[choice.practica]) {
      group.practicas[choice.practica].forEach(session => {
        entries.push({
          codigo: subject.codigo,
          nombre: subject.nombre,
          tipo: 'Práctica',
          grupo: `Subgrupo ${choice.practica}`,
          letra: null,
          dia: session.dia,
          inicio: session.inicio,
          fin: session.fin,
          color: subject.codigo
        });
      });
    }
  });
  return entries;
}

/**
 * Claves de celda ocupadas por conflictos, para marcar el calendario.
 *
 * Réplica exacta de `buildConflictSet`: cada conflicto aporta las claves de
 * ambas materias `"<codigo>-<dia>-<inicio>"`; el `Set` deduplica cuando una
 * materia aparece en varios conflictos a la misma hora. No recorta ni
 * normaliza: la clave es literal y debe coincidir con la que pinta el render.
 *
 * @param {Array<{codigo1: string, codigo2: string, dia: string,
 *   inicio: string}>} conflictos salida de `findConflicts`.
 * @returns {Set<string>} claves `${codigo}-${dia}-${inicio}`.
 */
export function buildConflictSet(conflicts) {
  const conflictSet = new Set();
  conflicts.forEach(c => {
    conflictSet.add(`${c.codigo1}-${c.dia}-${c.inicio}`);
    conflictSet.add(`${c.codigo2}-${c.dia}-${c.inicio}`);
  });
  return conflictSet;
}
