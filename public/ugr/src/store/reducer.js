import { isValidStatus, normalizeEstado } from "../progress/status.js";
import { normalizeConvalidaciones } from "../progress/convalidaciones.js";
import { normalizeFails } from "../progress/summary.js";

export const initialState = {
  rev: 0,
  updatedAt: "",
  deviceId: "",
  profile: {
    apellido: "",
    turnoPreferente: "indiferente",
  },
  selection: {
    cuatrimestreActivo: 1,
    selectedSubjects: {},
    groupChoices: {},
  },
  filters: [],
  // Bloqueos de configuraciones (app.js). Persisten en IDB como parte de userState.
  blocks: [],
  ui: {
    view: "horario",
    compareIds: [],
    favorites: [],
    // «Ignorar profesores»: apagado por defecto y sin puerta, como el
    // resto de preferencias de la vista. Vive en el store —no en localStorage—
    // para viajar con el usuarioState y sobrevivir al reload.
    ignoreDocents: false,
  },
  // Fuente canónica del progreso académico (ver src/progress/). commands.js
  // persiste userState en IndexedDB, así que este objeto es lo que se guarda.
  progress: {
    credits: {},
    // Las convalidaciones (`src/progress/convalidaciones.js`): una sola lista,
    // cada una con sus orígenes, sus destinos UGR y su estado. La asignatura de
    // destino **no se marca a mano**: se calcula desde aquí.
    equivalences: [],
    plan: { totalECTS: 240 },
    // Mención elegida (vacío = sin decidir): el título lleva una y se asigna.
    mencion: "",
    // Suspensos por asignatura, informativos: { [code]: n }. No cambian los ECTS.
    fails: {},
  },
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function nextRev(state) {
  return { ...state, rev: state.rev + 1, updatedAt: new Date().toISOString() };
}

export function reduceProfile(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "profile/setApellido": {
      // Sin cambios → estado original (misma referencia): app.js hace push del
      // perfil en cada saveState y sin este corte cada uno re-serializaría
      // userState en IDB con un rev nuevo (mismo criterio que selection/setAll).
      const next = cmd.payload.apellido || "";
      if (ns.profile.apellido === next) return state;
      ns.profile.apellido = next;
      return nextRev(ns);
    }
    case "profile/setTurno": {
      const next = cmd.payload.turno || "indiferente";
      if (ns.profile.turnoPreferente === next) return state;
      ns.profile.turnoPreferente = next;
      return nextRev(ns);
    }
    default:
      return state;
  }
}

export function reduceSelection(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "selection/toggleSubject": {
      const { code } = cmd.payload;
      if (ns.selection.selectedSubjects[code]) {
        delete ns.selection.selectedSubjects[code];
        delete ns.selection.groupChoices[code];
      } else {
        ns.selection.selectedSubjects[code] = true;
      }
      return nextRev(ns);
    }
    case "selection/setGroups": {
      const { code, teoria, practica } = cmd.payload;
      if (!ns.selection.selectedSubjects[code]) return state;
      ns.selection.groupChoices[code] = { teoria, practica };
      return nextRev(ns);
    }
    case "selection/setCuatrimestre": {
      ns.selection.cuatrimestreActivo = cmd.payload.cuatrimestre;
      return nextRev(ns);
    }
    case "selection/setAll": {
      // Bulk-replace de la selección: la usa la migración legacy
      // (payload parcial) y el push de app.js (payload completo desde la caché
      // local). Solo se tocan campos presentes y válidos; ausentes/inválidos
      // se ignoran para no destruir datos por un payload parcial.
      // Sin cambios efectivos se devuelve el estado original (misma referencia):
      // evita writes en IDB cuando app.js hace push en cada saveState.
      const p = cmd.payload;
      if (!p || typeof p !== "object" || Array.isArray(p)) return state;
      const isPlainObj = (v) => v && typeof v === "object" && !Array.isArray(v);
      if (isPlainObj(p.selectedSubjects) &&
          JSON.stringify(ns.selection.selectedSubjects) !== JSON.stringify(p.selectedSubjects)) {
        ns.selection.selectedSubjects = clone(p.selectedSubjects);
      }
      if (isPlainObj(p.groupChoices) &&
          JSON.stringify(ns.selection.groupChoices) !== JSON.stringify(p.groupChoices)) {
        ns.selection.groupChoices = clone(p.groupChoices);
      }
      // Solo 1|2: el mismo guard que usa hydrateSelectionFromStore en app.js.
      if ((p.cuatrimestreActivo === 1 || p.cuatrimestreActivo === 2) &&
          ns.selection.cuatrimestreActivo !== p.cuatrimestreActivo) {
        ns.selection.cuatrimestreActivo = p.cuatrimestreActivo;
      }
      if (JSON.stringify(ns.selection) === JSON.stringify(state.selection)) return state;
      return nextRev(ns);
    }
    case "selection/clear": {
      ns.selection.selectedSubjects = {};
      ns.selection.groupChoices = {};
      return nextRev(ns);
    }
    default:
      return state;
  }
}

export function reduceFilters(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "filters/add": {
      ns.filters.push(cmd.payload);
      return nextRev(ns);
    }
    case "filters/remove": {
      ns.filters = ns.filters.filter((_, i) => i !== cmd.payload.index);
      return nextRev(ns);
    }
    case "filters/setWeight": {
      if (ns.filters[cmd.payload.index]) {
        ns.filters[cmd.payload.index].weight = cmd.payload.weight;
      }
      return nextRev(ns);
    }
    case "filters/setAll": {
      ns.filters = cmd.payload.filters || [];
      return nextRev(ns);
    }
    default:
      return state;
  }
}

/**
 * Valida una entrada de bloqueo. Formas válidas:
 *   { type: 'subject', codigo, letra }
 *   { type: 'subject-only', codigo }
 *   { type: 'curso', curso, letra }
 * Los campos se normalizan para evitar duplicados por tipo inconsistente.
 */
function normalizeBlockEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'subject' && entry.codigo && entry.letra) {
    return { type: 'subject', codigo: String(entry.codigo), letra: String(entry.letra) };
  }
  if (entry.type === 'subject-only' && entry.codigo) {
    return { type: 'subject-only', codigo: String(entry.codigo) };
  }
  if (entry.type === 'curso' && entry.letra) {
    const curso = Number(entry.curso);
    if (!Number.isFinite(curso)) return null;
    return { type: 'curso', curso, letra: String(entry.letra) };
  }
  return null;
}

export function reduceBlocks(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case 'blocks/add': {
      const entry = normalizeBlockEntry(cmd.payload);
      if (!entry) return state;
      ns.blocks.push(entry);
      return nextRev(ns);
    }
    case 'blocks/remove': {
      const idx = cmd.payload?.index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= ns.blocks.length) return state;
      ns.blocks = ns.blocks.filter((_, i) => i !== idx);
      return nextRev(ns);
    }
    case 'blocks/setAll': {
      const blocks = cmd.payload?.blocks;
      if (!Array.isArray(blocks)) return state;
      // Filtrar entradas inválidas mantiene la invariante del store
      ns.blocks = blocks.map(normalizeBlockEntry).filter(Boolean);
      return nextRev(ns);
    }
    default:
      return state;
  }
}

/**
 * Nombres de vista aceptados por el store. La pestaña de datos se llamó
 * `asignaturas`; un estado guardado con ese nombre se lee como `datos` en vez
 * de dejar la vista en blanco. Solo se traduce el alias: cualquier otro valor
 * pasa tal cual, como antes.
 */
const VIEW_ALIASES = { asignaturas: "datos" };

export function reduceUI(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "ui/setView": {
      ns.ui.view = VIEW_ALIASES[cmd.payload.view] || cmd.payload.view;
      return nextRev(ns);
    }
    case "ui/setCompareIds": {
      ns.ui.compareIds = cmd.payload.ids || [];
      return nextRev(ns);
    }
    case "ui/toggleFavorite": {
      const id = cmd.payload.id;
      const idx = ns.ui.favorites.indexOf(id);
      if (idx >= 0) ns.ui.favorites.splice(idx, 1);
      else ns.ui.favorites.push(id);
      return nextRev(ns);
    }
    case "ui/setIgnoreDocents": {
      ns.ui.ignoreDocents = !!cmd.payload.ignoreDocents;
      return nextRev(ns);
    }
    default:
      return state;
  }
}

export function reduceProgress(state, cmd) {
  switch (cmd.type) {
    case "progress/setMencion": {
      const { mencion } = cmd.payload || {};
      if (typeof mencion !== "string") return state;
      if (state.progress.mencion === mencion) return state;
      const ns = clone(state);
      ns.progress.mencion = mencion;
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }

    case "progress/setStatus":
    case "progress/setCredit": {
      // setCredit es el alias histórico de setStatus (mismo contrato
      // { code, status }). Estado inválido o sin cambios → no tocar: es
      // idempotente y evita writes en IDB al repetir el mismo comando.
      const { code, status } = cmd.payload || {};
      // El estado vacío es «sin marcar»: la asignatura deja de tener estado.
      const sinMarcar = status === "";
      if (!code || (!sinMarcar && !isValidStatus(status))) return state;
      if (!sinMarcar && state.progress.credits[code] === status) return state;
      if (sinMarcar && !(code in state.progress.credits)) return state;
      const ns = clone(state);
      if (sinMarcar) delete ns.progress.credits[code];
      else ns.progress.credits[code] = status;
      // updatedAt propio del progreso: lo usa buildMergePlan para decidir
      // qué versión gana al fusionar dos bundles.
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setConvalidaciones": {
      // Reemplaza la lista entera: la sección de Progreso manda lo que tiene (y ya
      // viene normalizado por ella). Sin `items` en el payload se conserva lo que
      // hubiera, para no destruir datos por un campo ausente.
      const items = cmd.payload?.items;
      if (!Array.isArray(items)) return state;
      const ns = clone(state);
      ns.progress.equivalences = normalizeConvalidaciones(items);
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setEstadoConvalidacion": {
      // Cambia el estado de una convalidación sin reenviar la lista entera.
      // Estado inválido o sin cambios → no tocar: idempotente.
      const { id, estado } = cmd.payload || {};
      const nuevo = normalizeEstado(estado);
      if (!id || !nuevo) return state;
      const ns = clone(state);
      const idx = ns.progress.equivalences.findIndex((item) => item && String(item.id) === String(id));
      if (idx === -1 || ns.progress.equivalences[idx].estado === nuevo) return state;
      ns.progress.equivalences[idx] = { ...ns.progress.equivalences[idx], estado: nuevo };
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setFails": {
      // Suspensos de una asignatura (0 = sin suspensos: se borra la clave).
      const { code, count } = cmd.payload || {};
      if (!code) return state;
      const ns = clone(state);
      const fallos = normalizeFails({ ...ns.progress.fails, [code]: count });
      if (JSON.stringify(fallos) === JSON.stringify(ns.progress.fails || {})) return state;
      ns.progress.fails = fallos;
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setAll": {
      const p = cmd.payload;
      if (!p || typeof p !== "object") return state;
      const ns = clone(state);
      // Filtrar estados inválidos mantiene la invariante del store aunque el
      // payload venga de un bundle antiguo o de una migración parcial. Las
      // convalidaciones se normalizan: las del formato viejo (la tabla del autor)
      // no pasan, que es justo lo que no debe restaurarse.
      const credits = {};
      for (const [code, status] of Object.entries(p.credits || {})) {
        if (isValidStatus(status)) credits[code] = status;
      }
      ns.progress = {
        credits: { ...ns.progress.credits, ...credits },
        equivalences: Array.isArray(p.equivalences) ? normalizeConvalidaciones(p.equivalences) : ns.progress.equivalences,
        fails: { ...(ns.progress.fails || {}), ...normalizeFails(p.fails) },
        plan: { ...ns.progress.plan, ...(p.plan || {}) },
        mencion: typeof p.mencion === "string" ? p.mencion : ns.progress.mencion,
        updatedAt: new Date().toISOString(),
      };
      return nextRev(ns);
    }
    default:
      return state;
  }
}

export function reduceConfigs(state, cmd) {
  return state;
}

// Tipos que los sub-reducers de abajo reconocen. Hace falta distinguir "tipo
// desconocido" (error de programación) de "tipo conocido que no cambia nada"
// (no-op legítimo: los pushes idempotentes de app.js devuelven el mismo
// estado para no re-serializar userState en IDB). Sin esta lista, cada
// saveState con la caché sin cambios avisaría "unknown command" por un
// comando perfectamente válido. Al añadir un case a un sub-reducer, añádelo
// aquí también.
const KNOWN_COMMANDS = new Set([
  "profile/setApellido", "profile/setTurno",
  "selection/toggleSubject", "selection/setGroups", "selection/setCuatrimestre", "selection/setAll", "selection/clear",
  "filters/add", "filters/remove", "filters/setWeight", "filters/setAll",
  "blocks/add", "blocks/remove", "blocks/setAll",
  "ui/setView", "ui/setCompareIds", "ui/toggleFavorite", "ui/setIgnoreDocents",
  "progress/setStatus", "progress/setCredit", "progress/setMencion", "progress/setConvalidaciones", "progress/setEstadoConvalidacion", "progress/setFails", "progress/setAll",
  "configs/save",
]);

export function reducer(state, cmd) {
  if (!state) state = initialState;
  let ns = reduceProfile(state, cmd);
  ns = reduceSelection(ns, cmd);
  ns = reduceFilters(ns, cmd);
  ns = reduceBlocks(ns, cmd);
  ns = reduceUI(ns, cmd);
  ns = reduceProgress(ns, cmd);
  ns = reduceConfigs(ns, cmd);
  if (ns === state && !KNOWN_COMMANDS.has(cmd.type)) {
    console.warn("[reducer] unknown command:", cmd.type);
  }
  return ns;
}