import { isValidStatus, normalizeEstado } from "../progress/status.js";

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
  },
  propuestas: {
    items: [],
    activeId: null,
    vista: "oficial",
  },
  // Fuente canónica del progreso académico (ver src/progress/). commands.js
  // persiste userState en IndexedDB, así que este objeto es lo que se guarda.
  progress: {
    credits: {},
    equivalences: [],
    plan: { totalECTS: 240 },
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
      // Bulk-replace de la rebanada selection: la usa la migración legacy
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

export function reduceUI(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "ui/setView": {
      ns.ui.view = cmd.payload.view;
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
    default:
      return state;
  }
}

export function reducePropuestas(state, cmd) {
  const ns = clone(state);
  switch (cmd.type) {
    case "propuestas/save": {
      const { propuesta } = cmd.payload;
      const idx = ns.propuestas.items.findIndex((p) => p.id === propuesta.id);
      if (idx >= 0) ns.propuestas.items[idx] = propuesta;
      else ns.propuestas.items.push(propuesta);
      return nextRev(ns);
    }
    case "propuestas/delete": {
      ns.propuestas.items = ns.propuestas.items.filter((p) => p.id !== cmd.payload.id);
      if (ns.propuestas.activeId === cmd.payload.id) {
        ns.propuestas.activeId = ns.propuestas.items[0]?.id || null;
      }
      return nextRev(ns);
    }
    case "propuestas/setActive": {
      ns.propuestas.activeId = cmd.payload.id;
      return nextRev(ns);
    }
    case "propuestas/setVista": {
      ns.propuestas.vista = cmd.payload.vista;
      return nextRev(ns);
    }
    case "propuestas/setAll": {
      ns.propuestas.items = cmd.payload.items || [];
      ns.propuestas.activeId = ns.propuestas.items[0]?.id || null;
      return nextRev(ns);
    }
    default:
      return state;
  }
}

export function reduceProgress(state, cmd) {
  switch (cmd.type) {
    case "progress/setStatus":
    case "progress/setCredit": {
      // setCredit es el alias histórico de setStatus (mismo contrato
      // { code, status }). Estado inválido o sin cambios → no tocar: es
      // idempotente y evita writes en IDB al repetir el mismo comando.
      const { code, status } = cmd.payload || {};
      if (!code || !isValidStatus(status)) return state;
      if (state.progress.credits[code] === status) return state;
      const ns = clone(state);
      ns.progress.credits[code] = status;
      // updatedAt propio del progreso: lo usa buildMergePlan para decidir
      // qué versión gana al fusionar dos bundles.
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setMapping": {
      // Sin `mappings` en el payload se conservan las equivalencias previas:
      // el comando no debe destruir datos por un campo ausente.
      const mappings = cmd.payload?.mappings;
      const ns = clone(state);
      ns.progress.equivalences = Array.isArray(mappings) ? mappings : ns.progress.equivalences;
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setEquivalenceEstados": {
      // Upsert por id: existing → pone estado; nueva → append. El id es el de
      // la entrada en CONVALIDACIONES (igual que el formato legacy). Estados
      // inválidos se descartan (igual que progress/setAll con credits): una
      // ingesta o un bundle con basura no debe romper el store. Sin cambios →
      // no tocar: idempotente y sin writes en IDB al repetir el comando.
      const entries = cmd.payload?.entries;
      if (!Array.isArray(entries) || entries.length === 0) return state;
      const ns = clone(state);
      const list = ns.progress.equivalences;
      const indexById = new Map();
      list.forEach((e, i) => {
        if (e && e.id) indexById.set(String(e.id), i);
      });
      let changed = false;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const id = entry.id ? String(entry.id) : "";
        if (!id) continue;
        const estado = normalizeEstado(entry.estado);
        if (!estado) continue;
        const idx = indexById.get(id);
        if (idx !== undefined) {
          if (list[idx].estado === estado) continue;
          list[idx] = { ...list[idx], estado };
        } else {
          indexById.set(id, list.length);
          list.push({ ...entry, estado });
        }
        changed = true;
      }
      if (!changed) return state;
      ns.progress.updatedAt = new Date().toISOString();
      return nextRev(ns);
    }
    case "progress/setAll": {
      const p = cmd.payload;
      if (!p || typeof p !== "object") return state;
      const ns = clone(state);
      // Filtrar estados inválidos mantiene la invariante del store aunque el
      // payload venga de un bundle antiguo o de una migración parcial.
      const credits = {};
      for (const [code, status] of Object.entries(p.credits || {})) {
        if (isValidStatus(status)) credits[code] = status;
      }
      ns.progress = {
        credits: { ...ns.progress.credits, ...credits },
        equivalences: Array.isArray(p.equivalences) ? p.equivalences : ns.progress.equivalences,
        plan: { ...ns.progress.plan, ...(p.plan || {}) },
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
  "ui/setView", "ui/setCompareIds", "ui/toggleFavorite",
  "propuestas/save", "propuestas/delete", "propuestas/setActive", "propuestas/setVista", "propuestas/setAll",
  "progress/setStatus", "progress/setCredit", "progress/setMapping", "progress/setEquivalenceEstados", "progress/setAll",
  "configs/save",
]);

export function reducer(state, cmd) {
  if (!state) state = initialState;
  let ns = reduceProfile(state, cmd);
  ns = reduceSelection(ns, cmd);
  ns = reduceFilters(ns, cmd);
  ns = reduceBlocks(ns, cmd);
  ns = reduceUI(ns, cmd);
  ns = reducePropuestas(ns, cmd);
  ns = reduceProgress(ns, cmd);
  ns = reduceConfigs(ns, cmd);
  if (ns === state && !KNOWN_COMMANDS.has(cmd.type)) {
    console.warn("[reducer] unknown command:", cmd.type);
  }
  return ns;
}