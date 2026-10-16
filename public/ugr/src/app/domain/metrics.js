/**
 * Métricas de configuración y detección de conflictos.
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
 * @param {(d: string) => number|null} [ctx.difficultyScore] peso de una
 *   dificultad; por defecto `null` (sin puntuación). Un `null` —o una
 *   dificultad «Desconocida», que es lo que devuelve el catálogo— no suma ni
 *   cuenta: el profesor se ignora en lugar de puntuar como «Difícil».
 * @returns {{manana: number, tarde: number, profScore: number,
 *   profCount: number, sameGroupPerYear: boolean}} horas redondeadas a 1
 *   decimal; `profScore`/`profCount` enteros sin redondear. `profCount === 0`
 *   significa «no hay nada que puntuar» y el llamante lo pinta como hueco.
 */
export function calculateConfigMetrics(
  selectedSubjects,
  groupChoices,
  { subjects, dificultad = () => null, difficultyScore = () => null } = {}
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

    // «Desconocido» no puntúa: sin puntuación no hay
    // ni suma ni entrada en el denominador, de modo que la columna «Prof» no
    // se ensucia con profesores de los que no se sabe nada. Si nada puntúa,
    // `profCount` queda a 0 y el llamante pinta el hueco.
    const d = dificultad(codigo, group.letra);
    const score = d ? difficultyScore(d) : null;
    if (score != null) {
      profScore += score;
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
    if (choice.practica && group.practicas && group.practicas[choice.practica]) {
      addDays(group.practicas[choice.practica]);
    }
  });
  return { manana: morningDays.size, tarde: afternoonDays.size };
}

/** Días laborables del calendario, en orden (los mismos que la rejilla). */
export const WEEK_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

/**
 * Días de la semana **sin ninguna** hora de clase en una configuración.
 *
 * A diferencia de `calculateConfigDays` (que cuenta días de mañana y de
 * tarde por separado), aquí un día cuenta como libre solo si no tiene ninguna
 * sesión, sea del turno que sea.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean` de selección.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {{subjects: Array, days?: string[]}} ctx catálogo y días laborables
 *   (por defecto, de lunes a viernes).
 * @returns {string[]} días sin clase, en el orden de `days`.
 */
export function calculateConfigFreeDays(selectedSubjects, groupChoices, { subjects, days = WEEK_DAYS } = {}) {
  const busy = new Set();
  Object.keys(selectedSubjects).forEach(codigo => {
    if (!selectedSubjects[codigo]) return;
    const subject = subjects.find(s => s.codigo === codigo);
    if (!subject) return;
    const choice = groupChoices[codigo];
    if (!choice) return;
    const group = subject.grupos.find(g => g.letra === choice.teoria);
    if (!group) return;

    const addDays = (sessions) => {
      // Sin distinguir mayúsculas: el catálogo usa «lunes» y las fixtures de
      // test escriben «Lunes»; lo que importa es que el día coincida.
      sessions.forEach(s => busy.add(String(s.dia).toLowerCase()));
    };
    addDays(group.teoria);
    if (choice.practica && group.practicas && group.practicas[choice.practica]) {
      addDays(group.practicas[choice.practica]);
    }
  });
  return days.filter(d => !busy.has(String(d).toLowerCase()));
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

/**
 * Resumen de la **selección activa**: lo que suma el horario que se está
 * montando (créditos, horas semanales y turno). Es una regla, no una vista: la
 * usan el panel de resumen y la barra de contadores, así que vive aquí en vez de
 * duplicada en cada sitio que la pinta.
 *
 * `codes` son **todas** las asignaturas marcadas (aunque el catálogo no las
 * conozca); los créditos y las horas solo cuentan las que están en el catálogo.
 *
 * @param {Object} selectedSubjects mapa `codigo → boolean`.
 * @param {Object} groupChoices mapa `codigo → { teoria, practica }`.
 * @param {Array} subjects catálogo de materias.
 * @returns {{codes: string[], count: number, credits: number, hours: number,
 *   turno: ''|'mañana'|'tarde'|'mixto'}} el turno vacío es «sin grupos».
 */
export function buildSelectionSummary(selectedSubjects, groupChoices, subjects) {
  const codes = Object.keys(selectedSubjects || {}).filter((code) => selectedSubjects[code]);
  const lista = Array.isArray(subjects) ? subjects : [];
  let credits = 0;
  let minutesTotal = 0;
  let morning = 0;
  let afternoon = 0;

  const minutesOf = (sessions) => (Array.isArray(sessions) ? sessions : [])
    .reduce((sum, s) => sum + (timeToMinutes(s.fin) - timeToMinutes(s.inicio)), 0);

  for (const code of codes) {
    const subject = lista.find((s) => s.codigo === code);
    if (!subject) continue;
    credits += subject.creditos || 0;

    const choice = (groupChoices || {})[code];
    if (!choice) continue;
    const group = (subject.grupos || []).find((g) => g.letra === choice.teoria);
    if (!group) continue;

    if (group.turno === 'mañana') morning++;
    else afternoon++;

    minutesTotal += minutesOf(group.teoria);
    if (choice.practica && group.practicas && group.practicas[choice.practica]) {
      minutesTotal += minutesOf(group.practicas[choice.practica]);
    }
  }

  let turno = '';
  if (morning > 0 && afternoon === 0) turno = 'mañana';
  else if (afternoon > 0 && morning === 0) turno = 'tarde';
  else if (morning > 0 && afternoon > 0) turno = 'mixto';

  return { codes, count: codes.length, credits, hours: minutesTotal / 60, turno };
}
