import { describe, it, expect } from "vitest";

import {
  bytesToBase64,
  base64ToBytes,
  decrypt,
  encrypt,
} from "../../public/ugr/src/backup/crypto.js";

// Caracterización de `src/backup/crypto.js`: lo usan el backup del usuario y el
// paquete cifrado de /ugr, así que el formato (`v/salt/iv/data`) y el tamaño que
// aguanta son contrato. El caso grande es una regresión con nombre y apellidos:
// `String.fromCharCode(...bytes)` desbordaba la pila con payloads de ~300 KB y el
// paquete real (128 KB de texto) no se podía generar.

describe("crypto del backup", () => {
  it("ida y vuelta con texto corto", async () => {
    const cipher = await encrypt("hola 🙂", "clave");
    expect(await decrypt(cipher, "clave")).toBe("hola 🙂");
  });

  it("ida y vuelta con un payload grande (128 KB, como el paquete real)", async () => {
    const big = JSON.stringify({ data: "á".repeat(100000) });
    const cipher = await encrypt(big, "clave-larga");
    expect(await decrypt(cipher, "clave-larga")).toBe(big);
  });

  it("con otra contraseña no se abre", async () => {
    const cipher = await encrypt("secreto", "clave");
    await expect(decrypt(cipher, "otra")).rejects.toThrow("BAD_PASSPHRASE");
  });

  it("rechaza un formato que no sea v1", async () => {
    await expect(decrypt({ v: 2, salt: "", iv: "", data: "" }, "clave")).rejects.toThrow("BAD_FORMAT");
  });

  it("convierte a base64 y vuelta sin perder bytes", () => {
    const bytes = new Uint8Array(70000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});
