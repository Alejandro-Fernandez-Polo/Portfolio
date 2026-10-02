export const LEGACY_KEYS = [
  { key: "ugr-horario-state", type: "json", dest: "userState", transform: "state" },
  { key: "ugr-horario-saved-configs-0", type: "json", dest: "configs", transform: "configs", slot: 0 },
  { key: "ugr-horario-saved-configs-1", type: "json", dest: "configs", transform: "configs", slot: 1 },
  { key: "ugr-horario-saved-configs-2", type: "json", dest: "configs", transform: "configs", slot: 2 },
  { key: "ugr-propuestas", type: "json", dest: "userState", transform: "propuestas" },
  { key: "ugr-propuestas-guardadas", type: "json", dest: "configs", transform: "propuestasInternas" },
  { key: "ugr-convalidaciones", type: "json", dest: "progress", transform: "convalidaciones" },
  { key: "ugr-horario-subjects", type: "json", dest: "legacy", transform: "subjectSnapshot" },
  { key: "ugr-predefined-source", type: "string", dest: "userState", transform: "predefinedSource" },
  { key: "ugr-fav-predefined", type: "json", dest: "userState", transform: "favPredefined" },
];

export const DESTINIES = ["userState", "configs", "progress", "legacy", "meta"];

function dedupeConfigs(configs) {
  const seen = new Map();
  for (const c of configs) {
    const key = c.id || JSON.stringify(c);
    if (!seen.has(key) || (c.updatedAt && new Date(c.updatedAt) > new Date(seen.get(key).updatedAt))) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

export function buildPlan(legacy) {
  const commands = [];
  const stats = { configs: 0, propuestas: 0, convalidaciones: 0 };

  if (legacy["ugr-horario-state"]) {
    const s = legacy["ugr-horario-state"];
    if (s.selectedSubjects) {
      commands.push({ type: "selection/setAll", payload: { selectedSubjects: s.selectedSubjects } });
    }
    if (s.groupChoices) {
      for (const [code, groups] of Object.entries(s.groupChoices)) {
        commands.push({ type: "selection/setGroups", payload: { code, ...groups } });
      }
    }
    if (s.apellido !== undefined) {
      commands.push({ type: "profile/setApellido", payload: { apellido: s.apellido } });
    }
    if (s.turnoPreferente) {
      commands.push({ type: "profile/setTurno", payload: { turno: s.turnoPreferente } });
    }
    if (s.cuatrimestreActivo) {
      commands.push({ type: "selection/setCuatrimestre", payload: { cuatrimestre: s.cuatrimestreActivo } });
    }
    if (s.propuestas && s.propuestas.length) {
      commands.push({ type: "propuestas/setAll", payload: { items: s.propuestas } });
      stats.propuestas = s.propuestas.length;
    }
    if (s.propuestaActivaId) {
      commands.push({ type: "propuestas/setActive", payload: { id: s.propuestaActivaId } });
    }
    if (s.vistaConvalidaciones) {
      commands.push({ type: "propuestas/setVista", payload: { vista: s.vistaConvalidaciones } });
    }
  }

  const allConfigs = [];
  for (let i = 0; i < 3; i++) {
    const key = `ugr-horario-saved-configs-${i}`;
    if (legacy[key] && Array.isArray(legacy[key])) {
      allConfigs.push(...legacy[key].map((c) => ({ ...c, origin: "legacy", slot: i })));
    }
  }
  if (legacy["ugr-propuestas-guardadas"] && Array.isArray(legacy["ugr-propuestas-guardadas"])) {
    allConfigs.push(...legacy["ugr-propuestas-guardadas"].map((c) => ({ ...c, tag: "propuesta-interna", origin: "legacy" })));
  }
  const uniqueConfigs = dedupeConfigs(allConfigs);
  for (const c of uniqueConfigs) {
    commands.push({ type: "configs/save", payload: { config: c } });
  }
  stats.configs = uniqueConfigs.length;

  if (legacy["ugr-propuestas"] && Array.isArray(legacy["ugr-propuestas"])) {
    commands.push({ type: "propuestas/setAll", payload: { items: legacy["ugr-propuestas"] } });
    stats.propuestas = legacy["ugr-propuestas"].length;
  }

  if (legacy["ugr-convalidaciones"]) {
    const credits = {};
    for (const [code, status] of Object.entries(legacy["ugr-convalidaciones"])) {
      credits[code] = status;
    }
    commands.push({ type: "progress/setAll", payload: { credits } });
    stats.convalidaciones = Object.keys(credits).length;
  }

  if (legacy["ugr-predefined-source"]) {
    commands.push({ type: "ui/setPredefinedSource", payload: { source: legacy["ugr-predefined-source"] } });
  }

  if (legacy["ugr-fav-predefined"] && Array.isArray(legacy["ugr-fav-predefined"])) {
    const favs = legacy["ugr-fav-predefined"].map((id) => `predefined:${id}`);
    commands.push({ type: "ui/setCompareIds", payload: { ids: favs } });
  }

  return { commands, stats };
}

export async function snapshotAllKeys(db) {
  const snapshot = {};
  for (const { key } of LEGACY_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) {
      snapshot[key] = val;
      try {
        await db.put("legacy", { key, value: val, snappedAt: new Date().toISOString() });
      } catch (e) {
        console.warn("[migrate] failed to snapshot", key, e);
      }
    }
  }
  return snapshot;
}

export async function alreadyMigrated(db) {
  const meta = await db.get("meta", "migration:legacy-v1");
  return !!meta;
}

export async function markMigration(db) {
  await db.put("meta", { key: "migration:legacy-v1", appliedAt: new Date().toISOString(), version: 1 });
}

export async function verify(db, plan) {
  const state = await db.get("userState", "current");
  if (!state) throw new Error("userState not found after migration");

  if (plan.stats.configs > 0) {
    const configs = await db.getAll("configs");
    if (configs.length !== plan.stats.configs) {
      throw new Error(`config count mismatch: expected ${plan.stats.configs}, got ${configs.length}`);
    }
  }

  const legacyState = JSON.parse(localStorage.getItem("ugr-horario-state") || "{}");
  if (legacyState.selectedSubjects) {
    const expected = Object.keys(legacyState.selectedSubjects).sort();
    const actual = Object.keys(state.selection.selectedSubjects || {}).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error("selectedSubjects mismatch after migration");
    }
  }
}

export async function restoreFromSnapshot(db) {
  const items = await db.getAll("legacy");
  for (const item of items) {
    localStorage.setItem(item.key, item.value);
  }
}

export function scheduleDoubleWrite() {
  let doubleWriteCount = 0;
  const originalDispatch = window.__ugrLegacy?.dispatch;
  if (originalDispatch) {
    window.__ugrLegacy.dispatch = function (cmd) {
      const result = originalDispatch.apply(this, arguments);
      if (doubleWriteCount < 2) {
        saveToLegacy(cmd);
      }
      return result;
    };
  }
}

function saveToLegacy(cmd) {
  const state = window.__ugrLegacy?.getState?.();
  if (state) {
    localStorage.setItem("ugr-horario-state", JSON.stringify(state));
  }
}

export async function cleanupLegacy() {
  for (const { key } of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}