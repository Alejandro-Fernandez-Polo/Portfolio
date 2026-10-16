import { afterEach, describe, expect, it, vi } from "vitest";

import { TIMEOUTS, TimeoutError, withDeadline } from "../../public/ugr/src/modules/http.js";

// La fecha límite de las peticiones de red. Lo que se fija aquí: el valor se
// devuelve cuando llega a tiempo, el plazo **corta** lo que no llega, la señal
// se pasa al intercambio (para que la conexión se aborte de verdad) y no se
// confunde un plazo agotado con otro fallo.

describe("withDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("devuelve el resultado cuando el intercambio termina a tiempo", async () => {
    const res = await withDeadline("https://x/formacion.json", 1000, async () => "vale");

    expect(res).toBe("vale");
  });

  it("pasa la señal al intercambio, para que la conexión se aborte de verdad", async () => {
    let vista;
    await withDeadline("https://x/formacion.json", 1000, async (signal) => {
      vista = signal;
      return 1;
    });

    expect(vista).toBeInstanceOf(AbortSignal);
  });

  it("lo que no contesta nunca lanza TimeoutError y deja la señal abortada", async () => {
    vi.useFakeTimers();
    let senal;
    const pendiente = withDeadline("https://x/formacion.json", 5000, (signal) => {
      senal = signal;
      return new Promise(() => {});
    });
    const comprobacion = expect(pendiente).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await comprobacion;

    expect(senal.aborted).toBe(true);
  });

  it("el plazo agotado se distingue: el mensaje dice qué y cuánto", async () => {
    vi.useFakeTimers();
    const pendiente = withDeadline("https://x/paquete.enc.json", 5, () => new Promise(() => {}));
    const comprobacion = pendiente.catch((err) => err);

    await vi.advanceTimersByTimeAsync(5);
    const err = await comprobacion;

    expect(err.name).toBe("TimeoutError");
    expect(err.url).toBe("https://x/paquete.enc.json");
    expect(err.timeoutMs).toBe(5);
  });

  it("un intercambio que falla por otra razón propaga su fallo, no un TimeoutError", async () => {
    await expect(
      withDeadline("https://x/formacion.json", 1000, async () => {
        throw new Error("sin red");
      }),
    ).rejects.toThrow("sin red");
  });

  it("cumple el plazo aunque el intercambio ignore la señal (un doble de pruebas)", async () => {
    vi.useFakeTimers();
    // Un `fetch` de mentira que ni mira la señal: sin la carrera contra el reloj,
    // esto dejaría la promesa colgada para siempre.
    const pendiente = withDeadline("https://x/formacion.json", 3000, async () => new Promise(() => {}));
    const comprobacion = expect(pendiente).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(3000);
    await comprobacion;
  });

  it("no deja temporizadores vivos al terminar", async () => {
    vi.useFakeTimers();

    await withDeadline("https://x/formacion.json", 5000, async () => "vale");

    expect(vi.getTimerCount()).toBe(0);
  });

  it("los tres plazos existen, son finitos y el del manifiesto es el más corto", () => {
    const plazos = Object.values(TIMEOUTS);

    expect(plazos.every((ms) => Number.isFinite(ms) && ms > 0)).toBe(true);
    expect(TIMEOUTS.manifest).toBeLessThan(TIMEOUTS.dataset);
  });
});
