/**
 * Vista de **propuestas de convalidación** de `/ugr`.
 *
 * Extraída del monolito: aquí viven la barra con el selector y sus acciones, el
 * detalle de mapeos (individuales y bloques 4↔4), el alta y el borrado de la
 * propuesta activa con sus dos modales, las **instantáneas guardadas** y el
 * enlace para compartir una propuesta.
 *
 * El estado de la aplicación —la lista de propuestas, cuál está activa y la
 * vista de convalidaciones— sigue siendo del llamante: se cede el objeto por
 * `getState` y se muta **en sitio** (es la caché que lee el resto de la app),
 * mientras que persistirlo es cosa de los intents `saveState`/`savePropuestas`.
 * Las instantáneas guardadas sí son de la vista: su almacén se inyecta
 * (`storage`) porque el respaldo completo y el reinicio también las tocan, y se
 * ofrecen por `getSaved`/`replaceSaved`/`clearSaved`.
 *
 * Las reglas puras (la propuesta activa, el orden por curso, la ficha de un
 * código UGR y las opciones de los desplegables) están en el dominio y aquí solo
 * se les pasan los datos; `document` y `window` son inyectables.
 */

import {
  buildUnedOptions,
  buildUgrOptions,
  calcPropuestaCreditos,
  findActivePropuesta,
  formatCursoCuatri,
  getUgrMeta,
  sortMappingsByCurso,
} from "../domain/proposals.js";

/** Clave donde viven las instantáneas (legacy `ugr-propuestas-guardadas`). */
const SAVED_KEY = "ugr-propuestas-guardadas";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {Window} deps.window ventana (`location`, `FileReader`, `navigator`).
 * @param {Storage} deps.storage almacén de las instantáneas guardadas.
 * @param {() => Object} deps.getState estado corriente (se muta en sitio).
 * @param {() => Array} deps.getSubjects catálogo activo (cambia al importar uno).
 * @param {() => Array} deps.getConvalidaciones tabla oficial.
 * @param {() => Array} deps.getPropuestasIniciales propuestas semilla.
 * @param {() => Object} deps.getEquivalencias equivalencias de código UGR.
 * @param {() => void} deps.saveState persiste el estado (store/espejo).
 * @param {() => void} deps.savePropuestas persiste la lista de propuestas.
 * @param {(data: Object, filename: string) => void} deps.download descarga JSON.
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @param {(mensaje: string) => boolean} deps.confirmFn confirmación (borrados).
 * @param {(mensaje: string, inicial: string) => (string|null)} deps.promptFn nombre de una propuesta nueva.
 * @returns {Object} la vista montada.
 */
export function createPropuestasView({
  document,
  window,
  storage,
  getState,
  getSubjects,
  getConvalidaciones,
  getPropuestasIniciales,
  getEquivalencias,
  saveState,
  savePropuestas,
  download,
  notify,
  confirmFn,
  promptFn,
}) {
  /** Borrador del formulario de bloque 4↔4 (cursadas y reconocidas). */
  let bloqueTemp = { cursadas: [], reconocidas: [] };
  /** Orden del detalle por curso: `null` es el orden natural de los mapeos. */
  let sortCurso = null;
  /** Instantáneas guardadas, ya cargadas del almacén. */
  let savedInternas = leerGuardadas();

  const el = (id) => document.getElementById(id);
  const activa = () => findActivePropuesta(getState().propuestas, getState().propuestaActivaId);
  const meta = (codigo) => getUgrMeta(codigo, {
    subjects: getSubjects(),
    convalidaciones: getConvalidaciones(),
    equivalencias: getEquivalencias(),
  });
  /** Persistir tras una mutación de la lista: estado y lista van juntos. */
  const persistirLista = () => {
    saveState();
    savePropuestas();
  };

  function leerGuardadas() {
    try {
      return JSON.parse(storage.getItem(SAVED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function escribirGuardadas() {
    storage.setItem(SAVED_KEY, JSON.stringify(savedInternas));
  }

  // ─── Alta y edición de la propuesta activa ──────────────────

  function crearPropuesta() {
    el("propuesta-modal-title").textContent = "Nueva Propuesta";
    el("propuesta-edit-id").value = "";
    el("propuesta-nombre").value = "";
    el("propuesta-enbloque").checked = true;
    el("propuesta-nota").value = "";
    el("propuesta-modal").style.display = "flex";
  }

  function renombrarPropuesta() {
    const propuesta = activa();
    if (!propuesta) return;
    el("propuesta-modal-title").textContent = "Renombrar Propuesta";
    el("propuesta-edit-id").value = propuesta.id;
    el("propuesta-nombre").value = propuesta.nombre;
    el("propuesta-enbloque").checked = !!propuesta.enBloque;
    el("propuesta-nota").value = propuesta.nota || "";
    el("propuesta-modal").style.display = "flex";
  }

  function guardarPropuestaModal() {
    const state = getState();
    const id = el("propuesta-edit-id").value;
    const nombre = el("propuesta-nombre").value.trim();
    const enBloque = el("propuesta-enbloque").checked;
    const nota = el("propuesta-nota").value.trim();
    if (!nombre) {
      notify("Introduce un nombre", "error");
      return;
    }
    if (id) {
      const propuesta = state.propuestas.find((x) => x.id === id);
      if (propuesta) {
        propuesta.nombre = nombre;
        propuesta.enBloque = enBloque;
        propuesta.nota = nota;
      }
    } else {
      // La propuesta nueva arranca con los mapeos de la activa: nace como copia
      // editable, que es lo que se espera al pulsar «Nueva».
      const nueva = { id: "prop-" + Date.now(), nombre, enBloque, nota, totalCreditos: 0, mappings: [] };
      const actual = activa();
      if (actual) nueva.mappings = JSON.parse(JSON.stringify(actual.mappings));
      nueva.totalCreditos = calcPropuestaCreditos(nueva);
      state.propuestas.push(nueva);
      state.propuestaActivaId = nueva.id;
    }
    persistirLista();
    el("propuesta-modal").style.display = "none";
    renderBar();
    notify("Propuesta guardada", "success");
  }

  function crearPropuestaVacia() {
    const state = getState();
    const nombre = promptFn("Nombre de la nueva propuesta:", "Nueva propuesta");
    if (nombre === null) return;
    const clean = nombre.trim() || "Propuesta " + (state.propuestas.length + 1);
    const nueva = { id: "prop-" + Date.now(), nombre: clean, enBloque: false, nota: "", totalCreditos: 0, mappings: [] };
    state.propuestas.push(nueva);
    state.propuestaActivaId = nueva.id;
    persistirLista();
    renderBar();
    notify("Propuesta vacía creada — añade mapeos", "success");
    // El modal se abre solo: una propuesta vacía se crea para rellenarla.
    window.setTimeout(() => abrirMapeoModal(), 200);
  }

  function duplicarPropuesta() {
    const state = getState();
    const propuesta = activa();
    if (!propuesta) {
      notify("No hay propuesta activa", "error");
      return;
    }
    const copia = JSON.parse(JSON.stringify(propuesta));
    copia.id = "prop-" + Date.now();
    copia.nombre = propuesta.nombre + " (copia)";
    state.propuestas.push(copia);
    state.propuestaActivaId = copia.id;
    persistirLista();
    renderBar();
    notify("Propuesta duplicada", "success");
  }

  function eliminarPropuesta() {
    const state = getState();
    const propuesta = activa();
    if (!propuesta) return;
    if (!confirmFn(`¿Eliminar "${propuesta.nombre}"?`)) return;
    state.propuestas = state.propuestas.filter((p) => p.id !== propuesta.id);
    state.propuestaActivaId = state.propuestas[0] ? state.propuestas[0].id : null;
    persistirLista();
    renderBar();
    notify("Propuesta eliminada", "info");
  }

  function exportPropuestaActiva() {
    const propuesta = activa();
    if (!propuesta) {
      notify("No hay propuesta activa", "error");
      return;
    }
    download(
      { version: 1, type: "ugr-propuesta", exportedAt: new Date().toISOString(), propuesta },
      `propuesta-${propuesta.id}.json`,
    );
    notify("Propuesta exportada", "success");
  }

  function importPropuesta(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const reader = new window.FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        let propuesta = null;
        if (data.type === "ugr-propuesta" && data.propuesta) propuesta = data.propuesta;
        else if (data.mappings) propuesta = data;
        else {
          notify("Formato no válido", "error");
          return;
        }
        const state = getState();
        propuesta.id = "prop-" + Date.now();
        if (!propuesta.mappings) propuesta.mappings = [];
        propuesta.totalCreditos = calcPropuestaCreditos(propuesta);
        state.propuestas.push(propuesta);
        state.propuestaActivaId = propuesta.id;
        persistirLista();
        renderBar();
        notify("Propuesta importada", "success");
      } catch {
        notify("Error al leer archivo", "error");
      }
    };
    reader.readAsText(file);
  }

  function compartirPropuestaLink() {
    const propuesta = activa();
    if (!propuesta) {
      notify("No hay propuesta activa", "error");
      return;
    }
    const encoded = window.btoa(encodeURIComponent(JSON.stringify(propuesta)));
    const url = window.location.origin + window.location.pathname + "?propuesta=" + encoded;
    const nav = window.navigator;
    const aCopiar = () =>
      nav.clipboard.writeText(url)
        .then(() => notify("Enlace de propuesta copiado", "success"))
        .catch(() => copiarAMano(url));
    if (nav && nav.clipboard && nav.clipboard.writeText) aCopiar();
    else copiarAMano(url);
  }

  /** Sin portapapeles (o si falla) se selecciona el texto para copiarlo a mano. */
  function copiarAMano(url) {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand("copy");
    } catch {
      /* el navegador puede no soportarlo: queda seleccionado */
    }
    document.body.removeChild(input);
    notify("Enlace copiado", "success");
  }

  /** Un `?propuesta=` en la URL carga la propuesta al arrancar (una sola vez). */
  function checkUrl() {
    const params = new window.URLSearchParams(window.location.search);
    const prop = params.get("propuesta");
    if (!prop) return;
    try {
      const data = JSON.parse(decodeURIComponent(window.atob(prop)));
      if (!data.mappings) return;
      const state = getState();
      data.id = "prop-" + Date.now();
      if (!data.totalCreditos) data.totalCreditos = calcPropuestaCreditos(data);
      const exists = state.propuestas.find((p) => JSON.stringify(p.mappings) === JSON.stringify(data.mappings));
      if (exists) {
        state.propuestaActivaId = exists.id;
        state.vistaConvalidaciones = "propuesta";
        saveState();
      } else {
        state.propuestas.push(data);
        state.propuestaActivaId = data.id;
        state.vistaConvalidaciones = "propuesta";
        persistirLista();
        notify("Propuesta cargada desde enlace", "success");
      }
      renderBar();
    } catch {
      /* enlace ilegible: se ignora sin romper el arranque */
    }
  }

  // ─── Mapeos: formularios de individual y de bloque 4↔4 ──────

  function addBloqueField(tipo, val) {
    if (tipo === "cursada") bloqueTemp.cursadas.push(val || { codigo: "", nombre: "" });
    else bloqueTemp.reconocidas.push(val || { codigo: "", nombre: "" });
    renderBloqueFields();
  }

  function renderBloqueFields() {
    const cCont = el("bloque-cursadas");
    const rCont = el("bloque-reconocidas");
    if (!cCont || !rCont) return;
    const unedOptionsHtml = '<option value="">-- UNED / DAW --</option>' +
      buildUnedOptions(getConvalidaciones(), getPropuestasIniciales())
        .map((o) => `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}</option>`)
        .join("");
    const ugrOptionsHtml = '<option value="">-- UGR --</option>' +
      buildUgrOptions(getSubjects(), getConvalidaciones())
        .map((o) => {
          const ficha = meta(o.codigo);
          const extra = ficha ? ` · ${formatCursoCuatri(ficha)}` : "";
          return `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}${extra}</option>`;
        })
        .join("");
    cCont.innerHTML = bloqueTemp.cursadas
      .map((c, i) => `<div class="form-row" style="gap:0.4rem;"><select data-bloque="cursada" data-i="${i}" style="flex:1;">${unedOptionsHtml}</select><button type="button" class="btn btn-sm btn-danger" data-del-bloque="cursada" data-i="${i}">X</button></div>`)
      .join("");
    rCont.innerHTML = bloqueTemp.reconocidas
      .map((r, i) => `<div class="form-row" style="gap:0.4rem;"><select data-bloque="reconocida" data-i="${i}" style="flex:1;">${ugrOptionsHtml}</select><button type="button" class="btn btn-sm btn-danger" data-del-bloque="reconocida" data-i="${i}">X</button></div>`)
      .join("");
    cCont.querySelectorAll("select").forEach((sel) => {
      const i = parseInt(sel.dataset.i);
      const cur = bloqueTemp.cursadas[i];
      if (cur.codigo) sel.value = `${cur.codigo}|${cur.nombre}`;
      sel.addEventListener("change", () => {
        const v = sel.value;
        if (!v) {
          bloqueTemp.cursadas[i] = { codigo: "", nombre: "" };
          return;
        }
        const [codigo, nombre] = v.split("|");
        bloqueTemp.cursadas[i] = { codigo, nombre };
      });
    });
    rCont.querySelectorAll("select").forEach((sel) => {
      const i = parseInt(sel.dataset.i);
      const cur = bloqueTemp.reconocidas[i];
      if (cur.codigo) sel.value = `${cur.codigo}|${cur.nombre}`;
      sel.addEventListener("change", () => {
        const v = sel.value;
        if (!v) {
          bloqueTemp.reconocidas[i] = { codigo: "", nombre: "" };
          return;
        }
        const [codigo, nombre] = v.split("|");
        bloqueTemp.reconocidas[i] = { codigo, nombre };
      });
    });
    cCont.querySelectorAll('[data-del-bloque="cursada"]').forEach((b) =>
      b.addEventListener("click", () => {
        bloqueTemp.cursadas.splice(parseInt(b.dataset.i), 1);
        renderBloqueFields();
      }));
    rCont.querySelectorAll('[data-del-bloque="reconocida"]').forEach((b) =>
      b.addEventListener("click", () => {
        bloqueTemp.reconocidas.splice(parseInt(b.dataset.i), 1);
        renderBloqueFields();
      }));
  }

  function populateMapeoSelects() {
    const ugrSel = el("mapeo-reconocida-select");
    const unedSel = el("mapeo-cursada-select");
    if (ugrSel) {
      ugrSel.innerHTML = '<option value="">-- Selecciona UGR --</option>' +
        buildUgrOptions(getSubjects(), getConvalidaciones())
          .map((o) => {
            const ficha = meta(o.codigo);
            const extra = ficha ? ` · ${formatCursoCuatri(ficha)}` : "";
            return `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}${extra}</option>`;
          })
          .join("");
    }
    if (unedSel) {
      unedSel.innerHTML = '<option value="">-- Selecciona UNED / DAW --</option>' +
        buildUnedOptions(getConvalidaciones(), getPropuestasIniciales())
          .map((o) => `<option value="${o.codigo}|${o.nombre}">${o.codigo} - ${o.nombre}</option>`)
          .join("");
    }
  }

  function abrirMapeoModal(index) {
    const propuesta = activa();
    if (!propuesta) {
      notify("Crea primero una propuesta", "error");
      return;
    }
    const isEdit = typeof index === "number" && index >= 0;
    const m = isEdit ? propuesta.mappings[index] : null;
    el("mapeo-edit-index").value = isEdit ? String(index) : "";
    const tipoSel = el("mapeo-tipo");
    const isBloque = m && m.tipo === "bloque";
    tipoSel.value = isBloque ? "bloque" : "individual";
    el("mapeo-individual-fields").style.display = isBloque ? "none" : "";
    el("mapeo-bloque-fields").style.display = isBloque ? "" : "none";
    el("propuesta-mapeo-title").textContent = isEdit
      ? (isBloque ? "Editar bloque" : "Editar mapeo")
      : (tipoSel.value === "bloque" ? "Nuevo bloque" : "Nuevo mapeo");
    if (isBloque) {
      bloqueTemp = {
        cursadas: JSON.parse(JSON.stringify(m.cursadas || [])),
        reconocidas: JSON.parse(JSON.stringify(m.reconocidas || [])),
      };
      el("bloque-calif").value = m.calificacion || 7.5;
      el("bloque-creditos").value = m.creditos || 24;
      el("bloque-nota").value = m.nota || "";
      if (!bloqueTemp.cursadas.length) bloqueTemp.cursadas = [{ codigo: "", nombre: "" }];
      if (!bloqueTemp.reconocidas.length) bloqueTemp.reconocidas = [{ codigo: "", nombre: "" }];
      renderBloqueFields();
    } else if (m) {
      populateMapeoSelects();
      const unedSel = el("mapeo-cursada-select");
      const ugrSel = el("mapeo-reconocida-select");
      const unedVal = m.cursadaCodigo && m.cursada ? `${m.cursadaCodigo}|${m.cursada}` : "";
      const ugrVal = m.reconocidaCodigo && m.reconocida ? `${m.reconocidaCodigo}|${m.reconocida}` : "";
      if (unedSel) {
        unedSel.value = unedVal;
        unedSel.dispatchEvent(new window.Event("change"));
      }
      // Los campos ocultos se rellenan aparte: una cursada que ya no está en la
      // lista (texto libre) no tiene opción que seleccionar.
      el("mapeo-cursada").value = m.cursada || "";
      el("mapeo-cursada-codigo").value = m.cursadaCodigo || "";
      el("mapeo-reconocida").value = m.reconocida || "";
      el("mapeo-reconocida-codigo").value = m.reconocidaCodigo || "";
      if (ugrSel) {
        ugrSel.value = ugrVal;
        ugrSel.dispatchEvent(new window.Event("change"));
      }
      el("mapeo-calif").value = m.calificacion || 7.5;
      el("mapeo-creditos").value = m.creditos || 6;
      bloqueTemp = { cursadas: [], reconocidas: [] };
    } else {
      populateMapeoSelects();
      el("mapeo-cursada-select").value = "";
      el("mapeo-cursada").value = "";
      el("mapeo-cursada-codigo").value = "";
      el("mapeo-reconocida-select").value = "";
      el("mapeo-reconocida").value = "";
      el("mapeo-reconocida-codigo").value = "";
      el("mapeo-calif").value = 7.5;
      el("mapeo-creditos").value = 6;
      // Un bloque 4↔4 nace con las cuatro casillas de cada lado (es su forma).
      bloqueTemp = {
        cursadas: [{ codigo: "", nombre: "" }, { codigo: "", nombre: "" }, { codigo: "", nombre: "" }, { codigo: "", nombre: "" }],
        reconocidas: [{ codigo: "", nombre: "" }, { codigo: "", nombre: "" }, { codigo: "", nombre: "" }, { codigo: "", nombre: "" }],
      };
      el("bloque-calif").value = 7.5;
      el("bloque-creditos").value = 24;
      el("bloque-nota").value = "Bloque 4↔4 — concesión conjunta";
      renderBloqueFields();
    }
    el("propuesta-mapeo-modal").style.display = "flex";
  }

  function guardarMapeo() {
    const propuesta = activa();
    if (!propuesta) return;
    const idxVal = el("mapeo-edit-index").value;
    const isEdit = idxVal !== "" && !isNaN(parseInt(idxVal));
    const tipo = el("mapeo-tipo").value;
    let nuevo;
    if (tipo === "bloque") {
      const cursadas = bloqueTemp.cursadas.filter((c) => c.nombre.trim() || c.codigo.trim());
      const reconocidas = bloqueTemp.reconocidas.filter((r) => r.nombre.trim() || r.codigo.trim());
      if (cursadas.length === 0 || reconocidas.length === 0) {
        notify("Completa al menos una cursada y una reconocida", "error");
        return;
      }
      nuevo = {
        tipo: "bloque",
        id: isEdit && propuesta.mappings[parseInt(idxVal)]?.id ? propuesta.mappings[parseInt(idxVal)].id : "bloque-" + Date.now(),
        cursadas,
        reconocidas,
        calificacion: parseFloat(el("bloque-calif").value) || 7.5,
        creditos: parseInt(el("bloque-creditos").value) || 24,
        nota: el("bloque-nota").value.trim(),
      };
    } else {
      const cursada = el("mapeo-cursada").value.trim();
      const cursadaCodigo = el("mapeo-cursada-codigo").value.trim();
      const reconocida = el("mapeo-reconocida").value.trim();
      const reconocidaCodigo = el("mapeo-reconocida-codigo").value.trim();
      if (!cursada || !reconocidaCodigo) {
        notify("Rellena cursada y código UGR", "error");
        return;
      }
      nuevo = {
        cursada,
        cursadaCodigo,
        reconocida,
        reconocidaCodigo,
        reconocidaNombre: reconocida + " (" + reconocidaCodigo + ")",
        calificacion: parseFloat(el("mapeo-calif").value) || 7.5,
        creditos: parseInt(el("mapeo-creditos").value) || 6,
      };
    }
    if (isEdit) propuesta.mappings[parseInt(idxVal)] = nuevo;
    else propuesta.mappings.push(nuevo);
    propuesta.totalCreditos = calcPropuestaCreditos(propuesta);
    persistirLista();
    el("propuesta-mapeo-modal").style.display = "none";
    renderBar();
    notify(isEdit ? "Mapeo actualizado" : "Mapeo añadido", "success");
  }

  function eliminarMapeo(idx) {
    const propuesta = activa();
    if (!propuesta || typeof idx !== "number") return;
    if (!confirmFn("¿Eliminar este mapeo?")) return;
    propuesta.mappings.splice(idx, 1);
    propuesta.totalCreditos = calcPropuestaCreditos(propuesta);
    persistirLista();
    renderBar();
    notify("Mapeo eliminado", "info");
  }

  // ─── Instantáneas guardadas ─────────────────────────────────

  function guardarPropuestaInterna() {
    const activaActual = activa();
    const input = el("propuesta-guardada-nombre");
    const nombre = input ? input.value.trim() : "";
    if (!nombre) {
      notify("Introduce un nombre para guardar", "error");
      return;
    }
    if (!activaActual) {
      notify("No hay propuesta activa", "error");
      return;
    }
    if (activaActual.mappings.length === 0) {
      notify("La propuesta activa está vacía", "error");
      return;
    }
    const snap = JSON.parse(JSON.stringify(activaActual));
    savedInternas.push({
      id: Date.now(),
      nombre,
      propuesta: snap,
      totalCreditos: calcPropuestaCreditos(snap),
      entradas: snap.mappings.length,
      fecha: new Date().toISOString(),
    });
    escribirGuardadas();
    if (input) input.value = "";
    renderSaved();
    notify(`Propuesta "${nombre}" guardada`, "success");
  }

  function cargarPropuestaGuardada(id) {
    const guardada = savedInternas.find((s) => s.id === id);
    if (!guardada) return;
    const copia = JSON.parse(JSON.stringify(guardada.propuesta));
    // Id nuevo siempre: la instantánea puede convivir con la propuesta original.
    copia.id = "prop-" + Date.now();
    const state = getState();
    state.propuestas.push(copia);
    state.propuestaActivaId = copia.id;
    persistirLista();
    renderBar();
    notify(`Propuesta "${guardada.nombre}" cargada`, "success");
  }

  function eliminarPropuestaGuardada(id) {
    const guardada = savedInternas.find((s) => s.id === id);
    if (!guardada) return;
    if (!confirmFn(`¿Eliminar propuesta guardada "${guardada.nombre}"?`)) return;
    savedInternas = savedInternas.filter((s) => s.id !== id);
    escribirGuardadas();
    renderSaved();
    notify("Propuesta guardada eliminada", "info");
  }

  function exportPropuestaGuardada(id) {
    const guardada = savedInternas.find((s) => s.id === id);
    if (!guardada) return;
    download(
      { version: 1, type: "ugr-propuesta-guardada", exportedAt: new Date().toISOString(), saved: guardada },
      `propuesta-guardada-${guardada.nombre.replace(/\s+/g, "-").toLowerCase()}.json`,
    );
    notify("Propuesta guardada exportada", "success");
  }

  function exportTodasPropuestasGuardadas() {
    if (savedInternas.length === 0) {
      notify("No hay propuestas guardadas", "info");
      return;
    }
    download(
      { version: 1, type: "ugr-propuestas-guardadas-batch", exportedAt: new Date().toISOString(), guardadas: savedInternas },
      "propuestas-guardadas.json",
    );
    notify(`${savedInternas.length} propuestas guardadas exportadas`, "success");
  }

  function importPropuestaGuardada(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const reader = new window.FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        let toAdd = [];
        if (data.type === "ugr-propuesta-guardada" && data.saved) toAdd = [data.saved];
        else if (data.type === "ugr-propuestas-guardadas-batch" && Array.isArray(data.guardadas)) toAdd = data.guardadas;
        else if (data.type === "ugr-propuesta" && data.propuesta) {
          toAdd = [{ id: Date.now(), nombre: data.propuesta.nombre || "Importada", propuesta: data.propuesta, totalCreditos: calcPropuestaCreditos(data.propuesta), entradas: data.propuesta.mappings.length, fecha: new Date().toISOString() }];
        } else if (data.mappings) {
          toAdd = [{ id: Date.now(), nombre: data.nombre || "Importada", propuesta: data, totalCreditos: calcPropuestaCreditos(data), entradas: data.mappings.length, fecha: new Date().toISOString() }];
        }
        toAdd.forEach((s) => {
          s.id = Date.now() + Math.floor(Math.random() * 1000);
          savedInternas.push(s);
        });
        escribirGuardadas();
        renderSaved();
        notify(`${toAdd.length} propuesta(s) guardada(s) importada(s)`, "success");
      } catch {
        notify("Error al leer archivo", "error");
      }
    };
    reader.readAsText(file);
  }

  function renderSaved() {
    const cont = el("propuestas-guardadas-list");
    if (!cont) return;
    if (savedInternas.length === 0) {
      cont.innerHTML = '<p class="empty-state">No hay propuestas guardadas. Guarda la activa con un nombre.</p>';
      return;
    }
    let html = '<div class="saved-configs-grid">';
    savedInternas.forEach((s) => {
      html += `<div class="saved-config-item"><div class="saved-config-info"><div class="saved-config-name">${s.nombre}</div><div class="saved-config-meta">${s.entradas} entradas · ${s.totalCreditos} ECTS · ${new Date(s.fecha).toLocaleDateString()}</div></div><div class="saved-config-actions"><button class="btn btn-sm btn-secondary" data-pg-action="load" data-id="${s.id}">Cargar</button><button class="btn btn-sm btn-secondary" data-pg-action="export" data-id="${s.id}">Exportar</button><button class="btn btn-sm btn-danger" data-pg-action="delete" data-id="${s.id}">Eliminar</button></div></div>`;
    });
    html += "</div>";
    cont.innerHTML = html;
    cont.querySelectorAll("[data-pg-action]").forEach((b) => {
      const id = parseInt(b.dataset.id);
      if (b.dataset.pgAction === "load") b.addEventListener("click", () => cargarPropuestaGuardada(id));
      else if (b.dataset.pgAction === "delete") b.addEventListener("click", () => eliminarPropuestaGuardada(id));
      else if (b.dataset.pgAction === "export") b.addEventListener("click", () => exportPropuestaGuardada(id));
    });
  }

  // ─── Barra y detalle ────────────────────────────────────────

  function renderBar() {
    const state = getState();
    const sel = el("propuesta-select");
    const badge = el("propuesta-badge");
    const summary = el("propuestas-summary");
    const detalle = el("propuesta-detalle");
    if (!sel || !state.propuestas) return;
    sel.innerHTML = state.propuestas
      .map((p) => `<option value="${p.id}" ${p.id === state.propuestaActivaId ? "selected" : ""}>${p.nombre} (${p.totalCreditos || calcPropuestaCreditos(p)} ECTS)</option>`)
      .join("");
    const propuesta = activa();
    if (!propuesta) {
      if (badge) badge.textContent = "";
      if (summary) summary.textContent = "Sin propuestas";
      if (detalle) detalle.innerHTML = '<p class="empty-state">Crea una propuesta para empezar.</p>';
      return;
    }

    const total = calcPropuestaCreditos(propuesta);
    const entradas = propuesta.mappings.length;
    const bloqueTxt = propuesta.enBloque ? " · En bloque" : "";
    const bloqueCount = propuesta.mappings.filter((m) => m.tipo === "bloque").length;
    if (badge) badge.textContent = `${entradas} entradas${bloqueCount ? " (" + bloqueCount + " bloque)" : ""} · ${total} ECTS${bloqueTxt}`;
    if (summary) summary.textContent = `${state.propuestas.length} propuesta(s) · Activa: ${propuesta.nombre}`;
    if (!detalle) return;

    let html = `<div class="propuesta-meta"><small style="color:var(--text-light)">${propuesta.nota || ""}${propuesta.enBloque ? "<br><strong>En bloque:</strong> concesión conjunta — si una se deniega, se revisa el bloque completo." : ""}</small></div>`;
    html += '<div class="propuesta-legend"><span class="legend-item"><span class="legend-dot" style="background:#1976d2"></span>1º</span><span class="legend-item"><span class="legend-dot" style="background:#388e3c"></span>2º</span><span class="legend-item"><span class="legend-dot" style="background:#f57c00"></span>3º</span><span class="legend-item"><span class="legend-dot" style="background:#7b1fa2"></span>4º</span><span class="legend-item"><span class="legend-dot" style="background:#757575"></span>Opt</span><span class="legend-item" style="margin-left:0.6rem;">Cuatri: <span class="cuatri-badge c1">1ºC</span> <span class="cuatri-badge c2">2ºC</span></span></div>';
    const sortIcon = sortCurso === "asc" ? "↑" : sortCurso === "desc" ? "↓" : "↕";
    html += '<div class="manage-table-wrapper"><table class="manage-table"><thead><tr><th>Cursada</th><th id="th-orden-curso" style="cursor:pointer;user-select:none;" title="Ordenar por curso">Reconocida (UGR) ' + sortIcon + "</th><th>Cód.</th><th>Calif.</th><th>Acciones</th></tr></thead><tbody>";
    const indexed = propuesta.mappings.map((m, idx) => ({ m, idx }));
    const sorted = sortMappingsByCurso(propuesta.mappings, sortCurso, meta).map((sm) => ({
      m: sm,
      idx: propuesta.mappings.indexOf(sm),
    }));
    const toRender = sortCurso ? sorted : indexed;
    toRender.forEach(({ m, idx }) => {
      const origI = idx;
      if (m.tipo === "bloque") {
        const cursadasTxt = m.cursadas.map((c) => `${c.nombre} (${c.codigo})`).join("<br>");
        const reconTxt = m.reconocidas
          .map((r) => {
            const ficha = meta(r.codigo);
            const cursoCls = ficha ? (ficha.curso === "Opt" ? "copt" : "c" + ficha.curso) : "";
            const cursoBadge = ficha ? `<span class="curso-badge ${cursoCls}">${ficha.curso === "Opt" ? "OPT" : ficha.curso + "º"}</span>` : '<span class="curso-badge copt">?</span>';
            const cuatriBadge = ficha && ficha.cuatrimestre !== "-" ? `<span class="cuatri-badge c${ficha.cuatrimestre}">${ficha.cuatrimestre}ºC</span>` : "";
            return `${cursoBadge}${cuatriBadge} ${r.nombre} (${r.codigo})`;
          })
          .join("<br>");
        const codigos = m.reconocidas
          .map((r) => {
            const ficha = meta(r.codigo);
            const cursoCls = ficha ? (ficha.curso === "Opt" ? "copt" : "c" + ficha.curso) : "copt";
            const cursoBadge = ficha ? `<span class="curso-badge ${cursoCls}">${ficha.curso === "Opt" ? "OPT" : ficha.curso + "º"}</span>` : "";
            return `${cursoBadge} ${r.codigo}`;
          })
          .join("<br>");
        html += `<tr class="propuesta-bloque-row"><td><strong>Bloque 4↔4</strong><br><small style="color:var(--text-light)">${cursadasTxt}</small></td><td><small>${reconTxt}</small></td><td><small>${codigos}</small></td><td><span class="badge-bloque">${m.calificacion}</span><br><small>${m.creditos} ECTS</small></td><td><button class="btn btn-sm btn-secondary" data-edit-mapeo="${origI}">Editar</button> <button class="btn btn-sm btn-danger" data-del-mapeo="${origI}">X</button></td></tr>`;
      } else {
        const ficha = meta(m.reconocidaCodigo);
        const cursoCls = ficha ? (ficha.curso === "Opt" ? "copt" : "c" + ficha.curso) : "copt";
        const cursoBadge = ficha ? `<span class="curso-badge ${cursoCls}">${ficha.curso === "Opt" ? "OPT" : ficha.curso + "º"}</span>` : '<span class="curso-badge copt">?</span>';
        const cuatriBadge = ficha && ficha.cuatrimestre !== "-" ? `<span class="cuatri-badge c${ficha.cuatrimestre}">${ficha.cuatrimestre}ºC</span>` : "";
        const rowCls = ficha ? `propuesta-row curso-${String(ficha.curso).toLowerCase()}` : "propuesta-row curso-opt";
        html += `<tr class="${rowCls}"><td>${m.cursada} <small style="color:var(--text-light)">(${m.cursadaCodigo})</small></td><td>${cursoBadge}${cuatriBadge} ${m.reconocida}<br><small style="color:var(--text-light)">${m.reconocidaCodigo} · ${formatCursoCuatri(ficha) || "sin curso"}</small></td><td>${cursoBadge} ${m.reconocidaCodigo}</td><td>${m.calificacion}</td><td><button class="btn btn-sm btn-secondary" data-edit-mapeo="${origI}">Editar</button> <button class="btn btn-sm btn-danger" data-del-mapeo="${origI}">X</button></td></tr>`;
      }
    });
    html += `<tr style="font-weight:700;"><td colspan="4">Total de créditos reconocidos</td><td>${total} (*)</td></tr>`;
    html += "</tbody></table></div>";
    html += '<div class="propuestas-actions" style="margin-top:0.6rem;"><button class="btn btn-sm btn-secondary" id="btn-add-mapeo-individual">+ Añadir asignatura</button><button class="btn btn-sm btn-secondary" id="btn-add-mapeo-bloque">+ Añadir bloque 4↔4</button></div>';
    detalle.innerHTML = html;

    detalle.querySelectorAll("[data-edit-mapeo]").forEach((b) =>
      b.addEventListener("click", () => abrirMapeoModal(parseInt(b.dataset.editMapeo))));
    detalle.querySelectorAll("[data-del-mapeo]").forEach((b) =>
      b.addEventListener("click", () => eliminarMapeo(parseInt(b.dataset.delMapeo))));
    const addInd = detalle.querySelector("#btn-add-mapeo-individual");
    const addBlo = detalle.querySelector("#btn-add-mapeo-bloque");
    if (addInd) addInd.addEventListener("click", () => {
      el("mapeo-tipo").value = "individual";
      abrirMapeoModal();
    });
    if (addBlo) addBlo.addEventListener("click", () => {
      el("mapeo-tipo").value = "bloque";
      abrirMapeoModal();
    });
    const thSort = detalle.querySelector("#th-orden-curso");
    if (thSort) thSort.addEventListener("click", () => {
      sortCurso = sortCurso === "asc" ? "desc" : sortCurso === "desc" ? null : "asc";
      renderBar();
    });
  }

  // ─── Montaje ────────────────────────────────────────────────

  /** Engancha la barra, los tres modales y la lista de instantáneas. */
  function setup() {
    const sel = el("propuesta-select");
    if (!sel) return;
    sel.addEventListener("change", () => {
      getState().propuestaActivaId = sel.value;
      persistirLista();
      renderBar();
    });
    const btnNueva = el("btn-nueva-propuesta");
    const btnVacia = el("btn-nueva-vacia-propuesta");
    const btnDup = el("btn-duplicar-propuesta");
    const btnRen = el("btn-renombrar-propuesta");
    const btnDel = el("btn-eliminar-propuesta");
    const btnShare = el("btn-compartir-propuesta");
    const btnExp = el("btn-export-propuesta");
    const btnImp = el("btn-import-propuesta");
    const impInput = el("import-propuesta-input");
    if (btnNueva) btnNueva.addEventListener("click", crearPropuesta);
    if (btnVacia) btnVacia.addEventListener("click", crearPropuestaVacia);
    if (btnDup) btnDup.addEventListener("click", duplicarPropuesta);
    if (btnRen) btnRen.addEventListener("click", renombrarPropuesta);
    if (btnDel) btnDel.addEventListener("click", eliminarPropuesta);
    if (btnShare) btnShare.addEventListener("click", compartirPropuestaLink);
    if (btnExp) btnExp.addEventListener("click", exportPropuestaActiva);
    if (btnImp) btnImp.addEventListener("click", () => impInput.click());
    if (impInput) impInput.addEventListener("change", importPropuesta);

    // Modal de la propuesta (alta y renombrado comparten formulario).
    const modal = el("propuesta-modal");
    const cerrarModal = () => {
      if (modal) modal.style.display = "none";
    };
    const closeBtn = el("propuesta-modal-close");
    const cancelBtn = el("propuesta-modal-cancel");
    const saveBtn = el("propuesta-modal-save");
    if (closeBtn) closeBtn.addEventListener("click", cerrarModal);
    if (cancelBtn) cancelBtn.addEventListener("click", cerrarModal);
    if (saveBtn) saveBtn.addEventListener("click", guardarPropuestaModal);
    if (modal) modal.addEventListener("click", (e) => {
      if (e.target.id === "propuesta-modal") cerrarModal();
    });

    // Modal del mapeo.
    const mModal = el("propuesta-mapeo-modal");
    const cerrarMapeo = () => {
      if (mModal) mModal.style.display = "none";
    };
    const mCloseBtn = el("propuesta-mapeo-close");
    const mCancel = el("propuesta-mapeo-cancel");
    const mSave = el("propuesta-mapeo-save");
    const tipoSel = el("mapeo-tipo");
    if (mCloseBtn) mCloseBtn.addEventListener("click", cerrarMapeo);
    if (mCancel) mCancel.addEventListener("click", cerrarMapeo);
    if (mSave) mSave.addEventListener("click", guardarMapeo);
    if (mModal) mModal.addEventListener("click", (e) => {
      if (e.target.id === "propuesta-mapeo-modal") cerrarMapeo();
    });
    if (tipoSel) tipoSel.addEventListener("change", () => {
      const isBloque = tipoSel.value === "bloque";
      el("mapeo-individual-fields").style.display = isBloque ? "none" : "";
      el("mapeo-bloque-fields").style.display = isBloque ? "" : "none";
    });
    const addC = el("btn-add-bloque-cursada");
    const addR = el("btn-add-bloque-reconocida");
    if (addC) addC.addEventListener("click", () => addBloqueField("cursada", ""));
    if (addR) addR.addEventListener("click", () => addBloqueField("reconocida", ""));

    // Desplegables: elegir una opción rellena los campos ocultos de código.
    populateMapeoSelects();
    const unedSel = el("mapeo-cursada-select");
    const ugrSel = el("mapeo-reconocida-select");
    if (unedSel) unedSel.addEventListener("change", () => {
      const val = unedSel.value;
      if (!val) {
        el("mapeo-cursada").value = "";
        el("mapeo-cursada-codigo").value = "";
        return;
      }
      const [codigo, nombre] = val.split("|");
      el("mapeo-cursada").value = nombre;
      el("mapeo-cursada-codigo").value = codigo;
    });
    if (ugrSel) ugrSel.addEventListener("change", () => {
      const val = ugrSel.value;
      if (!val) {
        el("mapeo-reconocida").value = "";
        el("mapeo-reconocida-codigo").value = "";
        return;
      }
      const [codigo, nombre] = val.split("|");
      el("mapeo-reconocida").value = nombre;
      el("mapeo-reconocida-codigo").value = codigo;
    });

    // Instantáneas guardadas.
    const btnGuardarInterna = el("btn-guardar-propuesta-interna");
    const inputNombreGuardada = el("propuesta-guardada-nombre");
    const btnExportAllGuardadas = el("btn-export-all-propuestas");
    const btnImportGuardada = el("btn-import-propuesta-guardada");
    const importGuardadaInput = el("import-propuesta-guardada-input");
    if (btnGuardarInterna) btnGuardarInterna.addEventListener("click", guardarPropuestaInterna);
    if (inputNombreGuardada) inputNombreGuardada.addEventListener("keydown", (e) => {
      if (e.key === "Enter") guardarPropuestaInterna();
    });
    if (btnExportAllGuardadas) btnExportAllGuardadas.addEventListener("click", exportTodasPropuestasGuardadas);
    if (btnImportGuardada) btnImportGuardada.addEventListener("click", () => importGuardadaInput.click());
    if (importGuardadaInput) importGuardadaInput.addEventListener("change", importPropuestaGuardada);

    renderSaved();
  }

  return {
    setup,
    renderBar,
    renderSaved,
    checkUrl,
    /** Instantáneas guardadas (las usa el respaldo completo). */
    getSaved: () => savedInternas,
    /** Sustituye la lista de instantáneas (importar un respaldo completo). */
    replaceSaved: (lista) => {
      savedInternas = Array.isArray(lista) ? lista : [];
      escribirGuardadas();
      renderSaved();
    },
    /** Vacía memoria y almacén (el reinicio a valores por defecto). */
    clearSaved: () => {
      savedInternas = [];
      storage.removeItem(SAVED_KEY);
      renderSaved();
    },
  };
}
