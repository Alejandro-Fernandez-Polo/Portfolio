/* ═══════════════════════════════════════════════════════════════
   UGR Horario - App Logic
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  const DAY_LABELS = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes' };
  // Iniciales para las columnas compactas (la de «Días libres» de las
  // configuraciones guardadas).
  const DAY_SHORT = { lunes: 'L', martes: 'M', miercoles: 'X', jueves: 'J', viernes: 'V' };
  const START_HOUR = 8;
  const END_HOUR = 21;
  let compareIds = [];
  // «Ignorar profesores»: la preferencia vive en el store
  // (`ui.ignoreDocents`) y esta variable es la caché que lee el render, igual
  // que `compareIds`. Con el modo activo los docentes no entran ni en la
  // generación ni en la pantalla.
  let ignoreDocents = false;

  let state = {
    selectedSubjects: {},  // { codigo: true }
    groupChoices: {},      // { codigo: { teoria: letra, practica: subgrupo } }
    apellido: '',
    turnoPreferente: 'indiferente',
    cuatrimestreActivo: 1,
  };

  // La carga real se hace en `init()` (vía `getPersistence().loadSavedConfigs()`),
  // cuando la composición ESM ya está montada. Este IIFE es un script clásico:
  // no puede resolver el `import()` del adaptador durante la evaluación del
  // cierre, así que aquí solo se siembra el binding vacío. Mientras `init()`
  // no haya terminado, cualquier lector ve `[]` en lugar de una copia legacy.
  // Las configuraciones guardadas las vive su vista ESM (ver más abajo); aquí
  // solo se leen por `getSavedConfigs()`.
  // El orden, la página y «solo favoritos» de la tabla de configuraciones viven
  // en su vista (`src/app/features/savedConfigs.js`); este bloque solo guarda lo
  // que el adaptador de persistencia y las mutaciones necesitan.
  // Bloqueos de configuraciones: viven en el store (persistidos en IDB).
  // Fallback local si el store no está disponible (modo degradado).
  let localBlockFilters = [];
  let blockStoreSubscribed = false;

  function getBlocks() {
    if (window.__ugrStore && typeof window.__ugrStore.getState === 'function') {
      const state = window.__ugrStore.getState();
      return state && Array.isArray(state.blocks) ? state.blocks : [];
    }
    return localBlockFilters;
  }

  function dispatchBlock(cmd) {
    if (window.__ugrStore && typeof window.__ugrStore.dispatch === 'function') {
      window.__ugrStore.dispatch(cmd);
    } else {
      // Fallback: aplicar localmente y re-renderizar
      if (cmd.type === 'blocks/add') {
        localBlockFilters.push(cmd.payload);
      } else if (cmd.type === 'blocks/remove') {
        localBlockFilters.splice(cmd.payload.index, 1);
      } else if (cmd.type === 'blocks/setAll') {
        localBlockFilters = cmd.payload.blocks || [];
      }
      renderBlockFilters();
      renderSavedConfigs();
    }
  }

  function ensureBlockStoreSubscription() {
    if (blockStoreSubscribed) return;
    if (window.__ugrStore && typeof window.__ugrStore.subscribe === 'function') {
      window.__ugrStore.subscribe(() => {
        renderBlockFilters();
        renderSavedConfigs();
      });
      blockStoreSubscribed = true;
    }
  }

  // ─── Perfil en el store ────────────────────────────────────
  // `state.apellido`/`state.turnoPreferente` siguen siendo la caché que lee el
  // render: el store es la capa de persistencia (C3) y la verdad que viaja a
  // IndexedDB, mientras que `saveState()` solo toca localStorage en modo
  // degradado.
  function __getStore() {
    return (window.__ugrStore && typeof window.__ugrStore.getState === 'function') ? window.__ugrStore : null;
  }

  // El store solo manda como persistencia si bootstrap lo abrió y el IndexedDB
  // está disponible. En modo degradado `initStore()` deja igualmente un estado
  // en memoria (no persistible), así que sin este corte app.js dejaría de
  // escribir localStorage y los cambios del usuario se perderían al recargar.
  function isStoreAuthoritative() {
    return !!(__getStore() && !window.__ugrDegraded);
  }

  function dispatchStore(cmd) {
    const store = __getStore();
    if (store && typeof store.dispatch === 'function') store.dispatch(cmd);
  }

  // Ningún `push...ToStore()` puede correr antes de que `loadState()` hidrate la
  // caché: un `state` por defecto (vacío) llegaría al store como un
  // `selection/setAll` destructivo y borraría datos ya migrados. `saveState()`
  // es alcanzable antes de terminar el arranque (p. ej. desde catálogos), de
  // ahí la guarda en el origen y no solo en `init()`.
  let stateHydrated = false;

  function pushProfileToStore() {
    if (!stateHydrated || !__getStore()) return;
    dispatchStore({ type: 'profile/setApellido', payload: { apellido: state.apellido || '' } });
    dispatchStore({ type: 'profile/setTurno', payload: { turno: state.turnoPreferente || 'indiferente' } });
  }

  function hydrateProfileFromStore() {
    const store = __getStore();
    if (!store) return;
    const p = store.getState() && store.getState().profile;
    if (!p) return;
    if (typeof p.apellido === 'string') state.apellido = p.apellido;
    if (typeof p.turnoPreferente === 'string') state.turnoPreferente = p.turnoPreferente;
  }

  function ensureProfileStoreSubscription() {
    const store = __getStore();
    if (!store || typeof store.subscribe !== 'function') return;
    store.subscribe(() => hydrateProfileFromStore());
  }

  // ─── Selección en el store ─────────────────────────────────
  // `state.selectedSubjects`/`state.groupChoices`/`state.cuatrimestreActivo`
  // siguen siendo la caché que lee el render: el store es la persistencia y el
  // destino de la verdad de la migración legacy (selection/setAll).
  function pushSelectionToStore() {
    if (!stateHydrated) return;
    const store = __getStore();
    if (!store) return;
    // Copias profundas: el reducer clona igualmente, pero el payload no debe
    // compartir referencias con la caché local (mutaciones posteriores del
    // usuario no deben reescribir un dispatch ya emitido).
    dispatchStore({ type: 'selection/setAll', payload: {
      selectedSubjects: { ...state.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(state.groupChoices)),
      cuatrimestreActivo: state.cuatrimestreActivo,
    }});
  }

  function hydrateSelectionFromStore() {
    const store = __getStore();
    if (!store) return;
    const s = store.getState();
    if (!s || !s.selection) return;
    // No pisar el estado local con un store vacío (arranque pre-migración:
    // userState inicial sin datos de selección). Si el store sí tiene datos,
    // la caché local pasa a ser un espejo del store.
    if (Object.keys(s.selection.selectedSubjects || {}).length || Object.keys(s.selection.groupChoices || {}).length) {
      state.selectedSubjects = { ...s.selection.selectedSubjects };
      state.groupChoices = JSON.parse(JSON.stringify(s.selection.groupChoices || {}));
    }
    if (s.selection.cuatrimestreActivo === 1 || s.selection.cuatrimestreActivo === 2) {
      state.cuatrimestreActivo = s.selection.cuatrimestreActivo;
    }
  }

  function ensureSelectionStoreSubscription() {
    const store = __getStore();
    if (!store || typeof store.subscribe !== 'function') return;
    store.subscribe(() => hydrateSelectionFromStore());
  }

  // `compareIds` no se guarda en localStorage (es efímero), pero sí vive en el
  // store para sobrevivir a un reload: `loadState()` lo hidrata al arrancar y
  // los toggle lo reenvían.
  function pushCompareIdsToStore() {
    if (!stateHydrated) return;
    const store = __getStore ? __getStore() : null;
    if (!store) return;
    dispatchStore({ type: 'ui/setCompareIds', payload: { ids: Array.isArray(compareIds) ? [...compareIds] : [] } });
  }

  function hydrateCompareIdsFromStore() {
    const store = __getStore();
    if (!store) return;
    const ui = store.getState() && store.getState().ui;
    if (ui && Array.isArray(ui.compareIds)) compareIds = [...ui.compareIds];
  }

  // Igual que `compareIds`, pero **fuera** de `hydrateAllFromStore`: la
  // preferencia puede ser lo único que haya en el store (un usuario que solo
  // encendió «Ignorar profesores»), y en ese caso `storeHasUserData` diría que
  // el store está virgen y la preferencia se perdería al recargar.
  function pushIgnoreDocentsToStore() {
    if (!stateHydrated) return;
    const store = __getStore();
    if (!store) return;
    dispatchStore({ type: 'ui/setIgnoreDocents', payload: { ignoreDocents: !!ignoreDocents } });
  }

  function hydrateIgnoreDocentsFromStore() {
    const store = __getStore();
    if (!store) return;
    const ui = store.getState() && store.getState().ui;
    if (ui && typeof ui.ignoreDocents === 'boolean') ignoreDocents = ui.ignoreDocents;
  }

  /**
   * El interruptor «Ignorar profesores» está en los dos sitios donde importa:
   * el panel del generador (donde se usa) y la sección de profesores (donde
   * vive el dato). Los dos escriben la misma preferencia, así que al mover uno
   * hay que dejar el otro igual.
   */
  function syncIgnoreDocentsInputs() {
    ['solver-ignore-docents', 'profesores-ignore-docents'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.checked = ignoreDocents;
    });
  }

  /**
   * Enciende/apaga el modo profesores. Si al encenderlo estaba elegido el
   * preset «Mejores profesores» se vuelve a «Equilibrado»: un preset cuyo peso
   * depende de datos que ya no existen generaría horarios distintos bajo la
   * misma etiqueta. El bloqueo (`blockGroups`) no se toca: se guarda igual y el
   * solver lo ignora mientras el modo esté activo.
   */
  function setIgnoreDocents(on) {
    ignoreDocents = !!on;
    // La estrategia de profesores depende de unos datos que el modo apagado
    // retira: quien la conoce es la vista del generador.
    const solverView = getSolverView();
    if (solverView) solverView.onIgnoreDocentsChanged();
    pushIgnoreDocentsToStore();
    syncIgnoreDocentsInputs();
    renderSolverFilters();
    renderGroupConfig();
    renderCalendar();
    renderSavedConfigs();
    renderProfesores();
  }

  // Corte único entre "el store existe" y "el store tiene datos de usuario".
  // Un userState recién creado (o solo con valores por defecto) no debe ganarle
  // a un `ugr-horario-state` legacy que aún no se ha migrado: en ese caso la
  // caché sigue el fallback y el push posterior siembra el store.
  function storeHasUserData(s) {
    if (!s) return false;
    const p = s.profile || {};
    if ((p.apellido && p.apellido.trim()) || (p.turnoPreferente && p.turnoPreferente !== 'indiferente')) return true;
    const sel = s.selection || {};
    if (Object.keys(sel.selectedSubjects || {}).length) return true;
    if (Object.keys(sel.groupChoices || {}).length) return true;
    if (s.ui && Array.isArray(s.ui.compareIds) && s.ui.compareIds.length) return true;
    if (s.blocks && s.blocks.length) return true;
    const progress = s.progress || {};
    if (progress.credits && Object.keys(progress.credits).length) return true;
    if (Array.isArray(progress.equivalences) && progress.equivalences.length) return true;
    return false;
  }

  // Hidratación única de las cuatro partes que app.js cachea. Devuelve true
  // si el store aportó datos; false = store virgen → el llamante cae al
  // fallback legacy. Se llama solo desde `loadState()`; la reactividad en vivo
  // la hacen las suscripciones de cada parte.
  function hydrateAllFromStore() {
    const store = isStoreAuthoritative() ? __getStore() : null;
    if (!store) return false;
    const s = store.getState();
    if (!storeHasUserData(s)) return false;
    hydrateProfileFromStore();
    hydrateSelectionFromStore();
    hydrateCompareIdsFromStore();
    return true;
  }


  // ─── Solver ────────────────────────────────────────────────
  // Los tipos de filtro los conoce el adaptador de persistencia y el panel: la
  // lista vive aquí y se le inyecta a la vista (que la usa para validar lo
  // guardado). El resto del estado del generador —filtros, estrategia,
  // resultados y viabilidad— lo posee la vista ESM.
  const SOLVER_FILTER_TYPES = [
    'freeDays', 'maxDays', 'maxMorningDays', 'maxAfternoonDays',
    'earliestStart', 'latestEnd', 'blockGroups', 'preferTurno', 'maxGaps',
    'sameTheoryPerCourse', 'samePracticePerCourse',
  ];

  const DEFAULT_SUBJECTS = JSON.parse(JSON.stringify(SUBJECTS));

  let conflicts = [];

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    // Composición ESM al PRINCIPIO: cualquier render/persistencia
    // posterior (y las funciones de dominio delegadas) necesitan `ugrAppInstance`
    // ya montado. No fatal si el import falla — el monolito sigue siendo la
    // fachada operativa y `getDomain()` avisará solo si alguien lo consulta.
    await ensureUgrApp();
    // El índice de docentes primero: las vistas lo reciben por getter.
    await ensureDocentIndex();
    // La vista de configuraciones se monta aquí, cuando la composición ESM (y su
    // adaptador de persistencia) ya está montada, y es ella la que carga la lista
    // guardada. Si el import o el adaptador fallan, arranca sin configuraciones
    // en vez de romper.
    await ensureSavedConfigsView();
    // La vista del catálogo (desplegable + contraseña) antes de montar acciones.
    await ensureCatalogView();
    // Y la de asignaturas: la lista se pinta desde ella y el modal es suyo.
    await ensureManageSubjectsView();
    // Los bloqueos y la comparación: sus paneles y sus ventanas.
    await ensureBlockFiltersView();
    await ensureCompareView();
    // El resumen de la selección: contadores, conflictos y barra.
    await ensureSummaryView();
    // La de la ficha de asignatura: su ventana y el evento que la pide.
    await ensureAsignaturaFichaView();
    // La del panel de grupos: el plegado y su render se montan aquí.
    await ensureGroupConfigView();
    // La del generador: su panel y su estado. Antes de compartir, que valida la
    // estrategia de un enlace con la tabla de estrategias de esta vista.
    await ensureSolverView();
    // La de profesores: el claustro, la ficha y las valoraciones propias.
    await ensureProfesoresView();
    // La de compartir: monta el diálogo y mira si la URL trae un enlace.
    await ensureShareView();
    const savedConfigsView = getSavedConfigsView();
    if (savedConfigsView) savedConfigsView.loadFromStorage();
    // La vista de materias vive en ESM (features/subjects.js). Se monta
    // antes del primer `renderSubjects()` para que ese render ya delegue; no
    // fatal si el import falla — la delegación queda en no-op.
    await ensureSubjectsView();
    // Los controles de vista del calendario (semana/lista + compacto)
    // viven en ESM. Se cargan antes de `setupActions()` para que ese montaje
    // ya encuentre el feature; no fatal si el import falla — la delegación y
    // el montaje quedan en no-op.
    await ensureCalendarViewFeature();
    // Antes de tocar el catálogo: las valoraciones propias se superponen a los
    // perfiles: son la fuente con la que el índice rehace su fusión
    // construya el índice.
    await loadOwnReviews();
    const catalogCodesChanged = await bootstrapCatalogState();
    // Orden de arranque (C3): HIDRATAR → SUSCRIBIR → PUSH.
    // 1) `loadState()` trae lo ya persistido (store si tiene datos de usuario,
    //    si no el espejo legacy) y solo entonces levanta `stateHydrated`, la
    //    guarda que bloquea cualquier push hecho con la caché por defecto.
    // 2) Las suscripciones van después: la hidratación inicial es un paso
    //    único y controlado; en vivo, cada dispatch del store re-sincroniza.
    // 3) Con la caché ya igualada al store, los pushes vuelcan lo cargado de
    //    localStorage si el store estaba virgen (siembra) y son no-op si no.
    loadState();
    ensureProfileStoreSubscription();
    ensureSelectionStoreSubscription();
    pushProfileToStore();
    pushSelectionToStore();
    pushCompareIdsToStore();
    if (catalogCodesChanged && pruneSelectionsToActiveCatalog()) saveState();
    renderSubjects();
    setupTabs();
    setupConfig();
    setupActions();
    setupNavigation();
    setupCatalogView();
    updateAll();
    checkUrlShare();
    renderBlockFilters();
    ensureBlockStoreSubscription();
  }

  // ─── Persistencia ───────────────────────────────────────────
  function saveState() {
    // Antes de hidratar, la caché sigue en sus defaults: escribir ahora (al
    // espejo o al store) borraría datos ya persistidos por el usuario.
    if (!stateHydrated) return;
    if (window.__ugr && window.__ugr.legacy && window.__ugr.legacy.start) {
      window.dispatchEvent(new CustomEvent("ugr:stateChanged", { detail: state }));
    }
    if (isStoreAuthoritative()) {
      // Modo normal: el store (IDB) es la única persistencia y el espejo
      // `ugr-horario-state` queda retirado (no se mantiene una segunda verdad
      // que además quedaría congelada desde C3). compareIds por si algún camino
      // mutó la caché sin pasar por toggleCompareId. El perfil se envía también
      // porque hay rutas (p. ej. importar configuración) que cambian
      // `state.apellido` sin pasar por su input handler.
      pushProfileToStore();
      pushSelectionToStore();
      pushCompareIdsToStore();
      return;
    }
    // Modo degradado (sin IndexedDB): el store en memoria no sobrevive al
    // reload, así que localStorage vuelve a ser la única garantía.
    localStorage.setItem('ugr-horario-state', JSON.stringify(state));
  }

  function loadState() {
    // 1) Fuente de verdad: el store. Solo manda si bootstrap lo abrió, el IDB
    //    está disponible y trae datos de usuario; un store virgen (arranque
    //    limpio o migración pendiente) cae al fallback de abajo para no tapar
    //    con defaults lo que haya en el espejo legacy.
    if (!hydrateAllFromStore()) {
      // 2) Fallback legacy / pre-migración / degradado: espejo C3 previo.
      try {
        const saved = localStorage.getItem('ugr-horario-state');
        if (saved) {
          const parsed = JSON.parse(saved);
          state = { ...state, ...parsed };
        }
      } catch (e) { /* ignore corrupt mirror */ }
    }
    // La caché ya refleja lo persistido: a partir de aquí se permiten los
    // pushes (fin de la ventana en la que un estado vacío podría pisar datos).
    stateHydrated = true;
    hydrateIgnoreDocentsFromStore();
    // Restore UI from state
    const apellidoInput = document.getElementById('apellido');
    const turnoSelect = document.getElementById('turno-preferente');
    if (apellidoInput) apellidoInput.value = state.apellido || '';
    if (turnoSelect) turnoSelect.value = state.turnoPreferente || 'indiferente';
  }

  // ─── Tabs ───────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.cuatrimestreActivo = parseInt(tab.dataset.cuatrimestre);
        renderSubjects();
        updateControlPanel();
      });
    });
    // Activate correct tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === state.cuatrimestreActivo);
    });
  }

  // ─── Config ─────────────────────────────────────────────────
  function setupConfig() {
    document.getElementById('apellido').addEventListener('input', (e) => {
      state.apellido = e.target.value.trim();
      // Escritura optimista local + espejo en el store (persiste en IDB).
      dispatchStore({ type: 'profile/setApellido', payload: { apellido: state.apellido } });
      applyApellidoRule();
      saveState();
      updateAll();
    });

    document.getElementById('turno-preferente').addEventListener('change', (e) => {
      state.turnoPreferente = e.target.value;
      // Escritura optimista local + espejo en el store (persiste en IDB).
      dispatchStore({ type: 'profile/setTurno', payload: { turno: state.turnoPreferente } });
      saveState();
      updateAll();
    });
  }

  // ─── Apellido Rule ──────────────────────────────────────────
  function getSubgrupoForApellido(apellido) {
    // Delegación: la única implementación vive en ESM
    // (src/app/domain/selection.js).
    return getDomain().getSubgrupoForApellido(apellido);
  }

  function applyApellidoRule() {
    // Guard legacy: sin tramo aplicable no se toca nada (ni se persiste).
    const subgrupoNum = getSubgrupoForApellido(state.apellido);
    if (!subgrupoNum) return;

    // Delegación: solo la mutación de `groupChoices` vive en ESM; la
    // persistencia sigue siendo responsabilidad de este monolito.
    getDomain().applyApellidoSubgroups(
      state.selectedSubjects,
      state.groupChoices,
      SUBJECTS,
      state.apellido
    );
    saveState();
  }

  // ─── Render Subjects ────────────────────────────────────────
  function renderSubjects() {
    // Delegación: el render y sus handlers viven en ESM
    // (src/app/features/subjects.js). Antes de que la vista esté montada
    // (o si su import falló) es un no-op: nunca se cae a una copia legacy.
    const view = getSubjectsView();
    if (view) view.render();
  }

  // ─── Update All ─────────────────────────────────────────────
  function updateAll() {
    detectConflicts();
    renderSubjects();
    renderGroupConfig();
    renderCalendar();
    renderConflicts();
    renderSummary();
    updateSummaryBar();
    updateButtons();
  }

  // ─── Get Active Schedule ────────────────────────────────────
  function getActiveSchedule() {
    // Delegación: la única construcción de entradas vive en ESM
    // (src/app/domain/calendar.js); este monolito solo inyecta el estado.
    return getDomain().buildActiveSchedule(state.selectedSubjects, state.groupChoices, SUBJECTS);
  }

  // ─── Config Metrics ─────────────────────────────────────────
  // ─── Config Metrics ─────────────────────────────────────────
  // Las métricas de una configuración (créditos, horas, días libres) las calcula
  // el dominio y las pide la vista de configuraciones, que lo importa él mismo:
  // aquí ya no queda nada que delegar.

  // ─── Bloqueos ───────────────────────────────────────────────
  // El panel de bloqueos (grupos y topes de días) vive en la vista ESM; aquí
  // quedan el disparador que usa el resto del monolito y la lectura de sus topes.
  function renderBlockFilters() {
    const view = getBlockFiltersView();
    if (view) view.render();
  }

  /** Topes de días por turno: los posee la vista de bloqueos. */
  function getConfigCeilings() {
    const view = getBlockFiltersView();
    return view ? view.getCeilings() : { maxManana: 0, maxTarde: 0 };
  }

  // ─── Comparación ────────────────────────────────────────────
  // La ventana con los mini-calendarios vive en su vista ESM; aquí quedan los
  // disparadores que usa la tabla de configuraciones y el botón flotante (que la
  // vista monta por su cuenta).
  function toggleCompareId(id) {
    const view = getCompareView();
    if (view) view.toggle(id);
  }

  function updateCompareButton() {
    const view = getCompareView();
    if (view) view.updateButton();
  }

  function openCompare(ids) {
    const view = getCompareView();
    if (view) view.open(ids);
  }

  // Guardar, editar y borrar una configuración los vive la vista ESM: aquí solo
  // queda el disparador (botón y Enter del campo de nombre).
  function saveConfig() {
    const view = getSavedConfigsView();
    if (view) view.saveCurrent();
  }

  function loadConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.load(id);
  }

  function deleteConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.remove(id);
  }

  function renderSavedConfigs() {
    const view = getSavedConfigsView();
    if (view) view.render();
  }

  // ─── Conflict Detection ─────────────────────────────────────
  function detectConflicts() {
    // Delegación: la detección pura vive en ESM (metrics.js);
    // este IIFE solo conserva la asignación a su array de estado.
    conflicts = getDomain().findConflicts(getActiveSchedule());
  }

  function timesOverlap(s1, e1, s2, e2) {
    // Delegación: la única implementación vive en ESM (src/app/domain).
    return getDomain().timesOverlap(s1, e1, s2, e2);
  }

  function timeToMinutes(t) {
    // Delegación: la única implementación vive en ESM (src/app/domain).
    return getDomain().timeToMinutes(t);
  }

  // ─── Índice de docentes ─────────────────────────────────────
  // Las dos capas del dato (asignaciones y perfiles) y su fusión —manda la tuya—
  // viven en `src/app/docentes.js`. Aquí quedan los accesos que usan el render y
  // las vistas (que se los llevan inyectados), y la caché de valoraciones, que es
  // la fuente con la que el índice rehace la fusión.
  let ugrDocentIndex = null;

  /** Valoraciones propias: la caché que lee el índice y la pestaña de datos. */
  let ownReviews = [];

  function getDocentInfo(key) {
    return ugrDocentIndex ? ugrDocentIndex.getDocent(key) : null;
  }

  function getProfesorInfo(codigo, letra) {
    return ugrDocentIndex ? ugrDocentIndex.getProfesor(codigo, letra) : null;
  }

  function getProfName(codigo, letra) {
    return ugrDocentIndex ? ugrDocentIndex.getProfName(codigo, letra) : '';
  }

  function getDificultad(codigo, letra) {
    return ugrDocentIndex ? ugrDocentIndex.getDificultad(codigo, letra) : null;
  }

  function getDifficultyScore(dificultad) {
    return ugrDocentIndex ? ugrDocentIndex.getDifficultyScore(dificultad) : null;
  }

  function profesoresList() {
    return ugrDocentIndex ? ugrDocentIndex.profesoresList() : [];
  }

  function hasFicha(nombre) {
    return ugrDocentIndex ? ugrDocentIndex.hasFicha(nombre) : false;
  }

  // La escala (etiquetas y color) la decide el dominio: aquí solo se pregunta.
  // El color viaja como **token CSS** (`var(--diff-cyan)`), no como valor: la
  // hoja de estilos es su dueña y así no puede desviarse entre los dos.
  function getDificultadLabel(d) {
    return getDomain().difficultyLabel(d);
  }

  function getDificultadColor(d) {
    return getDomain().difficultyToken(d);
  }

  /** Clase CSS del color de la escala, para las insignias (fondo). */
  function dificultadClase(d) {
    return getDomain().DIFFICULTY_UI_LABELS[d] ? `diff-${d}` : 'diff-gris';
  }

  /** Insignia de dificultad: la usan la ficha de profesor y la de asignatura. */
  function dificultadBadgeHtml(dificultad) {
    if (!dificultad) return '';
    return `<span class="dificultad-badge ${dificultadClase(dificultad)}">${getDificultadLabel(dificultad)}</span>`;
  }

  // ─── Render Group Config ────────────────────────────────────
  // El panel de grupos (elección de teoría y de subgrupo, con el profesor de
  // cada uno) vive en la vista ESM; aquí queda el disparador que usa el resto
  // del monolito.
  function renderGroupConfig() {
    const view = getGroupConfigView();
    if (view) view.render();
  }

  // ─── Ficha del profesor y listado del claustro ──────────────
  // El listado del claustro, la ficha y las valoraciones propias viven en la
  // vista ESM; aquí queda el disparador que usa el resto del monolito (la
  // pestaña de datos, el cambio de catálogo y el interruptor de profesores).
  function renderProfesores() {
    const view = getProfesoresView();
    if (view) view.renderList();
  }

  // ─── Ficha de asignatura ───────────────────────────────────
  // La ventana con la dificultad y la descripción del plan vive en la vista ESM,
  // que escucha las peticiones de las tarjetas de materia
  // (`ugr:openAsignatura`). La lista de datos, en cambio, la pide por callback:
  // de ahí este disparador.
  function openAsignaturaFicha(codigo, opener) {
    const view = getAsignaturaFichaView();
    if (view) view.open(codigo, opener);
  }

  // ─── Render Calendar ───────────────────────────────────────
  // El render de semana (`renderCalendar`), la vista lista, el tooltip y sus
  // helpers (etiqueta accesible, horas ocupadas, turno) viven en ESM
  // (src/app/features/calendar.js), montados por `ensureCalendarViewFeature`.
  // Aquí queda SOLO la delegación: si el import falló la llamada es un no-op
  // y el monolito arranca sin calendario en vez de romper.
  function renderCalendar() {
    const feature = getCalendarViewFeature();
    if (feature) feature.render();
  }

  // ─── Render Conflicts y resumen ────────────────────────────
  // El panel del resumen, la lista de conflictos, la barra de contadores y el
  // estado de los botones viven en la vista ESM; aquí quedan los disparadores que
  // usa `updateAll`.
  function renderConflicts() {
    const view = getSummaryView();
    if (view) view.renderConflicts();
  }

  function renderSummary() {
    const view = getSummaryView();
    if (view) view.renderSummary();
  }

  function updateSummaryBar() {
    const view = getSummaryView();
    if (view) view.updateSummaryBar();
  }

  function updateButtons() {
    const view = getSummaryView();
    if (view) view.updateButtons();
  }

  // ─── Buttons ────────────────────────────────────────────────
  function updateButtons() {
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    const hasSelection = selectedCodes.length > 0;
    const hasConflicts = conflicts.length > 0;

    document.getElementById('btn-export').disabled = !hasSelection;
    document.getElementById('btn-share').disabled = !hasSelection;
    updateControlPanel();
  }

  function hasSelectedInTerm() {
    return getDomain().hasSelectedInTerm(state.selectedSubjects, SUBJECTS, state.cuatrimestreActivo);
  }

  function updateControlPanel() {
    const canGenerate = hasSelectedInTerm();
    const hint = document.getElementById('control-hint');
    if (hint) hint.hidden = canGenerate;
    // La selección o el cuatrimestre pueden haber cambiado, y con ellos la
    // viabilidad: se revisa (con debounce) antes de decidir el botón.
    scheduleFeasibilityCheck();
    updateGenerateButton();
  }

  function setupActions() {
    document.getElementById('btn-export').addEventListener('click', exportCalendar);
    document.getElementById('btn-share').addEventListener('click', shareLink);
    document.getElementById('btn-clear-selected').addEventListener('click', clearSelected);
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    document.getElementById('config-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveConfig();
    });
    setupManageSubjectsView();
    const mencionSelect = document.getElementById('manage-subjects-mencion');
    if (mencionSelect) mencionSelect.addEventListener('change', renderManageSubjects);
    document.getElementById('btn-export-json').addEventListener('click', exportAllJSON);
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-json-input').click();
    });
    document.getElementById('import-json-input').addEventListener('change', importAllJSON);
    document.getElementById('btn-reset-defaults').addEventListener('click', resetDefaults);
    document.getElementById('btn-export-all-configs').addEventListener('click', exportAllSavedConfigs);
    document.getElementById('btn-delete-all-configs').addEventListener('click', () => {
      if (getSavedConfigs().length === 0) {
        showToast('No hay configuraciones propias que borrar', 'info');
        return;
      }
      if (!confirm('¿Eliminar todas tus configuraciones guardadas?')) return;
      const view = getSavedConfigsView();
      if (view) view.replaceAll([]);
      renderSavedConfigs();
      showToast('Tus configuraciones eliminadas', 'success');
    });
    document.getElementById('btn-import-config').addEventListener('click', () => {
      document.getElementById('import-config-input').click();
    });
    document.getElementById('import-config-input').addEventListener('change', importSavedConfig);
    // La ventana de comparar (y su botón flotante) la monta su vista ESM.

    // Los toggles semana/lista y compacto los gestiona el feature ESM
    // (listeners idempotentes: un `init()` repetido no los duplica).
    const calView = getCalendarViewFeature();
    if (calView) calView.mount();
    renderSavedConfigs();
  }

  // ─── Export ─────────────────────────────────────────────────
  function exportCalendar() {
    const cal = document.getElementById('calendar');
    const canvas = document.createElement('canvas');
    const scale = 2;
    const rect = cal.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    // Use html2canvas if available, otherwise simple fallback
    if (typeof html2canvas !== 'undefined') {
      html2canvas(cal, { scale: 2 }).then(c => {
        downloadCanvas(c, 'horario-ugr.png');
      });
    } else {
      // Simple SVG export fallback
      showToast('Exportación PNG requiere html2canvas. Usa la función de impresión del navegador (Ctrl+P).', 'info');
      window.print();
    }
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ─── Share (enlace cifrado en el hash) ──────────────────────
  // ─── Compartir enlace cifrado ───────────────────────────────
  // El diálogo, la generación del enlace y su restauración viven en la vista
  // ESM; aquí quedan los dos disparadores (el botón y el hash de la URL).
  function shareLink() {
    const view = getShareView();
    if (view) view.open('share');
  }

  function checkUrlShare() {
    const view = getShareView();
    if (view) view.checkUrl();
  }

  // ─── Clear ──────────────────────────────────────────────────
  function clearSelected() {
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    if (selectedCodes.length === 0) {
      showToast('No hay asignaturas seleccionadas', 'info');
      return;
    }
    if (!confirm(`¿Eliminar las ${selectedCodes.length} asignaturas seleccionadas?`)) return;
    selectedCodes.forEach(codigo => {
      delete state.selectedSubjects[codigo];
      delete state.groupChoices[codigo];
    });
    saveState();
    updateAll();
    showToast(`${selectedCodes.length} asignatura(s) eliminada(s)`, 'success');
  }

  // ─── Saved Configs ─────────────────────────────────────────
  // La **vista** (tabla, orden, paginación, acciones) vive en ESM
  // (`src/app/features/savedConfigs.js`). Aquí quedan los datos que la vista
  // recibe y las **mutaciones** (guardar/cargar/borrar/exportar), que el
  // monolito sigue poseyendo y le pasa como intents.
  function getDisplayConfigs() {
    return getSavedConfigs().concat(getSolverView() ? getSolverView().getResults() : []);
  }

  /** Vuelve la tabla a la primera página (la pide quien cambia la lista). */
  function resetConfigsPage() {
    const view = getSavedConfigsView();
    if (view) view.resetPage();
  }

  /** Configuraciones guardadas: las vive la vista; aquí solo se leen. */
  function getSavedConfigs() {
    const view = getSavedConfigsView();
    return view ? view.getAll() : [];
  }

  // ─── Solver UI ─────────────────────────────────────────────
  // El panel del generador —filtros y su persistencia, estrategia, bloqueo de
  // profesores, viabilidad, progreso, cancelación y resultados— vive en la vista
  // ESM. Aquí quedan los disparadores que usa el resto del monolito (la selección,
  // el cambio de catálogo y la restauración de un enlace) y la lectura de su
  // estado.
  function renderSolverFilters() {
    const view = getSolverView();
    if (view) view.renderPanel();
  }

  function scheduleFeasibilityCheck() {
    const view = getSolverView();
    if (view) view.scheduleFeasibility();
  }

  function updateGenerateButton() {
    const view = getSolverView();
    if (view) view.refreshGenerateButton();
  }

  function cancelSolver() {
    const view = getSolverView();
    if (view) view.cancel();
  }

  function saveSolverResult(id) {
    const view = getSolverView();
    if (view) view.saveResult(id);
  }

  function isConfigFavorited(config) {
    // Delegación: la única implementación vive en ESM
    // (src/app/domain/configs.js).
    return getDomain().isConfigFavorited(config);
  }

  function findDuplicateConfig(newGroupChoices, newSelectedSubjects) {
    // Delegación (configs.js): la lista de candidatas se inyecta aquí, leída de
    // la vista que las posee.
    return getDomain().findDuplicateConfig(getSavedConfigs(), newGroupChoices, newSelectedSubjects);
  }

  // Guardar, editar y borrar una configuración los vive la vista ESM: aquí solo
  // queda el disparador (botón y Enter del campo de nombre).
  function saveConfig() {
    const view = getSavedConfigsView();
    if (view) view.saveCurrent();
  }

  function loadConfig(id) {
    // Delegación: aplicarla al estado y sincronizar el perfil es de la vista;
    // persistir y repintar el resto sigue aquí.
    const view = getSavedConfigsView();
    if (view) view.load(id);
  }

  function deleteConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.remove(id);
  }

  /**
   * Pinta la tabla de configuraciones delegando en su vista ESM. Sin vista
   * montada (import fallido) es un no-op, como el resto de vistas.
   */
  function renderSavedConfigs() {
    const view = getSavedConfigsView();
    if (view) view.render();
  }

  // ─── Export/Import JSON ────────────────────────────────────
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportAllJSON() {
    const data = {
      version: 1,
      type: 'ugr-horario-full',
      exportedAt: new Date().toISOString(),
      subjects: SUBJECTS,
      state: { ...state },
      savedConfigs: getSavedConfigs(),
    };
    downloadJSON(data, 'ugr-horario-completo.json');
    showToast('Configuración exportada', 'success');
  }

  function importAllJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);

        if (data.type !== 'ugr-horario-full') {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        if (!confirm('Esto reemplazará toda tu configuración actual. ¿Continuar?')) return;

        if (data.subjects && Array.isArray(data.subjects)) {
          SUBJECTS.length = 0;
          data.subjects.forEach(s => SUBJECTS.push(s));
          saveSubjectsToStorage();
        }

        if (data.state) {
          state = { ...state, ...data.state };
          saveState();
        }

        if (data.savedConfigs && Array.isArray(data.savedConfigs)) {
          const view = getSavedConfigsView();
          if (view) view.replaceAll(data.savedConfigs);
        }

        document.getElementById('apellido').value = state.apellido || '';
        document.getElementById('turno-preferente').value = state.turnoPreferente || 'indiferente';

        renderSavedConfigs();
        updateAll();
        renderSubjects();
        showToast('Configuración importada correctamente', 'success');
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  }

  function resetDefaults() {
    if (!confirm('Esto borrará todos tus datos y restaurará las asignaturas por defecto. ¿Continuar?')) return;

    localStorage.removeItem('ugr-horario-state');
    localStorage.removeItem('ugr-horario-subjects');
    // Las ranuras del formato antiguo las conoce y las vacía el adaptador.
    getPersistence().clearSavedConfigs();

    state = {
      selectedSubjects: {},
      groupChoices: {},
      apellido: '',
      turnoPreferente: 'indiferente',
      cuatrimestreActivo: 1,
    };
    const savedConfigsView = getSavedConfigsView();
    if (savedConfigsView) savedConfigsView.replaceAll([]);

    conflicts = [];

    SUBJECTS.length = 0;
    DEFAULT_SUBJECTS.forEach(s => SUBJECTS.push(JSON.parse(JSON.stringify(s))));
    saveSubjectsToStorage();

    document.getElementById('apellido').value = '';
    document.getElementById('turno-preferente').value = 'indiferente';
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', parseInt(tab.dataset.cuatrimestre) === 1);
    });
    state.cuatrimestreActivo = 1;

    // El store es la persistencia (C3): si el reset solo borra localStorage,
    // el próximo arranque hidrataría del store los datos que aquí se acaban de
    // restaurar y el reset quedaría anulado. `stateHydrated` ya está en true
    // (hubo un init previo), así que estos pushes sí se emiten.
    pushProfileToStore();
    pushSelectionToStore();
    pushCompareIdsToStore();
    saveState();

    resetConfigsPage();
    renderSavedConfigs();
    updateAll();
    renderSubjects();
    showToast('Configuración restaurada por defecto', 'info');
  }

  // ─── Export/Import Single Config ───────────────────────────
  function exportSingleConfig(id) {
    const view = getSavedConfigsView();
    if (view) view.exportOne(id);
  }

  function exportAllSavedConfigs() {
    const view = getSavedConfigsView();
    if (view) view.exportAll();
  }

  function importSavedConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);

        // Delegación: la validación de formato (single/batch → lista) es
        // pura; `null` significa envoltorio no reconocido. Los `id` siguen
        // generándose aquí: son efecto secundario, no regla de dominio.
        const configsToAdd = getDomain().parseConfigImport(data);
        if (!configsToAdd) {
          showToast('Formato de archivo no válido', 'error');
          return;
        }

        configsToAdd.forEach(c => {
          c.id = Date.now() + Math.floor(Math.random() * 1000);
        });

        const view = getSavedConfigsView();
        if (view) view.append(configsToAdd);
        resetConfigsPage();
        renderSavedConfigs();
        showToast(`${configsToAdd.length} configuración(es) importada(s)`, 'success');
      } catch (err) {
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  }

  // ─── Toast ──────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── Navigation ─────────────────────────────────────────────
  function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.view').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const target = document.getElementById('view-' + view);
        if (target) {
          target.style.display = '';
          target.classList.add('active');
        }
        if (view === 'datos') {
          renderManageSubjects();
          renderProfesores();
        }
      });
    });

  }

  // ─── Manage Subjects ────────────────────────────────────────
  // ─── Gestionar asignaturas ──────────────────────────────────
  // La lista, el modal (alta, edición y grupos) y el borrado viven en la vista
  // ESM; aquí queda el disparador y el catálogo, que es **compartido** (el
  // resto de la app lee el mismo array).
  function renderManageSubjects() {
    const view = getManageSubjectsView();
    if (view) view.render();
  }

  // ─── Subjects Storage ───────────────────────────────────────
  // Fuente de verdad: store `catalogs` (IndexedDB) vía window.__ugrCatalog.
  // localStorage solo se usa como fallback en modo degradado (sin store).
  function saveSubjectsToStorage() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    if (!api || !catalog || typeof api.saveCatalog !== 'function') {
      localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
      return;
    }
    api.saveCatalog({ ...catalog, subjects: cloneCatalogValue(SUBJECTS) }, { id: api.getActiveCatalogKey() })
      .then(res => {
        if (res.ok) return api.setActiveCatalogKey(res.id);
        localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
        if (res.error !== 'store_unavailable') showToast('No se pudo guardar en el catálogo', 'error');
        return null;
      })
      .catch(() => {
        localStorage.setItem('ugr-horario-subjects', JSON.stringify(SUBJECTS));
      });
  }

  function loadSubjectsFromStorage() {
    try {
      const saved = localStorage.getItem('ugr-horario-subjects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          SUBJECTS.length = 0;
          parsed.forEach(s => SUBJECTS.push(s));
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ─── Catálogo activo ───────────────────────────────────────
  const LEGACY_CATALOG_ID = 'UGR/GI/legacy-1';
  const LEGACY_SUBJECT_FIELDS = ['aprobada', 'corresponde', 'descripcion'];

  /** Menciones del catálogo activo (con su nombre largo), si las trae. */
  function catalogMenciones() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    return catalog && Array.isArray(catalog.menciones) ? catalog.menciones : [];
  }

  /** Asignaturas del plan que la app no planifica (sin horario), si las trae. */
  function catalogExtraSubjects() {
    const api = getCatalogApi();
    const catalog = api && typeof api.getCatalog === 'function' ? api.getCatalog() : null;
    return catalog && Array.isArray(catalog.extraSubjects) ? catalog.extraSubjects : [];
  }

  function getCatalogApi() {
    return (typeof window !== 'undefined' && window.__ugrCatalog) ? window.__ugrCatalog : null;
  }

  function cloneCatalogValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function loadOwnReviews() {
    const store = __getStore();
    if (store && typeof store.listReviews === 'function') {
      try { ownReviews = await store.listReviews(); } catch (e) { ownReviews = []; }
    }
    if (ugrDocentIndex) ugrDocentIndex.setReviews(ownReviews);
  }

  function syncFromActiveCatalog() {
    const api = getCatalogApi();
    if (!api || typeof api.getCatalog !== 'function') return null;
    const catalog = api.getCatalog();
    if (!catalog || !Array.isArray(catalog.subjects)) return null;

    const prevCodes = new Set(SUBJECTS.map(s => s.codigo));
    let carriedFields = false;
    const incoming = catalog.subjects.map(s => {
      const clone = cloneCatalogValue(s);
      const prev = SUBJECTS.find(p => p.codigo === clone.codigo);
      if (prev) {
        LEGACY_SUBJECT_FIELDS.forEach(field => {
          if (clone[field] === undefined && prev[field] !== undefined) {
            clone[field] = cloneCatalogValue(prev[field]);
            carriedFields = true;
          }
        });
      }
      return clone;
    });

    SUBJECTS.length = 0;
    incoming.forEach(s => SUBJECTS.push(s));
    if (ugrDocentIndex) {
      ugrDocentIndex.rebuild(
        typeof api.getDocents === 'function' ? api.getDocents() : [],
        typeof api.getProfesores === 'function' ? api.getProfesores() : [],
      );
    }

    DEFAULT_SUBJECTS.length = 0;
    incoming.forEach(s => DEFAULT_SUBJECTS.push(cloneCatalogValue(s)));

    const nextCodes = new Set(SUBJECTS.map(s => s.codigo));
    return {
      codesChanged: [...prevCodes].some(code => !nextCodes.has(code)),
      carriedFields,
    };
  }

  function pruneSelectionsToActiveCatalog() {
    const codes = new Set(SUBJECTS.map(s => s.codigo));
    let changed = false;
    Object.keys(state.selectedSubjects).forEach(c => {
      if (!codes.has(c)) {
        delete state.selectedSubjects[c];
        changed = true;
      }
    });
    Object.keys(state.groupChoices).forEach(c => {
      if (!codes.has(c)) {
        delete state.groupChoices[c];
        changed = true;
      }
    });
    return changed;
  }

  // Adopta una única vez el snapshot legacy `ugr-horario-subjects`: se fusiona
  // con el catálogo del store (nunca lo reemplaza) y después se elimina la clave
  // para que no vuelva a competir con el store.
  async function adoptLegacySubjects(api, storeList) {
    const activeId = api.getActiveCatalogKey();
    if (activeId !== LEGACY_CATALOG_ID || storeList.length !== 1) return;
    const catalog = api.getCatalog();
    if (!catalog) return;
    let raw = null;
    try { raw = localStorage.getItem('ugr-horario-subjects'); } catch (e) { return; }
    if (!raw) return;
    let snapshot = null;
    try { snapshot = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(snapshot) || snapshot.length === 0) return;

    const merged = new Map(catalog.subjects.map(s => [s.codigo, s]));
    snapshot.forEach(s => { if (s && s.codigo) merged.set(s.codigo, s); });
    try {
      const res = await api.saveCatalog(
        { ...catalog, subjects: Array.from(merged.values()) },
        { id: activeId },
      );
      if (!res.ok) return;
      // recarga el registro en memoria (saveCatalog solo escribe en IndexedDB)
      await api.setActiveCatalogKey(activeId);
      localStorage.removeItem('ugr-horario-subjects');
    } catch (e) { /* modo degradado */ }
  }

  // El normalizador del catálogo no guarda `aprobada`/`corresponde`/`descripcion`:
  // si el bridge los ha tenido que recuperar del subject legacy, se consolidan en
  // el store para que sobrevivan a cambios de catálogo dentro de la sesión.
  async function persistLegacySubjectFields(api) {
    const catalog = api.getCatalog();
    if (!catalog) return;
    try {
      await api.saveCatalog(
        { ...catalog, subjects: cloneCatalogValue(SUBJECTS) },
        { id: api.getActiveCatalogKey() },
      );
    } catch (e) { /* modo degradado */ }
  }

  async function bootstrapCatalogState() {
    const api = getCatalogApi();
    if (!api || typeof api.getCatalog !== 'function' || !api.getCatalog()) {
      loadSubjectsFromStorage();
      return false;
    }
    let storeList = [];
    try { storeList = await api.listCatalogs(); } catch (e) { storeList = []; }
    if (!storeList.length) {
      loadSubjectsFromStorage();
      return false;
    }
    await adoptLegacySubjects(api, storeList);
    const sync = syncFromActiveCatalog();
    if (sync && sync.carriedFields) await persistLegacySubjectFields(api);
    return sync ? sync.codesChanged : false;
  }

  function refreshAfterCatalogChange() {
    const api = getCatalogApi();
    const sync = syncFromActiveCatalog();
    if (sync) {
      if (sync.carriedFields && api) persistLegacySubjectFields(api);
      if (sync.codesChanged && pruneSelectionsToActiveCatalog()) saveState();
    }
    const solverView = getSolverView();
    if (solverView) solverView.clear();
    updateAll();
    renderManageSubjects();
    renderSolverFilters();
    renderSavedConfigs();
    renderProfesores();
    renderCatalogSelector();
  }

  // El escapado es **un solo conocimiento** y vive en el dominio
  // (src/app/domain/text.js): aquí solo se pregunta. Tenía tres copias.
  function escapeCatalogText(text) {
    return getDomain().escapeHtml(text);
  }

  /** Pinta el desplegable del catálogo activo (vive en la vista ESM). */
  function renderCatalogSelector() {
    const view = getCatalogView();
    if (view) view.renderSelector();
  }

  // ─── Paquete cifrado del autor ──────────────────────────────
  // El flujo (aviso de lo que trae, copia previa, confirmación e importación)
  // vive en la vista del catálogo; aquí queda solo **resolver el módulo**: el
  // `import()` que un script clásico no puede hacer síncrono y el atajo
  // `window.__ugrPackage` que usan las pruebas.
  function loadPackageModule() {
    if (typeof window !== 'undefined' && window.__ugrPackage) {
      return Promise.resolve(window.__ugrPackage);
    }
    return import('/ugr/src/package/unlockPackage.js').then(() => window.__ugrPackage);
  }

  // ─── Composición ESM ───────────────────────────────────────
  // Único puente hacia `src/app/createUgrApp.js`. `import()` dinámico porque
  // este fichero sigue siendo un script clásico sin imports. Dos guardas de
  // idempotencia: la instancia se crea una sola vez y la promesa se cachea,
  // así `init()` repetido (devtools/consola) reutiliza la misma composición en
  // lugar de duplicarla; si el import falla se limpia la promesa para poder
  // reintentar. Los datos clásicos viajan SIEMPRE como thunks: `SUBJECTS` y
  // `DOCENTES` son `const` del global lexical (no propiedades de `window`), al
  // alcance de este cierre.
  let ugrAppInstance = null;
  let ugrAppInitPromise = null;

  /**
   * Acceso a las reglas puras de dominio servidas por la composición ESM.
   * Este IIFE es un script clásico: no puede `import()` síncrono, así que
   * delega en `deps.domain` en lugar de duplicar la implementación.
   * Falla ruidosamente si la composición aún no está lista (arranque
   * interrumpido o `import()` fallido) en vez de caer a una copia legacy.
   */
  function getDomain() {
    // Fuente normal: la composición ESM montada por `init` → `ensureUgrApp`.
    // Escape hatch `window.__ugrAppDomain`: los harnesses (tests/consola) que
    // evalúan este IIFE sin la composición inyectan aquí el MISMO módulo ESM
    // de `src/app/domain/`, nunca una copia propia. Sin ninguna fuente se falla
    // ruidosamente en vez de volver a una implementación legacy.
    const d = (ugrAppInstance && ugrAppInstance.deps && ugrAppInstance.deps.domain)
      || window.__ugrAppDomain;
    if (!d) throw new Error('[ugr] dominio no disponible');
    return d;
  }

  /**
   * Acceso al adaptador de persistencia de configuraciones servido por la
   * composición ESM (`deps.persistence`, instancia creada por `createUgrApp`
   * con `{ storage: window.localStorage }`). Mismo patrón y misma red de
   * seguridad que `getDomain()`: este IIFE no puede importar ESM de forma
   * síncrona, así que delega en el adaptador en vez de duplicar las ranuras
   * `ugr-horario-saved-configs-*`. `window.__ugrAppPersistence` es el escape
   * hatch para harnesses que evalúan el IIFE sin la composición y necesitan
   * inyectar el MISMO módulo `src/app/adapters/persistence.js`.
   */
  function getPersistence() {
    // Fuente normal: la composición ESM montada por `init` → `ensureUgrApp`.
    const p = (ugrAppInstance && ugrAppInstance.deps && ugrAppInstance.deps.persistence)
      || window.__ugrAppPersistence;
    if (!p) throw new Error('[ugr] persistencia no disponible');
    return p;
  }

  function ensureUgrApp() {
    if (ugrAppInstance) return Promise.resolve(ugrAppInstance);
    if (!ugrAppInitPromise) {
      ugrAppInitPromise = import('./src/app/createUgrApp.js')
        .then(({ createUgrApp }) => {
          ugrAppInstance = createUgrApp({
            store: window.__ugrStore,
            catalog: window.__ugrCatalog,
            solver: window.__ugrSolver,
            progress: window.__ugrProgress,
            legacyData: {
              subjects: () => SUBJECTS,
              defaultSubjects: () => (typeof DEFAULT_SUBJECTS !== 'undefined' ? DEFAULT_SUBJECTS : null),
              docentes: () => DOCENTES,
            },
            persistence: { storage: window.localStorage },
            root: document,
            degraded: !!window.__ugrDegraded,
          });
          ugrAppInstance.mount();
          return ugrAppInstance;
        })
        .catch((err) => {
          console.error('[ugr] createUgrApp no pudo iniciarse', err);
          ugrAppInitPromise = null;
          return null;
        });
    }
    return ugrAppInitPromise;
  }

  // ─── Features ESM ──────────────────────────────────────────
  // Mismo patrón (y misma red de seguridad) que `ensureUgrApp`: import
  // dinámico del feature de materias, instancia cacheada y promesa cacheada
  // para que `init()` repetido no duplique la vista. Si el import falla se
  // limpia la promesa para poder reintentar y la vista se queda en `null`:
  // `renderSubjects()` degrada a no-op en vez de romper el arranque.
  // Los thunks leen el estado SIEMPRE corriente (`state`/`conflicts` se
  // reasignan en el IIFE y `SUBJECTS` se muta en sitio).
  let ugrSubjectsView = null;
  let ugrSubjectsInitPromise = null;

  function getSubjectsView() {
    return ugrSubjectsView;
  }

  function ensureSubjectsView() {
    if (ugrSubjectsView) return Promise.resolve(ugrSubjectsView);
    if (!ugrSubjectsInitPromise) {
      ugrSubjectsInitPromise = import('./src/app/features/subjects.js')
        .then(({ createSubjectsView }) => {
          ugrSubjectsView = createSubjectsView({
            document,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConflicts: () => conflicts,
            saveState,
            updateAll,
            getMenciones: () => catalogMenciones(),
            getDificultadLabel,
          });
          return ugrSubjectsView;
        })
        .catch((err) => {
          console.error('[ugr] subjects view no pudo iniciarse', err);
          ugrSubjectsInitPromise = null;
          return null;
        });
    }
    return ugrSubjectsInitPromise;
  }

  // ─── Features ESM ──────────────────────────────────────────
  // Mismo patrón (y misma red de seguridad) que `ensureSubjectsView`: import
  // dinámico del feature del calendario (controles de vista + renders de
  // semana/lista + tooltip), instancia cacheada y promesa cacheada. La
  // instancia es única para que `mount()` sea idempotente: `init()` repetido
  // re-monta SIN duplicar los listeners de los botones estáticos `#btn-view-*`.
  // Si el import falla se limpia la promesa para poder reintentar y el feature
  // se queda en `null` (delegaciones no-op). Los thunks leen el estado SIEMPRE
  // corriente (`state`/`conflicts` se reasignan en el IIFE, `SUBJECTS` se muta
  // en sitio) y las constantes de rejilla se inyectan tal cual porque otras
  // vistas del monolito siguen usando `DAYS`/`DAY_LABELS`/horas.
  let ugrCalendarView = null;
  let ugrCalendarInitPromise = null;

  function getCalendarViewFeature() {
    return ugrCalendarView;
  }

  function ensureCalendarViewFeature() {
    if (ugrCalendarView) return Promise.resolve(ugrCalendarView);
    if (!ugrCalendarInitPromise) {
      ugrCalendarInitPromise = import('./src/app/features/calendar.js')
        .then(({ createCalendarView }) => {
          ugrCalendarView = createCalendarView({
            document,
            window,
            storage: window.localStorage,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConflicts: () => conflicts,
            getActiveSchedule: () => getActiveSchedule(),
            days: DAYS,
            dayLabels: DAY_LABELS,
            startHour: START_HOUR,
            endHour: END_HOUR,
            // «Ignorar profesores»: el modo también apaga lo que se ve,
            // así que el calendario recibe lookups vacíos mientras esté activo
            // (el punto de dificultad y la línea del profesor del tooltip
            // desaparecen sin tocar el feature).
            getDificultad: (codigo, letra) => (ignoreDocents ? null : getDificultad(codigo, letra)),
            getDificultadLabel,
            getDificultadColor,
            getProfName: (codigo, letra) => (ignoreDocents ? '' : getProfName(codigo, letra)),
          });
          return ugrCalendarView;
        })
        .catch((err) => {
          console.error('[ugr] calendar view no pudo iniciarse', err);
          ugrCalendarInitPromise = null;
          return null;
        });
    }
    return ugrCalendarInitPromise;
  }

  // ─── Features ESM: vista de configuraciones guardadas ──────
  // Mismo patrón que `ensureSubjectsView`/`ensureCalendarViewFeature`: import
  // dinámico con instancia y promesa cacheadas, para que `init()` repetido no
  // duplique los listeners de la tabla. Recibe del monolito los datos y las
  // mutaciones (como intents); si el import falla, la vista queda en `null` y
  // `renderSavedConfigs()` degrada a no-op.
  let ugrSavedConfigsView = null;
  let ugrSavedConfigsInitPromise = null;

  function getSavedConfigsView() {
    return ugrSavedConfigsView;
  }

  function ensureSavedConfigsView() {
    if (ugrSavedConfigsView) return Promise.resolve(ugrSavedConfigsView);
    if (!ugrSavedConfigsInitPromise) {
      ugrSavedConfigsInitPromise = import('./src/app/features/savedConfigs.js')
        .then(({ createSavedConfigsView }) => {
          ugrSavedConfigsView = createSavedConfigsView({
            document,
            getState: () => state,
            persistence: getPersistence(),
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            onConfigLoaded: () => {
              pushProfileToStore();
              saveState();
              updateAll();
            },
            download: downloadJSON,
            escape: escapeCatalogText,
            getSubjects: () => SUBJECTS,
            getExtraConfigs: () => (getSolverView() ? getSolverView().getResults() : []),
            weekdays: DAYS,
            getBlocks,
            getCeilings: getConfigCeilings,
            getCompareIds: () => compareIds,
            // Con «Ignorar profesores» se inyecta un lookup vacío, igual que en
            // el resto de la app: la columna «Prof» queda a hueco.
            getDificultad: (codigo, letra) => (ignoreDocents ? null : getDificultad(codigo, letra)),
            difficultyScore: getDifficultyScore,
            dayShort: DAY_SHORT,
            onLoad: loadConfig,
            onSaveSolver: saveSolverResult,
            onExport: exportSingleConfig,
            onCompare: toggleCompareId,
          });
          return ugrSavedConfigsView;
        })
        .catch((err) => {
          console.error('[ugr] saved configs view no pudo iniciarse', err);
          ugrSavedConfigsInitPromise = null;
          return null;
        });
    }
    return ugrSavedConfigsInitPromise;
  }

  // ─── Features ESM: gestionar asignaturas ───────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. El catálogo
  // es la referencia **compartida** del monolito (se muta en sitio), así que se
  // le pasa el getter; persistir el catálogo y repintar siguen siendo suyos.
  let ugrManageSubjectsView = null;
  let ugrManageSubjectsInitPromise = null;

  function getManageSubjectsView() {
    return ugrManageSubjectsView;
  }

  function ensureManageSubjectsView() {
    if (ugrManageSubjectsView) return Promise.resolve(ugrManageSubjectsView);
    if (!ugrManageSubjectsInitPromise) {
      ugrManageSubjectsInitPromise = import('./src/app/features/manageSubjects.js')
        .then(({ createManageSubjectsView }) => {
          ugrManageSubjectsView = createManageSubjectsView({
            document,
            getSubjects: () => SUBJECTS,
            getState: () => state,
            getDomain,
            getExtraSubjects: catalogExtraSubjects,
            getMenciones: catalogMenciones,
            escape: escapeCatalogText,
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            persist: saveSubjectsToStorage,
            onBoard: saveState,
            onChanged: updateAll,
            onOpenAsignatura: openAsignaturaFicha,
            days: DAYS,
            dayLabels: DAY_LABELS,
          });
          return ugrManageSubjectsView;
        })
        .catch((err) => {
          console.error('[ugr] manage subjects view no pudo iniciarse', err);
          ugrManageSubjectsInitPromise = null;
          return null;
        });
    }
    return ugrManageSubjectsInitPromise;
  }

  function setupManageSubjectsView() {
    const view = getManageSubjectsView();
    if (view) view.setup();
  }

  // ─── Composición ESM: el índice de docentes ────────────────
  // Mismo patrón de import dinámico con instancia y promesa cacheadas. Se monta
  // al principio de `init` porque las vistas lo reciben por getter.
  let ugrDocentInitPromise = null;

  function ensureDocentIndex() {
    if (ugrDocentIndex) return Promise.resolve(ugrDocentIndex);
    if (!ugrDocentInitPromise) {
      ugrDocentInitPromise = import('./src/app/docentes.js')
        .then(({ createDocentIndex }) => {
          ugrDocentIndex = createDocentIndex({
            docents: typeof DOCENTES !== 'undefined' ? DOCENTES : [],
            profesores: typeof PROFESORES !== 'undefined' ? PROFESORES : [],
            catalogApi: getCatalogApi,
          });
          return ugrDocentIndex;
        })
        .catch((err) => {
          console.error('[ugr] el índice de docentes no pudo iniciarse', err);
          ugrDocentInitPromise = null;
          return null;
        });
    }
    return ugrDocentInitPromise;
  }

  // ─── Features ESM: los bloqueos ────────────────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas.
  let ugrBlockFiltersView = null;
  let ugrBlockFiltersInitPromise = null;

  function getBlockFiltersView() {
    return ugrBlockFiltersView;
  }

  function ensureBlockFiltersView() {
    if (ugrBlockFiltersView) return Promise.resolve(ugrBlockFiltersView);
    if (!ugrBlockFiltersInitPromise) {
      ugrBlockFiltersInitPromise = import('./src/app/features/blockFilters.js')
        .then(({ createBlockFiltersView }) => {
          ugrBlockFiltersView = createBlockFiltersView({
            document,
            getSubjects: () => SUBJECTS,
            getBlocks,
            dispatchBlock,
            onFiltersChanged: () => {
              resetConfigsPage();
              renderSavedConfigs();
            },
          });
          ugrBlockFiltersView.setup();
          return ugrBlockFiltersView;
        })
        .catch((err) => {
          console.error('[ugr] block filters view no pudo iniciarse', err);
          ugrBlockFiltersInitPromise = null;
          return null;
        });
    }
    return ugrBlockFiltersInitPromise;
  }

  // ─── Features ESM: la comparación ──────────────────────────
  // Mismo patrón. La marca de lo que se compara sigue siendo del monolito (vive
  // en el store); la vista la lee y avisa por intent cuando cambia.
  let ugrCompareView = null;
  let ugrCompareInitPromise = null;

  function getCompareView() {
    return ugrCompareView;
  }

  function ensureCompareView() {
    if (ugrCompareView) return Promise.resolve(ugrCompareView);
    if (!ugrCompareInitPromise) {
      ugrCompareInitPromise = import('./src/app/features/compare.js')
        .then(({ createCompareView }) => {
          const calView = getCalendarViewFeature();
          ugrCompareView = createCompareView({
            document,
            getSubjects: () => SUBJECTS,
            getDisplayConfigs,
            getCompareIds: () => compareIds,
            onCompareChanged: () => {
              pushCompareIdsToStore();
              updateCompareButton();
              renderSavedConfigs();
            },
            onCompareDone: () => {
              compareIds = [];
              pushCompareIdsToStore();
              updateCompareButton();
              renderSavedConfigs();
            },
            dayLabels: DAY_LABELS,
            weekdays: DAYS,
            startHour: START_HOUR,
            endHour: END_HOUR,
            getDificultad,
            getDificultadLabel,
            isIgnoringDocents: () => ignoreDocents,
            buildEventLabel: calView ? (entry, mini) => calView.buildEventLabel(entry, mini) : null,
          });
          ugrCompareView.setup();
          return ugrCompareView;
        })
        .catch((err) => {
          console.error('[ugr] compare view no pudo iniciarse', err);
          ugrCompareInitPromise = null;
          return null;
        });
    }
    return ugrCompareInitPromise;
  }

  // ─── Features ESM: el resumen de la selección ──────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas.
  let ugrSummaryView = null;
  let ugrSummaryInitPromise = null;

  function getSummaryView() {
    return ugrSummaryView;
  }

  function ensureSummaryView() {
    if (ugrSummaryView) return Promise.resolve(ugrSummaryView);
    if (!ugrSummaryInitPromise) {
      ugrSummaryInitPromise = import('./src/app/features/summary.js')
        .then(({ createSummaryView }) => {
          ugrSummaryView = createSummaryView({
            document,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getConflicts: () => conflicts,
            dayLabels: DAY_LABELS,
            onUpdateControlPanel: updateControlPanel,
          });
          return ugrSummaryView;
        })
        .catch((err) => {
          console.error('[ugr] summary view no pudo iniciarse', err);
          ugrSummaryInitPromise = null;
          return null;
        });
    }
    return ugrSummaryInitPromise;
  }

  // ─── Features ESM: la ficha de asignatura ──────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas.
  let ugrAsignaturaFichaView = null;
  let ugrAsignaturaFichaInitPromise = null;

  function getAsignaturaFichaView() {
    return ugrAsignaturaFichaView;
  }

  function ensureAsignaturaFichaView() {
    if (ugrAsignaturaFichaView) return Promise.resolve(ugrAsignaturaFichaView);
    if (!ugrAsignaturaFichaInitPromise) {
      ugrAsignaturaFichaInitPromise = import('./src/app/features/asignaturaFicha.js')
        .then(({ createAsignaturaFichaView }) => {
          ugrAsignaturaFichaView = createAsignaturaFichaView({
            document,
            getSubjects: () => SUBJECTS,
            escape: escapeCatalogText,
            dificultadBadgeHtml,
          });
          ugrAsignaturaFichaView.setup();
          return ugrAsignaturaFichaView;
        })
        .catch((err) => {
          console.error('[ugr] asignatura ficha view no pudo iniciarse', err);
          ugrAsignaturaFichaInitPromise = null;
          return null;
        });
    }
    return ugrAsignaturaFichaInitPromise;
  }

  // ─── Features ESM: el panel de grupos ──────────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. La vista
  // solo pinta y encola la elección; el apellido y los docentes entran por
  // getter, que cambian en caliente.
  let ugrGroupConfigView = null;
  let ugrGroupConfigInitPromise = null;

  function getGroupConfigView() {
    return ugrGroupConfigView;
  }

  function ensureGroupConfigView() {
    if (ugrGroupConfigView) return Promise.resolve(ugrGroupConfigView);
    if (!ugrGroupConfigInitPromise) {
      ugrGroupConfigInitPromise = import('./src/app/features/groupConfig.js')
        .then(({ createGroupConfigView }) => {
          ugrGroupConfigView = createGroupConfigView({
            document,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            dayLabels: DAY_LABELS,
            getProfName,
            getDificultad,
            dificultadBadgeHtml,
            hasFicha,
            isIgnoringDocents: () => ignoreDocents,
            escape: escapeCatalogText,
            getSubgrupoForApellido,
            onGroupChosen: () => {
              saveState();
              updateAll();
            },
          });
          ugrGroupConfigView.setup();
          return ugrGroupConfigView;
        })
        .catch((err) => {
          console.error('[ugr] group config view no pudo iniciarse', err);
          ugrGroupConfigInitPromise = null;
          return null;
        });
    }
    return ugrGroupConfigInitPromise;
  }

  // ─── Features ESM: la pestaña de profesores ────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. La vista
  // posee el estado de la pantalla (la ficha abierta y la valoración en edición)
  // y lee el índice de docentes y la caché de valoraciones por getter, que los
  // rehace el monolito al cambiar de catálogo.
  let ugrProfesoresView = null;
  let ugrProfesoresInitPromise = null;

  function getProfesoresView() {
    return ugrProfesoresView;
  }

  function ensureProfesoresView() {
    if (ugrProfesoresView) return Promise.resolve(ugrProfesoresView);
    if (!ugrProfesoresInitPromise) {
      ugrProfesoresInitPromise = import('./src/app/features/profesores.js')
        .then(({ createProfesoresView }) => {
          ugrProfesoresView = createProfesoresView({
            document,
            window,
            getSubjects: () => SUBJECTS,
            getProfesores: profesoresList,
            getOwnReviews: () => ownReviews,
            reloadOwnReviews: loadOwnReviews,
            saveReviews: async (reviews) => {
              const store = __getStore();
              if (!store || typeof store.saveReviews !== 'function') return null;
              return store.saveReviews(reviews);
            },
            deleteReview: async (clave) => {
              const store = __getStore();
              if (!store || typeof store.deleteReview !== 'function') return null;
              return store.deleteReview(clave);
            },
            onToggleIgnoreDocents: setIgnoreDocents,
            syncIgnoreDocentsInputs,
            dificultadBadgeHtml,
            escape: escapeCatalogText,
            download: downloadJSON,
            confirmFn: (mensaje) => confirm(mensaje),
            onChanged: updateAll,
          });
          ugrProfesoresView.setup();
          return ugrProfesoresView;
        })
        .catch((err) => {
          console.error('[ugr] profesores view no pudo iniciarse', err);
          ugrProfesoresInitPromise = null;
          return null;
        });
    }
    return ugrProfesoresInitPromise;
  }

  // ─── Features ESM: el panel del generador ──────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. La vista
  // posee el estado del panel (filtros, estrategia, resultados y viabilidad) y el
  // monolito se lo lee por getters; el catálogo, la preferencia de profesores y
  // los datos de docentes entran por getter porque cambian en caliente.
  let ugrSolverView = null;
  let ugrSolverInitPromise = null;

  function getSolverView() {
    return ugrSolverView;
  }

  function ensureSolverView() {
    if (ugrSolverView) return Promise.resolve(ugrSolverView);
    if (!ugrSolverInitPromise) {
      ugrSolverInitPromise = import('./src/app/features/solver.js')
        .then(({ createSolverView }) => {
          ugrSolverView = createSolverView({
            document,
            window,
            getState: () => state,
            getSubjects: () => SUBJECTS,
            getPassedCodes: () => (window.__ugrProgress && window.__ugrProgress.getPassedCodes ? window.__ugrProgress.getPassedCodes() : []),
            filterTypes: SOLVER_FILTER_TYPES,
            isIgnoringDocents: () => ignoreDocents,
            onToggleIgnoreDocents: setIgnoreDocents,
            weekdays: DAYS,
            dayLabels: DAY_LABELS,
            getDocentInfo,
            getProfesorInfo,
            getDificultad,
            difficultyToken: getDificultadColor,
            difficultyScore: getDifficultyScore,
            hasSelectedInTerm,
            onResultsCleared: resetConfigsPage,
            onResultsReady: renderSavedConfigs,
            onSaveResult: (cfg) => {
              const view = getSavedConfigsView();
              if (view) {
                view.append([{
                  id: Date.now(),
                  name: cfg.name,
                  selectedSubjects: { ...cfg.selectedSubjects },
                  groupChoices: JSON.parse(JSON.stringify(cfg.groupChoices)),
                  apellido: cfg.apellido,
                  turnoPreferente: cfg.turnoPreferente,
                }]);
              }
            },
            notify: showToast,
          });
          ugrSolverView.setup();
          return ugrSolverView;
        })
        .catch((err) => {
          console.error('[ugr] solver view no pudo iniciarse', err);
          ugrSolverInitPromise = null;
          return null;
        });
    }
    return ugrSolverInitPromise;
  }

  // ─── Features ESM: compartir por enlace ────────────────────
  // Mismo patrón: import dinámico con instancia y promesa cacheadas. El estado y
  // los filtros son del monolito: se ceden por getters y se aplican por intents.
  let ugrShareView = null;
  let ugrShareInitPromise = null;

  function getShareView() {
    return ugrShareView;
  }

  function ensureShareView() {
    if (ugrShareView) return Promise.resolve(ugrShareView);
    if (!ugrShareInitPromise) {
      ugrShareInitPromise = import('./src/app/features/share.js')
        .then(({ createShareView }) => {
          ugrShareView = createShareView({
            document,
            window,
            getState: () => state,
            getFilters: () => (getSolverView() ? getSolverView().getFilters() : []),
            getStrategy: () => (getSolverView() ? getSolverView().getStrategy() : 'balanced'),
            onApplyFilters: (filtros, estrategia) => {
              const view = getSolverView();
              if (view) view.applyFilters(filtros, estrategia);
            },
            onProfileChanged: pushProfileToStore,
            onPruneSelections: pruneSelectionsToActiveCatalog,
            onStateApplied: () => {
              saveState();
              renderSolverFilters();
              updateAll();
            },
            notify: showToast,
            filterTypes: SOLVER_FILTER_TYPES,
            strategies: getSolverView() ? getSolverView().getStrategies() : {},
          });
          ugrShareView.setup();
          return ugrShareView;
        })
        .catch((err) => {
          console.error('[ugr] share view no pudo iniciarse', err);
          ugrShareInitPromise = null;
          return null;
        });
    }
    return ugrShareInitPromise;
  }

  // ─── Features ESM: vista del catálogo y del paquete ────────
  // Mismo patrón que las demás: import dinámico con instancia y promesa
  // cacheadas. La vista pide la frontera del catálogo, los avisos y las
  // confirmaciones; el módulo del paquete sí lo resuelve el monolito (arriba),
  // porque es él quien puede hacer el `import()`.
  let ugrCatalogView = null;
  let ugrCatalogInitPromise = null;

  function getCatalogView() {
    return ugrCatalogView;
  }

  function ensureCatalogView() {
    if (ugrCatalogView) return Promise.resolve(ugrCatalogView);
    if (!ugrCatalogInitPromise) {
      ugrCatalogInitPromise = import('./src/app/features/catalog.js')
        .then(({ createCatalogView }) => {
          ugrCatalogView = createCatalogView({
            document,
            getCatalogApi,
            escape: escapeCatalogText,
            notify: showToast,
            confirmFn: (mensaje) => confirm(mensaje),
            download: downloadJSON,
            onCatalogChanged: refreshAfterCatalogChange,
            exportAll: exportAllJSON,
            getPackageModule: loadPackageModule,
          });
          return ugrCatalogView;
        })
        .catch((err) => {
          console.error('[ugr] catalog view no pudo iniciarse', err);
          ugrCatalogInitPromise = null;
          return null;
        });
    }
    return ugrCatalogInitPromise;
  }

  function setupCatalogView() {
    const view = getCatalogView();
    if (view) view.setup();
  }

  // ─── Start ──────────────────────────────────────────────────
  // Puente hacia bootstrap (init) y hacia la consola/tests: `loadState` y
  // `saveState` exponen el contrato de persistencia (store ↔ espejo legacy).
  window.__ugrLegacy = {
    init,
    getState: () => ({ ...state }),
    loadState,
    saveState,
  };

})();
