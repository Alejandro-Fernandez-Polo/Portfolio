/**
 * El plan de estudios en la lista de asignaturas: qué tipo es cada una y el
 * filtro por mención.
 *
 * El plan lo trae el catálogo —`caracter` y `mencion` en cada asignatura, y el
 * nombre largo de cada mención en `menciones`—, así que un catálogo sin él
 * (una muestra sin volcado) no inventa nada: etiquetas vacías y ninguna opción
 * de mención que ofrecer.
 *
 * Sin DOM: el llamante decide dónde se pinta.
 */

const MENCION_COMUN = "Común";

/**
 * Cubos de carácter: los cuatro caracteres del plan reducidos a tres, porque
 * «Obligatoria de Rama» **es** la obligatoria de una mención.
 */
const CLAVES_DE_CARACTER = {
  "Básica": "basica",
  "Obligatoria": "obligatoria",
  "Obligatoria de Rama": "obligatoria",
  "Optativa": "optativa",
  "Trabajo Fin de Grado": "tfg",
};

/**
 * Clave del tipo de una asignatura, para pintarla: la **mención** (o `comun`
 * cuando no pertenece a ninguna) y su carácter. Así cada mención tiene su color
 * y dentro de ella se distinguen sus obligatorias de sus optativas, que es lo
 * que se pidió, sin necesitar un color por cada combinación posible.
 *
 * Devuelve cadena vacía si el catálogo no trae el plan: entonces la celda se
 * queda sin fondo en vez de fingir un tipo.
 *
 * @param {Object} subject asignatura del catálogo.
 * @returns {string} por ejemplo `csi-optativa`, `comun-basica` o ``.
 */
export function tipoClave(subject) {
  const caracter = CLAVES_DE_CARACTER[(subject && subject.caracter) || ""];
  if (!caracter) return "";
  const mencion = (subject && subject.mencion) || "";
  const ambito = mencion && mencion !== MENCION_COMUN ? mencion.toLowerCase() : "comun";
  return `${ambito}-${caracter}`;
}

/**
 * Clave de la mención de una asignatura, para pintarla en el horario: el código
 * en minúsculas (`csi`, `is`, `ti`, `si`, `ic`) o `comun` cuando no es de
 * ninguna. A diferencia de `tipoClave`, aquí el carácter no entra: en la lista
 * de asignaturas el color distingue menciones, no tipos.
 *
 * @param {Object} subject asignatura del catálogo.
 * @returns {string} `comun` | `csi` | `is` | `ti` | `si` | `ic`.
 */
export function mencionClave(subject) {
  const mencion = (subject && subject.mencion) || "";
  return mencion && mencion !== MENCION_COMUN ? mencion.toLowerCase() : "comun";
}

/**
 * Tipo de una asignatura: su carácter y, cuando pertenece a una mención, la
 * mención. Las del núcleo común no la llevan: una `Básica` o una `Obligatoria`
 * son de todos, no de una especialidad.
 *
 * @param {Object} subject asignatura del catálogo.
 * @returns {string} etiqueta, o cadena vacía si el catálogo no trae el plan.
 */
export function tipoDeAsignatura(subject) {
  const caracter = (subject && subject.caracter) || "";
  const mencion = (subject && subject.mencion) || "";
  if (caracter && mencion && mencion !== MENCION_COMUN) return `${caracter} · Mención ${mencion}`;
  return caracter;
}

/**
 * Orden de los caracteres en la lista: primero lo que cursa todo el mundo y al
 * final las optativas, que es como se lee un plan. Lo que no trae carácter
 * (catálogo sin plan) va detrás de todo.
 */
const ORDEN_DE_CARACTER = {
  "Básica": 0,
  "Obligatoria": 1,
  "Obligatoria de Rama": 2,
  "Optativa": 3,
};

export function rangoDeCaracter(subject) {
  return ORDEN_DE_CARACTER[(subject && subject.caracter) || ""] ?? 4;
}

/** Las del núcleo común van antes que las de una mención, y luego por código. */
function mencionParaOrdenar(subject) {
  const mencion = (subject && subject.mencion) || "";
  return mencion === MENCION_COMUN ? "" : mencion;
}

/** Curso numérico; «Opt» (datos antiguos) va al final. */
export function rangoDeCurso(fila) {
  const curso = fila && fila.curso;
  if (curso === "Opt") return Number.MAX_SAFE_INTEGER;
  return Number(curso) || 0;
}

/**
 * Orden de la lista de asignaturas: **curso, cuatrimestre, tipo y nombre**. Vale
 * para la lista de datos y para la tabla del progreso —la regla es la misma—,
 * así que acepta las dos formas de fila (`cuatrimestre`/`term`, `nombre`/`name`,
 * `codigo`/`code`).
 *
 * @param {Object} a fila.
 * @param {Object} b fila.
 * @returns {number}
 */
export function compararAsignaturas(a, b) {
  const cuatrimestre = (fila) => Number(fila.cuatrimestre ?? fila.term) || 0;
  const nombre = (fila) => String(fila.nombre ?? fila.name ?? "");
  const codigo = (fila) => String(fila.codigo ?? fila.code ?? "");
  return (
    rangoDeCurso(a) - rangoDeCurso(b) ||
    cuatrimestre(a) - cuatrimestre(b) ||
    rangoDeCaracter(a) - rangoDeCaracter(b) ||
    mencionParaOrdenar(a).localeCompare(mencionParaOrdenar(b)) ||
    nombre(a).localeCompare(nombre(b)) ||
    codigo(a).localeCompare(codigo(b))
  );
}

/**
 * Las asignaturas que ve la lista de datos: las del catálogo —con horario, que
 * se pueden editar— y las del plan que la app no planifica, que entran en modo
 * lectura porque no traen ECTS ni grupos. Cada fila dice de dónde viene con
 * `enCatalogo`.
 *
 * Se ordenan por **curso, cuatrimestre, tipo y nombre**: así cada cuatrimestre
 * queda agrupado y, dentro de él, las asignaturas del mismo tipo salen juntas
 * (con su color) en vez de mezcladas.
 *
 * @param {Array} subjects asignaturas del catálogo.
 * @param {Array} [extraSubjects] asignaturas del plan sin horario.
 * @returns {Array} filas unificadas.
 */
export function listPlanSubjects(subjects, extraSubjects = []) {
  const delCatalogo = (Array.isArray(subjects) ? subjects : []).map((s) => ({
    ...s,
    enCatalogo: true,
  }));
  const soloPlan = (Array.isArray(extraSubjects) ? extraSubjects : []).map((s) => ({
    ...s,
    enCatalogo: false,
  }));
  return [...delCatalogo, ...soloPlan].sort(compararAsignaturas);
}

/**
 * Menciones presentes en un conjunto de asignaturas, en orden alfabético y con
 * su nombre largo cuando el catálogo lo trae.
 *
 * @param {Array} subjects asignaturas del catálogo.
 * @param {Array} [menciones] bloque `menciones` del catálogo.
 * @returns {Array<{codigo: string, nombre: string}>}
 */
export function mencionOptions(subjects, menciones = []) {
  const nombres = new Map(
    (Array.isArray(menciones) ? menciones : []).map((m) => [m && m.codigo, (m && m.nombre) || ""]),
  );
  const codigos = new Set();
  for (const subject of Array.isArray(subjects) ? subjects : []) {
    const mencion = subject && subject.mencion;
    if (mencion && mencion !== MENCION_COMUN) codigos.add(mencion);
  }
  return [...codigos].sort().map((codigo) => ({ codigo, nombre: nombres.get(codigo) || "" }));
}

/**
 * Asignaturas visibles con una mención elegida: se ocultan **solo** las de otra
 * mención. Las del núcleo común —básicas y obligatorias, con `mencion` «Común»
 * o sin mención— siguen viéndose, porque son de todos.
 *
 * Es la regla de los **dos** filtros de mención: el de la lista de datos (donde
 * se monta el horario) y el de la tabla del progreso (donde se revisa el plan).
 *
 * @param {Array} subjects asignaturas del catálogo, o filas con `mencion`.
 * @param {string} mencion código de mención; vacío = sin filtro.
 * @returns {Array} las asignaturas que se ven.
 */
export function filterSubjectsByMention(subjects, mencion) {
  const list = Array.isArray(subjects) ? subjects : [];
  if (!mencion) return list;
  return list.filter((subject) => {
    const suya = (subject && subject.mencion) || "";
    return !suya || suya === MENCION_COMUN || suya === mencion;
  });
}
