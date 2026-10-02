const modules = new Map();

function validateSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function satisfies(requirement, available) {
  const [, op, major] = requirement.match(/^([\^~]?)(\d+)/) || [];
  const availMajor = parseInt(available.split(".")[0], 10);
  const reqMajor = parseInt(major, 10);
  if (op === "^") return availMajor === reqMajor;
  if (op === "~") return availMajor === reqMajor;
  return availMajor === reqMajor;
}

function validateDefinition(def) {
  if (!def.id || !/^[a-z][a-z0-9-]*$/.test(def.id)) {
    throw new Error(`module invalid id: ${def.id}`);
  }
  if (modules.has(def.id)) {
    throw new Error(`module duplicated: ${def.id}`);
  }
  if (!def.version || !validateSemver(def.version)) {
    throw new Error(`module invalid version: ${def.id}@${def.version}`);
  }
  if (!def.api || typeof def.api !== "object") {
    throw new Error(`module missing api: ${def.id}`);
  }
  if (def.requires) {
    for (const req of def.requires) {
      const [reqId, reqVer] = req.split("@");
      const mod = modules.get(reqId);
      if (!mod) throw new Error(`module missing dependency: ${reqId} (required by ${def.id})`);
      if (!satisfies(reqVer, mod.version)) {
        throw new Error(`module incompatible dependency: ${def.id} requires ${req} but ${reqId}@${mod.version} registered`);
      }
    }
  }
}

export function registerModule(def) {
  validateDefinition(def);
  const mod = {
    id: def.id,
    version: def.version,
    api: def.api,
    requires: def.requires || [],
    publishes: def.publishes || [],
    subscribes: def.subscribes || [],
    start: def.start,
    stop: def.stop,
    state: "registered",
  };
  modules.set(def.id, mod);
  bus.emit("kernel:registered", { id: def.id, version: def.version });
  return mod.api;
}

export function getModule(id) {
  const mod = modules.get(id);
  return mod?.api || null;
}

export function hasModule(id) {
  return modules.has(id);
}

export function listModules() {
  return Array.from(modules.values()).map((m) => ({ id: m.id, version: m.version, state: m.state }));
}

export function assertDeps() {
  for (const mod of modules.values()) {
    if (mod.requires) {
      for (const req of mod.requires) {
        const [reqId] = req.split("@");
        if (!modules.has(reqId)) {
          throw new Error(`missing dependency: ${reqId} (required by ${mod.id})`);
        }
      }
    }
  }
}

export async function startAll(bus) {
  const sorted = topologicalSort();
  for (const mod of sorted) {
    if (mod.start) {
      mod.state = "starting";
      await mod.start(bus);
      mod.state = "started";
    }
  }
}

export async function stopAll() {
  const sorted = [...modules.values()].reverse();
  for (const mod of sorted) {
    if (mod.stop) {
      mod.state = "stopping";
      await mod.stop();
      mod.state = "stopped";
    }
  }
}

function topologicalSort() {
  const visited = new Set();
  const result = [];
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const mod = modules.get(id);
    if (mod?.requires) {
      for (const req of mod.requires) {
        visit(req.split("@")[0]);
      }
    }
    result.push(mod);
  }
  for (const id of modules.keys()) visit(id);
  return result;
}

import { bus } from "./bus.js";