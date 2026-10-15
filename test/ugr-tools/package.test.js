import { describe, it, expect } from "vitest";

import { buildPackage } from "../../tools/ugr-pipeline/build-package.mjs";
import { decrypt } from "../../public/ugr/src/backup/crypto.js";

// El paquete cifrado (I-11) se prueba con una contraseña de mentira: cifra
// `buildPackage`, descifra el MISMO módulo que usa el navegador
// (`src/backup/crypto.js`), y se comprueba que el criptograma no lleva nada en
// claro. La contraseña real del autor no pasa por aquí ni se guarda en ningún
// sitio: el artefacto del repositorio lo genera él desde `privado/`.

const PAYLOAD = {
  docents: [
    {
      key: "FFT-A",
      name: "Alba Delgado",
      subjectCode: "FFT",
      groupLetter: "A",
      profile: { dificultad: "cyan", razon: "", opinions: ["Explica con calma"] },
    },
  ],
  catalog: {
    meta: { university: "UGR", degree: "GI", plan: "2022", version: "2026-1" },
    subjects: [{ codigo: "FFT", cuatrimestre: 1, grupos: [] }],
  },
};

describe("buildPackage", () => {
  it("ida y vuelta: lo descifrado es exactamente lo que entró", async () => {
    const cipher = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    const plain = await decrypt(cipher, "contraseña-de-prueba");
    expect(JSON.parse(plain)).toEqual(PAYLOAD);
  });

  it("el criptograma tiene la forma que espera el navegador", async () => {
    const cipher = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    expect(cipher.v).toBe(1);
    expect(cipher.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(cipher.iv).toMatch(/^[0-9a-f]{24}$/);
    expect(typeof cipher.data).toBe("string");
    expect(cipher.data.length).toBeGreaterThan(0);
  });

  it("no lleva nada en claro: ni nombres, ni opiniones, ni la contraseña", async () => {
    const cipher = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    const serialized = JSON.stringify(cipher);
    expect(serialized).not.toContain("Alba Delgado");
    expect(serialized).not.toContain("Explica con calma");
    expect(serialized).not.toContain("contraseña-de-prueba");
    expect(serialized).not.toContain("FFT-A");
  });

  it("con otra contraseña no se abre", async () => {
    const cipher = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    await expect(decrypt(cipher, "otra-distinta")).rejects.toThrow("BAD_PASSPHRASE");
  });

  it("dos ejecuciones dan criptogramas distintos (sal y vector nuevos)", async () => {
    const a = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    const b = await buildPackage(PAYLOAD, "contraseña-de-prueba");
    expect(a.data).not.toBe(b.data);
    expect(a.salt).not.toBe(b.salt);
  });
});
