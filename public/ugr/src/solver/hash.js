import { catalogVersion } from "./catalog.js";
import { buildDomains } from "./engine.js";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

export function canonicalJSON(value) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function problemHash(problem, catalog, weights) {
  const { domains } = buildDomains(problem, catalog);
  const domainSig = domains
    .map((d) => ({
      code: d.code,
      values: d.values.map((v) => `${v.teoria}:${v.practica ?? ""}`).sort(),
    }))
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  const filters = (problem.filters || []).map((f) => ({
    type: f.type,
    value: f.value,
    weight: f.weight,
    hard: f.hard,
  }));
  const payload = canonicalJSON({
    subjects: [...(problem.subjects || [])].sort(),
    filters,
    domains: domainSig,
    weights: weights || {},
    docentScores: problem.docentScores || {},
    catalogVersion: problem.catalogVersion || catalogVersion(catalog),
  });
  return sha256Hex(payload);
}
