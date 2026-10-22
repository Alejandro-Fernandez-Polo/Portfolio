import { describe, it, expect } from "vitest";

import {
  OPINIONES_FICTICIAS,
  esOpinionFicticia,
  opinionesFicticias,
} from "../../tools/ugr-pipeline/sample-opinions.js";

// Las opiniones de la muestra son de ejemplo y lo dice la interfaz. Aquí se fija
// la otra mitad del contrato: que salgan siempre del repertorio inventado, que
// no cambien entre ejecuciones y que no parezcan una plantilla.

describe("opiniones de ejemplo", () => {
  it("salen del repertorio y nunca hay repetidas", () => {
    for (const nombre of ["Ana Ruiz", "Pedro Cartujo", "Marta Gómez", "Luis Vera"]) {
      const opiniones = opinionesFicticias({ subjectCode: "FFT", modalidad: "Teoría", name: nombre });
      expect(opiniones.length).toBeLessThanOrEqual(2);
      expect(new Set(opiniones).size).toBe(opiniones.length);
      for (const texto of opiniones) expect(esOpinionFicticia(texto)).toBe(true);
    }
  });

  it("son estables: la misma terna da siempre lo mismo", () => {
    const perfil = { subjectCode: "SO", modalidad: "Prácticas", name: "Miguel Lastra Leidinger" };
    expect(opinionesFicticias(perfil)).toEqual(opinionesFicticias(perfil));
    // Y la modalidad cuenta: teoría y prácticas de la misma persona no se mezclan.
    expect(opinionesFicticias({ ...perfil, modalidad: "Teoría" })).toEqual(
      opinionesFicticias({ ...perfil, modalidad: "Teoría" }),
    );
  });

  it("reparte: hay perfiles con una, con dos y sin ninguna", () => {
    const cuentas = new Set();
    for (let i = 0; i < 40; i++) {
      cuentas.add(
        opinionesFicticias({ subjectCode: "FFT", modalidad: "Teoría", name: `Persona ${i}` }).length,
      );
    }
    expect(cuentas.has(0)).toBe(true);
    expect(cuentas.has(1)).toBe(true);
    expect(cuentas.has(2)).toBe(true);
  });

  it("reconoce solo el repertorio", () => {
    expect(esOpinionFicticia(OPINIONES_FICTICIAS[0])).toBe(true);
    expect(esOpinionFicticia("Un texto cualquiera que no está en la lista.")).toBe(false);
    expect(esOpinionFicticia(undefined)).toBe(false);
  });
});
