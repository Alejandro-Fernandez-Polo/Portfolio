import { describe, it, expect } from "vitest";

import { escapeHtml } from "../../public/ugr/src/app/domain/text.js";

// El escapado de HTML es **un solo conocimiento**: tenía tres copias (el
// monolito, el panel de progreso y el asistente de importación) y ahora vive
// aquí. Lo que se fija es que escape lo que tiene que escapar y que no se le
// escape nada.

describe("escapeHtml", () => {
  it("escapa los cinco caracteres peligrosos", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;",
    );
  });

  it("no toca el texto que no lleva ninguno", () => {
    expect(escapeHtml("Sistemas Operativos · 2º curso")).toBe("Sistemas Operativos · 2º curso");
  });

  it("convierte a texto lo que no es cadena (números, null, undefined)", () => {
    expect(escapeHtml(6)).toBe("6");
    expect(escapeHtml(null)).toBe("null");
    expect(escapeHtml(undefined)).toBe("undefined");
    expect(escapeHtml(0)).toBe("0");
  });
});
