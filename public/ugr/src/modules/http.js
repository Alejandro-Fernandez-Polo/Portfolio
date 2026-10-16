/**
 * Fecha límite para las peticiones de red.
 *
 * Una dependencia que **no contesta** es peor que una que falla: la petición se
 * queda colgada y, con ella, lo que la estaba esperando. Aquí se le pone plazo,
 * y el plazo cubre **todo** el intercambio —la respuesta y la lectura del
 * cuerpo—: un servidor que manda las cabeceras y luego se calla a mitad de un
 * dataset de 407 KB tampoco deja la app esperando.
 *
 * Son dos mecanismos a propósito: `abort()` libera la conexión de verdad, y la
 * carrera contra el reloj garantiza que el plazo se cumple **aunque** la
 * implementación de `fetch` ignore la señal (que es justo lo que hace un doble
 * de pruebas).
 *
 * No cambia los motivos que ya devuelven los adaptadores: quien no llega a
 * tiempo se trata como un fallo de red, así que la interfaz y sus mensajes se
 * quedan exactamente igual.
 */

/** Plazos por tamaño de lo que se descarga, en milisegundos. */
export const TIMEOUTS = {
  // El manifiesto es diminuto; si no llega, la app sigue con su catálogo.
  manifest: 8000,
  // 407 KB: ~1,2 s en 4G lenta, 15× de margen.
  dataset: 20000,
  // 691 KB.
  package: 20000,
};

/** El plazo agotado, distinguible del resto para poder registrarlo aparte. */
export class TimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(`la petición a ${url} pasó de ${timeoutMs} ms`);
    this.name = "TimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Ejecuta un intercambio con plazo. El intercambio recibe la **señal de aborto**
 * (para pasársela a `fetch`); si no termina a tiempo, se lanza `TimeoutError`.
 *
 * @template T
 * @param {string} url qué se está pidiendo (solo para el mensaje y el registro).
 * @param {number} timeoutMs plazo en milisegundos.
 * @param {(signal: AbortSignal|undefined) => Promise<T>} run el intercambio.
 * @returns {Promise<T>}
 */
export async function withDeadline(url, timeoutMs, run) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timer;
  const vencimiento = new Promise((_, rechazar) => {
    timer = setTimeout(() => {
      if (controller) controller.abort();
      rechazar(new TimeoutError(url, timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller ? controller.signal : undefined), vencimiento]);
  } finally {
    clearTimeout(timer);
  }
}
