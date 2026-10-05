export const CATALOG_TEMPLATE_HEADERS = [
  "Asignatura",
  "Nombre",
  "Curso",
  "Cuatrimestre",
  "Créditos",
  "Grupo",
  "Turno",
  "Tipo",
  "Subgrupo",
  "Día",
  "Inicio",
  "Fin",
];

export const TEMPLATE_MAPPING = {
  codigo: "Asignatura",
  nombre: "Nombre",
  curso: "Curso",
  cuatrimestre: "Cuatrimestre",
  creditos: "Créditos",
  grupo: "Grupo",
  turno: "Turno",
  tipo: "Tipo",
  subgrupo: "Subgrupo",
  dia: "Día",
  inicio: "Inicio",
  fin: "Fin",
};

const TEMPLATE_ROWS = [
  ["FFT", "Fundamentos Físicos y Tecnológicos", "1", "1", "6", "A", "", "Teoría", "", "Lunes", "09:30", "11:30"],
  ["FFT", "Fundamentos Físicos y Tecnológicos", "1", "1", "6", "A", "", "Práctica", "A1", "Martes", "11:30", "12:30"],
];

function escapeCell(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCSV(rows) {
  return `${rows.map((row) => row.map(escapeCell).join(",")).join("\n")}\n`;
}

export function buildTemplateCSV() {
  return toCSV([CATALOG_TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
}
