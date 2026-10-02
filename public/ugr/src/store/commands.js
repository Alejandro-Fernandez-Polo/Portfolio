import { open, put, get, transact, isAvailable } from "./db.js";
import { reducer, initialState } from "./reducer.js";

let currentState = null;
let persistTimer = null;
const subscribers = new Set();
let deviceId = "";

function genDeviceId() {
  return crypto.randomUUID();
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (!isAvailable()) return;
    try {
      await put("userState", { key: "current", ...currentState });
    } catch (err) {
      console.error("[store] persist failed:", err);
      setTimeout(schedulePersist, 1000);
    }
  }, 250);
}

function notify() {
  for (const h of subscribers) {
    try {
      h(currentState);
    } catch (err) {
      console.error("[store] subscriber error:", err);
    }
  }
}

export async function initStore() {
  await open();
  if (isAvailable()) {
    const stored = await get("userState", "current");
    if (stored) {
      currentState = { ...initialState, ...stored };
    } else {
      currentState = { ...initialState, deviceId: genDeviceId() };
      await put("userState", { key: "current", ...currentState });
    }
    deviceId = currentState.deviceId || genDeviceId();
    if (!currentState.deviceId) {
      currentState.deviceId = deviceId;
      await put("userState", { key: "current", ...currentState });
    }
  } else {
    currentState = { ...initialState, deviceId: genDeviceId() };
  }
  return currentState;
}

export function getState() {
  return currentState ? Object.freeze({ ...currentState }) : null;
}

export function subscribe(handler) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

export function dispatch(cmd) {
  if (!currentState) return;
  const ns = reducer(currentState, cmd);
  if (ns !== currentState) {
    currentState = ns;
    notify();
    schedulePersist();
  }
}

export async function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!isAvailable() || !currentState) return;
  try {
    await put("userState", { key: "current", ...currentState });
  } catch (err) {
    console.error("[store] flush failed:", err);
  }
}

export async function applyCommandsInTransaction(commands) {
  if (!isAvailable()) throw new Error("IDB_UNSUPPORTED");
  await transact(["userState"], async () => {
    for (const cmd of commands) {
      currentState = reducer(currentState, cmd);
    }
    await put("userState", { key: "current", ...currentState });
  });
  notify();
}

export function getDeviceId() {
  return deviceId;
}