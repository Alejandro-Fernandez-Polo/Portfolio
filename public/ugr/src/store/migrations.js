import { SCOPE_PERSONAL, reviewId } from "./scope.js";

export const SCHEMA_MIGRATIONS = [
  {
    version: 1,
    name: "initial_stores",
    up: async (tx) => {
    },
  },
  {
    version: 2,
    name: "catalogs-store",
    up: async (tx) => {
      const active = await tx.table("meta").get("activeCatalog");
      if (!active) {
        await tx.table("meta").put({
          key: "activeCatalog",
          value: "UGR/GI/legacy-1",
          updatedAt: new Date().toISOString(),
        });
      }
    },
  },
  {
    version: 3,
    name: "scope-worlds",
    up: async (tx) => {
      // Lo que hubiera se lee como **personal**: son los datos del usuario, no
      // la muestra, y estamparlos con el mundo al que pertenecen evita que un
      // cambio de mundo posterior los esconda.
      const reviews = await tx.table("reviews").toArray();
      const mudadas = reviews
        .filter((row) => row && row.docentKey)
        .map((row) => ({
          ...row,
          id: reviewId(SCOPE_PERSONAL, row.docentKey),
          scope: SCOPE_PERSONAL,
        }));
      if (mudadas.length) {
        await tx.table("ownReviews").bulkPut(mudadas);
        await tx.table("reviews").clear();
      }

      const configs = await tx.table("configs").toArray();
      for (const row of configs) {
        if (!row || !row.id || row.scope) continue;
        await tx.table("configs").put({ ...row, scope: SCOPE_PERSONAL });
      }
    },
  },
];
