import { solve } from "./engine.js";

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "solve") return;
  const { problem, catalog, opts } = msg;
  try {
    const result = solve(problem, catalog, {
      ...opts,
      onNode: (stats) => self.postMessage({ type: "solver:progress", stats }),
      shouldStop: () => self.__ugrStop === true,
    });
    self.postMessage({ type: "solver:solution", result });
  } catch (err) {
    self.postMessage({ type: "solver:error", error: err?.message || String(err) });
  }
};

self.addEventListener("message", (event) => {
  if (event.data?.type === "solver:cancel") self.__ugrStop = true;
});
