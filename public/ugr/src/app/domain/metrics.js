/**
 * Métricas de configuración y detección de conflictos (T02.4).
 *
 * Extraídas del monolito `public/ugr/app.js` sin cambio de comportamiento:
 * aquí vive la única implementación y el IIFE clásico delega vía
 * `deps.domain`. Funciones puras — sin DOM, sin globals, sin estado — los
 * datos llegan por parámetro (el llamante inyecta `subjects` y los lookup de
 * dificultad), de modo que puedan probarse con fixtures propias.
 */

import { timeToMinutes, timesOverlap } from './schedule.js';

/**
 * Métricas de una configuración: horas por turno, puntuación de profesores y
 * si se usa la misma letra de grupo en todos los cursos.
 *
 * Réplica exacta de `app.js` `calculateConfigMetrics`. El turno se decide por
 * `group.turno === 'mañana'` (no por la hora de inicio): es la regla legacy y
 * gobierna el reparto de horas.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {Object} ctx dependencias inyectadas por el llamante.
 * @param {Array} ctx.subjects catálogo de materias (`SUBJECTS` en producción).
 * @param {(codigo: string, letra: string) => string|null} [ctx.dificultad]
 *   lookup de dificultad del profesor; por defecto `null` (sin puntuación).
 * @param {(d: string) => number} [ctx.difficultyScore] peso de una dificultad;
 *   por defecto `3` (mismo fallback que `getDifficultyScore` sin catálogo).
 * @returns {{manana: number, tarde: number, profScore: number,
 *   profCount: number, sameGroupPerYear: boolean}} horas redondeadas a 1
 *   decimal; `profScore`/`profCount` enteros sin redondear.
 */
export function calculateConfigMetrics(
  selectedSubjects,
  groupChoices,
  { subjects, dificultad = () => null, difficultyScore = () => 3 } = {}
) {
  let manana = 0, tarde = 0;
  let profScore = 0, profCount = 0;
  const cursoGrupos = {};

  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;
    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group) return;

    const sumHours = (sessions) => {
      sessions.forEach(s => {
        const hrs = (timeToMinutes(s.fin) - timeToMinutes(s.inicio)) / 60;
        if (group.turno === 'mañana') manana += hrs;
        else tarde += hrs;
      });
    };
    sumHours(group.teoria);
    if (choice.practica && group.practicas[choice.practica]) {
      sumHours(group.practicas[choice.practica]);
    }

    const d = dificultad(codigo, group.letra);
    if (d) {
      profScore += difficultyScore(d);
      profCount++;
    }

    if (!cursoGrupos[subject.curso]) cursoGrupos[subject.curso] = new Set();
    cursoGrupos[subject.curso].add(group.letra);
  });

  const sameGroupPerYear = Object.values(cursoGrupos).every(s => s.size === 1);

  return {
    manana: Math.round(manana * 10) / 10,
    tarde: Math.round(tarde * 10) / 10,
    profScore,
    profCount,
    sameGroupPerYear
  };
}

/**
 * Horas muertas (huecos) de una configuración, agrupadas por día.
 *
 * Réplica exacta de `app.js` `calculateConfigDeadHours`. Un día se parte en
 * dos franjas independientes — mañana `< 14:00` y tarde `>= 14:00` — porque
 * legacy no considera hueco el tramo de comida entre clases de distinto turno;
 * dentro de cada franja el hueco es `(último fin − primer inicio − suma de
 * sesiones) / 60` y solo cuenta con 2 o más sesiones.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {{subjects: Array}} ctx catálogo de materias inyectado por el llamante.
 * @returns {number} total de horas muertas redondeado a 1 decimal.
 */
export function calculateConfigDeadHours(selectedSubjects, groupChoices, { subjects } = {}) {
  const byDay = {};
  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;
    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group) return;
    const collect = (sessions) => {
      sessions.forEach(s => {
        if (!byDay[s.dia]) byDay[s.dia] = [];
        byDay[s.dia].push({ inicio: timeToMinutes(s.inicio), fin: timeToMinutes(s.fin) });
      });
    };
    collect(group.teoria);
    if (choice.practica && group.practicas[choice.practica]) {
      collect(group.practicas[choice.practica]);
    }
  });

  let total = 0;
  const shiftDead = (sessions) => {
    if (sessions.length < 2) return 0;
    let first = Infinity, last = -Infinity, sum = 0;
    sessions.forEach(s => {
      if (s.inicio < first) first = s.inicio;
      if (s.fin > last) last = s.fin;
      sum += s.fin - s.inicio;
    });
    return (last - first - sum) / 60;
  };
  Object.values(byDay).forEach(sessions => {
    const manana = sessions.filter(s => s.inicio < 14 * 60);
    const tarde = sessions.filter(s => s.inicio >= 14 * 60);
    total += shiftDead(manana) + shiftDead(tarde);
  });
  return Math.round(total * 10) / 10;
}

/**
 * Número de días con clases por turno en una configuración.
 *
 * Réplica exacta de `app.js` `calculateConfigDays`. El corte es por hora de
 * inicio `< 14` (entera, vía `parseInt` del `HH:MM`), coherente con la franja
 * de `calculateConfigDeadHours`.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {{subjects: Array}} ctx catálogo de materias inyectado por el llamante.
 * @returns {{manana: number, tarde: number}} tamaños de los sets de días.
 */
export function calculateConfigDays(selectedSubjects, groupChoices, { subjects } = {}) {
  const morningDays = new Set();
  const afternoonDays = new Set();
  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;
    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group) return;

    const addDays = (sessions) => {
      sessions.forEach(s => {
        const hour = parseInt(s.inicio.split(':')[0]);
        if (hour < 14) morningDays.add(s.dia);
        else afternoonDays.add(s.dia);
      });
    };
    addDays(group.teoria);
    if (choice.practica && group.practicas[choice.practica]) {
      addDays(group.practicas[choice.practica]);
    }
  });
  return { manana: morningDays.size, tarde: afternoonDays.size };
}

/**
 * Conflictos entre entradas de horario (réplica pura de `detectConflicts`).
 *
 * Compara cada par de entradas distintas: se ignoran las del mismo código (la
 * teoría y la práctica de una materia conviven) y las de días distintos, y se
 * marca conflicto cuando los tramos se solapan (adyacentes = no). No toca
 * estado: el IIFE conserva la asignación a su array `conflicts`.
 *
 * @param {Array<{codigo: string, nombre: string, tipo: string, grupo: string,
 *   dia: string|number, inicio: string, fin: string}>} entries entradas del
 *   horario activo (salida de `getActiveSchedule()`).
 * @returns {Array<Object>} conflictos con las claves legacy: `codigo1`,
 *   `nombre1`, `tipo1` (`"<tipo> <grupo>"`), `dia`, `inicio`, `fin`, `codigo2`,
 *   `nombre2`, `tipo2`.
 */
export function findConflicts(entries) {
  const conflicts = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.codigo === b.codigo) continue; // Same subject
      if (a.dia !== b.dia) continue;

      if (timesOverlap(a.inicio, a.fin, b.inicio, b.fin)) {
        conflicts.push({
          codigo1: a.codigo,
          nombre1: a.nombre,
          tipo1: `${a.tipo} ${a.grupo}`,
          dia: a.dia,
          inicio: a.inicio,
          fin: a.fin,
          codigo2: b.codigo,
          nombre2: b.nombre,
          tipo2: `${b.tipo} ${b.grupo}`,
        });
      }
    }
  }
  return conflicts;
}
