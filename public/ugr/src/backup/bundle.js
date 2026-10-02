import { get, getAll, isAvailable } from "../store/db.js";
import { getDeviceId } from "../store/commands.js";
import { sha256hex, encrypt, decrypt } from "./crypto.js";

export const FORMAT_VERSION = 1;
export const FORMAT_NAME = "ugr-backup";

export async function buildPayload(sections = ["userState", "configs", "progress", "reviews"]) {
  const payload = {};
  if (sections.includes("userState")) {
    payload.userState = await get("userState", "current");
  }
  if (sections.includes("configs")) {
    payload.configs = await getAll("configs");
  }
  if (sections.includes("progress")) {
    payload.progress = await get("progress", "main");
  }
  if (sections.includes("reviews")) {
    payload.reviews = await getAll("reviews");
  }
  payload.legacyRefs = {
    predefinedSource: localStorage.getItem("ugr-predefined-source") || "570",
    favorites: JSON.parse(localStorage.getItem("ugr-fav-predefined") || "[]"),
  };
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
    plan.actions.push({ section: "progress", action: "replace", data: incoming.progress });
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
    const cur = current.progress || { credits: {} };
    const inc = incoming.progress;
    const merged = { ...cur, ...inc, credits: { ...cur.credits, ...inc.credits } };
    plan.actions.push({ section: "progress", action: "replace", data: merged });
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

export async function applyPlan(plan) {
  const { transact, put } = await import("../store/db.js");
  await transact(["userState", "configs", "progress", "reviews"], async () => {
    for (const action of plan.actions) {
      if (action.action === "replace") {
        await put(action.section, action.data);
      } else if (action.action === "upsert") {
        await put(action.section, action.data);
      }
    }
  });
}