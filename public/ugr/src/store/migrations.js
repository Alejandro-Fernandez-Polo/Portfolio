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
];
