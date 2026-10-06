import { get, getAll, isAvailable } from "../store/db.js";
import { getDeviceId } from "../store/commands.js";
import { sha256hex, encrypt, decrypt } from "./crypto.js";

export const FORMAT_VERSION = 1;
export const FORMAT_NAME = "ugr-backup";

export async function buildPayload(sections = ["userState", "configs", "progress", "reviews"]) {
  const payload = {};
  let userState;
  if (sections.includes("userState")) {
    userState = await get("userState", "current");
    payload.userState = userState;
  }
  if (sections.includes("configs")) {
    payload.configs = await getAll("configs");
  }
  if (sections.includes("progress")) {
    // El progreso canónico vive en userState.progress (single-writer). La
    // tabla `progress` solo se consulta como fallback de backups anteriores
    // a la Fase 5, cuando el progreso se guardaba en esa tabla suelta.
    if (!userState) userState = await get("userState", "current");
    const canonical = userState?.progress;
    payload.progress = canonical || (await get("progress", "main"));
  }
  if (sections.includes("reviews")) {
    payload.reviews = await getAll("reviews");
  }
  return payload;
}

export async function exportBundle({ sections, passphrase, pretty = false } = {}) {
  if (!isAvailable()) throw new Error("IDB_UNSUPPORTED");

  const payload = await buildPayload(sections);
  const json = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  const hash = await sha256hex(json);

  let body = payload;
  if (passphrase) {
    body = await encrypt(json, passphrase);
  }

  const bundle = {
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    schema: 1,
    integrity: { alg: "SHA-256", hash },
    payload: body,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ugr-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.ugrbackup`;
  a.click();
  URL.revokeObjectURL(url);

  return { bundle, stats: { configs: payload.configs?.length || 0, size: blob.size } };
}

export function validateBundle(text) {
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: ["formato inválido: no es JSON válido"] };
  }

  if (parsed.format !== FORMAT_NAME) errors.push("no es un backup UGR");
  if (parsed.formatVersion > FORMAT_VERSION) errors.push("backup de versión futura");
  if (!parsed.payload) errors.push("payload ausente");
  if (!parsed.integrity?.hash) errors.push("integridad ausente");

  return { ok: errors.length === 0, errors, parsed };
}

async function getPlaintextPayload(parsed, passphrase) {
  if (typeof parsed.payload === "object" && parsed.payload.v === 1) {
    if (!passphrase) throw new Error("BAD_PASSPHRASE");
    const json = await decrypt(parsed.payload, passphrase);
    return JSON.parse(json);
  }
  return parsed.payload;
}

export async function importBundle(file, { passphrase, strategy = "merge" } = {}) {
  const text = await file.text();
  const validation = validateBundle(text);
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  const payload = await getPlaintextPayload(validation.parsed, passphrase);
  const current = await buildPayload();

  const plan = buildMergePlan(current, payload, strategy);

  return { plan, payload };
}

export function buildMergePlan(current, incoming, strategy) {
  const plan = { actions: [] };

  if (strategy === "replace") {
    plan.actions.push({ section: "userState", action: "replace", data: incoming.userState });
    plan.actions.push({ section: "configs", action: "replace", data: incoming.configs });
    if (incoming.progress) {
      plan.actions.push({ section: "progress", action: "replace", data: incoming.progress });
    }
    plan.actions.push({ section: "reviews", action: "replace", data: incoming.reviews });
    return plan;
  }

  if (incoming.userState) {
    const cur = current.userState || {};
    const inc = incoming.userState;
    if (!cur.rev || (inc.rev && inc.rev > cur.rev) || (inc.updatedAt && new Date(inc.updatedAt) > new Date(cur.updatedAt))) {
      plan.actions.push({ section: "userState", action: "replace", data: inc });
    }
  }

  if (incoming.configs && Array.isArray(incoming.configs)) {
    const curMap = new Map((current.configs || []).map((c) => [c.id, c]));
    for (const inc of incoming.configs) {
      const existing = curMap.get(inc.id);
      if (!existing || (inc.updatedAt && new Date(inc.updatedAt) > new Date(existing.updatedAt))) {
        plan.actions.push({ section: "configs", action: "upsert", data: inc });
      }
    }
  }

  if (incoming.progress) {
    // El progreso no lleva rev propio: se fusiona por updatedAt (lo escribe
    // el reducer en cada comando de progreso). Si el incoming es más reciente
    // gana entero; si no, se hace unión de credits con el incoming ganando
    // por código, igual que configs/reviews.
    const cur = current.progress || {};
    const inc = incoming.progress;
    const curTs = Date.parse(cur.updatedAt || "") || 0;
    const incTs = Date.parse(inc.updatedAt || "") || 0;
    if (incTs > curTs) {
      plan.actions.push({ section: "progress", action: "replace", data: inc });
    } else {
      const merged = {
        ...cur,
        ...inc,
        credits: { ...(cur.credits || {}), ...(inc.credits || {}) },
        equivalences: inc.equivalences || cur.equivalences || [],
        plan: { ...(cur.plan || {}), ...(inc.plan || {}) },
        updatedAt: new Date().toISOString(),
      };
      if (JSON.stringify(merged) !== JSON.stringify(cur)) {
        plan.actions.push({ section: "progress", action: "replace", data: merged });
      }
    }
  }

  if (incoming.reviews && Array.isArray(incoming.reviews)) {
    const curMap = new Map((current.reviews || []).map((r) => [r.docentKey, r]));
    for (const inc of incoming.reviews) {
      const existing = curMap.get(inc.docentKey);
      if (!existing || (inc.updatedAt && new Date(inc.updatedAt) > new Date(existing.updatedAt))) {
        plan.actions.push({ section: "reviews", action: "upsert", data: inc });
      }
    }
  }

  return plan;
}

// Las acciones de progreso no escriben en la tabla `progress`: se vuelcan
// en userState vía comandos del store (single-writer), igual que hace la UI.
function progressActionToCommand(action) {
  if (action.action === "replace") {
    return { type: "progress/setAll", payload: action.data };
  }
  if (action.action === "upsert" && action.data?.code) {
    return { type: "progress/setStatus", payload: { code: action.data.code, status: action.data.status } };
  }
  return null;
}

export async function applyPlan(plan) {
  const { transact, put } = await import("../store/db.js");
  const { applyCommandsInTransaction } = await import("../store/commands.js");
  const progressCommands = plan.actions
    .filter((a) => a.section === "progress")
    .map(progressActionToCommand)
    .filter(Boolean);
  const otherActions = plan.actions.filter((a) => a.section !== "progress");
  if (otherActions.length > 0) {
    await transact(["userState", "configs", "reviews"], async () => {
      for (const action of otherActions) {
        await put(action.section, action.data);
      }
    });
  }
  if (progressCommands.length > 0) {
    await applyCommandsInTransaction(progressCommands);
  }
}