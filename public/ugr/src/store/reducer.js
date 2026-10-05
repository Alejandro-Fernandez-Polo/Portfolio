import { isValidStatus } from "../progress/status.js";

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
  ui: {
    view: "horario",
    compareIds: [],
    favorites: [],
    predefinedSource: "570",
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
      ns.profile.apellido = cmd.payload.apellido || "";
      return nextRev(ns);
    }
    case "profile/setTurno": {
      ns.profile.turnoPreferente = cmd.payload.turno || "indiferente";
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
    case "ui/setPredefinedSource": {
      ns.ui.predefinedSource = cmd.payload.source;
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

export function reducer(state, cmd) {
  if (!state) state = initialState;
  let ns = reduceProfile(state, cmd);
  ns = reduceSelection(ns, cmd);
  ns = reduceFilters(ns, cmd);
  ns = reduceUI(ns, cmd);
  ns = reducePropuestas(ns, cmd);
  ns = reduceProgress(ns, cmd);
  ns = reduceConfigs(ns, cmd);
  if (ns === state) {
    console.warn("[reducer] unknown command:", cmd.type);
  }
  return ns;
}