const handlers = new Map();
let inEmit = false;
const emitQueue = [];

function genId() {
  return crypto.randomUUID();
}

function makeEnvelope(type, payload, source) {
  return {
    type,
    payload,
    meta: {
      id: genId(),
      ts: Date.now(),
      schema: 1,
      source,
    },
  };
}

export function on(type, handler) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(handler);
  return () => off(type, handler);
}

export function once(type, handler) {
  const wrapper = (envelope) => {
    off(type, wrapper);
    handler(envelope);
  };
  return on(type, wrapper);
}

export function off(type, handler) {
  const list = handlers.get(type);
  if (!list) return;
  const idx = list.indexOf(handler);
  if (idx >= 0) list.splice(idx, 1);
}

export function emit(type, payload, source = "unknown") {
  const envelope = makeEnvelope(type, payload, source);
  const list = handlers.get(type) || [];
  if (inEmit) {
    emitQueue.push({ list: [...list], envelope });
    return;
  }
  inEmit = true;
  try {
    for (const handler of list) {
      try {
        handler(envelope);
      } catch (err) {
        console.error(`[bus] handler error for ${type}:`, err);
        emit("kernel:handlerError", { type, handlerName: handler.name, error: err }, "bus");
      }
    }
  } finally {
    inEmit = false;
    while (emitQueue.length) {
      const { list: qList, envelope: qEnv } = emitQueue.shift();
      for (const handler of qList) {
        try {
          handler(qEnv);
        } catch (err) {
          console.error(`[bus] queued handler error for ${qEnv.type}:`, err);
        }
      }
    }
  }
}

export function waitFor(type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      off(type, handler);
      reject(new Error(`timeout waiting for ${type}`));
    }, timeout);
    const handler = (envelope) => {
      clearTimeout(timer);
      off(type, handler);
      resolve(envelope);
    };
    on(type, handler);
  });
}

export const bus = { on, once, off, emit, waitFor };