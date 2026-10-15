/**
 * Cabecera pegajosa en las tablas largas.
 *
 * Una tabla que ocupa más de vez y media la ventana se recorre a ciegas: al
 * bajar se pierde de vista qué es cada columna. Para esas se marca su
 * contenedor y la cabecera se queda pegada; en las cortas no se toca, porque
 * el sticky deja una franja muerta al llegar a la sección siguiente.
 *
 * El detalle que hace falta entender: el contenedor de las tablas
 * (`.manage-table-wrapper`) desplaza en horizontal con `overflow-x: auto`, y
 * **cualquier** ancestro con `overflow` distinto de `visible` crea un
 * contenedor de scroll. La cabecera se pegaría a ese contenedor, que no se
 * mueve, así que el sticky no haría nada. Por eso, cuando la tabla cabe a lo
 * ancho, al contenedor se le quita el scroll (`is-tall` → `overflow: visible`)
 * y la cabecera se pega a la ventana; cuando no cabe —pantallas estrechas— se
 * le pone tope de alto (`is-tall-scroll`), el contenedor desplaza también en
 * vertical y la cabecera se pega dentro de él, sin perder el scroll
 * horizontal.
 *
 * Sin DOM propio: el documento y la ventana llegan por parámetro para poder
 * probarlo, y todo se mide, no se adivina (alto de la tabla contra el de la
 * ventana, ancho de la tabla contra el del contenedor).
 */

/** Una tabla es «larga» a partir de vez y media la altura de la ventana. */
export const RATIO_LARGA = 1.5;

function raizDe(doc) {
  if (doc) return doc;
  return typeof document !== "undefined" ? document : null;
}

function ventanaDe(win) {
  if (win) return win;
  return typeof window !== "undefined" ? window : null;
}

/**
 * Marca las tablas largas para que su cabecera se quede pegada.
 *
 * @param {Object} [deps] dependencias, todas opcionales.
 * @param {Document} [deps.document] documento donde buscar las tablas.
 * @param {Window} [deps.window] ventana de la que sale la altura de referencia.
 * @param {number} [deps.ratio] veces la ventana a partir de las cuales una
 *   tabla se considera larga.
 * @returns {{refresh: () => void, destroy: () => void}} `refresh` vuelve a
 *   medir (lo usan los cambios de pestaña y el redimensionado).
 */
export function setupStickyHeaders({ document: doc, window: win, ratio = RATIO_LARGA } = {}) {
  const raiz = raizDe(doc);
  const ventana = ventanaDe(win);
  if (!raiz || typeof raiz.querySelectorAll !== "function") {
    return { refresh() {}, destroy() {} };
  }

  function refresh() {
    const altoVentana = ventana?.innerHeight || 0;
    if (!altoVentana) return;
    for (const table of raiz.querySelectorAll("table")) {
      const padre = table.parentElement;
      // Solo el contenedor de las tablas gestionadas lleva el scroll
      // horizontal; en las demás (calendario, asistente) el contenedor es la
      // propia tabla y no hay nada que quitarle.
      const conWrapper = Boolean(
        padre && padre.classList && padre.classList.contains("manage-table-wrapper"),
      );
      const contenedor = conWrapper ? padre : table;
      const larga = table.getBoundingClientRect().height > ratio * altoVentana;
      const cabe = table.scrollWidth <= (contenedor.clientWidth || 0) + 1;
      contenedor.classList.toggle("is-tall", larga && cabe);
      contenedor.classList.toggle("is-tall-scroll", larga && !cabe);
    }
  }

  let pendiente = false;
  function programar() {
    if (pendiente) return;
    pendiente = true;
    const siguiente = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    siguiente(() => {
      pendiente = false;
      refresh();
    });
  }

  // Las vistas se repintan con innerHTML: el contenedor marcado desaparece y
  // hay que volver a medir. Se observan solo los nodos (childList), no los
  // atributos, para que el propio toggle de clase no realimente al observador.
  let observer = null;
  if (typeof MutationObserver === "function") {
    observer = new MutationObserver(programar);
    const objetivo = raiz.body || raiz.documentElement || raiz;
    observer.observe(objetivo, { childList: true, subtree: true });
  }

  // Cambiar de pestaña no añade nodos (solo alterna `display`), así que el
  // observador no lo vería: se escucha el clic y se remide en el siguiente
  // frame, cuando la vista ya está visible y tiene alto.
  function alPulsar(event) {
    const objetivo = event && event.target;
    if (objetivo && typeof objetivo.closest === "function" && objetivo.closest(".nav-tab")) programar();
  }
  raiz.addEventListener("click", alPulsar);
  ventana?.addEventListener("resize", programar);

  refresh();

  return {
    refresh,
    destroy() {
      if (observer) observer.disconnect();
      raiz.removeEventListener("click", alPulsar);
      ventana?.removeEventListener("resize", programar);
    },
  };
}
