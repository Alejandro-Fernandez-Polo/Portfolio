import { describe, it, expect } from "vitest";

import {
  CONFIG_SLOT_KEYS,
  CONFIG_STORAGE_SLOTS,
  configSlotKey,
} from "../../public/ugr/src/store/configSlots.js";
import { createPersistenceAdapter } from "../../public/ugr/src/app/adapters/persistence.js";
import { LEGACY_KEYS } from "../../public/ugr/src/migrate/legacyKeys.js";

// El invariante que la fase 6 dejó por escrito: **quien escribe las ranuras y
// quien las lee al migrar usan las mismas claves**. Antes eran tres copias del
// mismo conocimiento (adaptador, migración y herramientas) y bastaba cambiar una
// para que la migración dejara de encontrar nada, en silencio.

/** Almacenamiento de mentira, solo para leer qué claves se escriben. */
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
    claves: () => [...data.keys()].sort(),
  };
}

describe("ranuras de las configuraciones guardadas", () => {
  it("el número de ranuras y la forma de la clave son una sola fuente", () => {
    expect(CONFIG_STORAGE_SLOTS).toBe(3);
    expect(CONFIG_SLOT_KEYS).toEqual([
      "ugr-horario-saved-configs-0",
      "ugr-horario-saved-configs-1",
      "ugr-horario-saved-configs-2",
    ]);
    expect(configSlotKey(1)).toBe("ugr-horario-saved-configs-1");
  });

  it("la migración lee exactamente las claves que el adaptador escribe", () => {
    const storage = fakeStorage();
    const adapter = createPersistenceAdapter({ storage });
    // Cuatro configuraciones: reparten round-robin por las tres ranuras.
    adapter.saveAllConfigs([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    expect(storage.claves()).toEqual([...CONFIG_SLOT_KEYS].sort());

    const enMigracion = LEGACY_KEYS.filter((e) => e.dest === "configs" && e.transform === "configs")
      .map((e) => e.key);
    expect(enMigracion).toEqual(CONFIG_SLOT_KEYS);
  });

  it("borrar las ranuras las deja todas vacías (lo pide «restaurar por defecto»)", () => {
    const storage = fakeStorage();
    const adapter = createPersistenceAdapter({ storage });
    adapter.saveAllConfigs([{ id: 1 }, { id: 2 }]);
    expect(storage.claves()).toHaveLength(2);

    adapter.clearSavedConfigs();
    expect(storage.claves()).toEqual([]);
  });
});
