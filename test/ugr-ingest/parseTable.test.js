import { describe, it, expect } from "vitest";
import { parseTable } from "../../public/ugr/src/ingest/parseTable.js";

describe("parseTable", () => {
  it("parsea tabla TSV con cabeceras", () => {
    const res = parseTable("Asignatura\tGrupo\tDía\nFFT\tA\tlunes");
    expect(res.headers).toEqual(["Asignatura", "Grupo", "Día"]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[1]).toEqual(["FFT", "A", "lunes"]);
    expect(res.problems).toEqual([]);
  });

  it("descarta celdas vacías finales típicas de Excel", () => {
    const res = parseTable("A\tB\t\n1\t2\t");
    expect(res.headers).toEqual(["A", "B"]);
    expect(res.rows[1]).toEqual(["1", "2"]);
  });

  it("parsea tablas separadas por dos o más espacios", () => {
    const res = parseTable("Asignatura  Grupo  Día\nFFT  A  lunes\nAO  B  martes");
    expect(res.headers).toEqual(["Asignatura", "Grupo", "Día"]);
    expect(res.rows).toHaveLength(3);
    expect(res.problems).toEqual([]);
  });

  it("cae a un solo espacio cuando no hay tabuladores ni dobles espacios", () => {
    const res = parseTable("col1 col2\nv1 v2");
    expect(res.headers).toEqual(["col1", "col2"]);
    expect(res.rows[1]).toEqual(["v1", "v2"]);
  });

  it("mantiene una sola columna cuando el espacio separa nombres", () => {
    const res = parseTable("Nombre\nAna García\nLuis Pérez");
    expect(res.headers).toEqual(["Nombre"]);
    expect(res.rows).toHaveLength(3);
    expect(res.rows[1]).toEqual(["Ana García"]);
    expect(res.problems).toEqual([]);
  });

  it("marca filas con número de columnas inconsistente", () => {
    const res = parseTable("a b\n1\n2 3");
    const ragged = res.problems.find((p) => p.message.includes("columnas"));
    expect(ragged).toBeTruthy();
    expect(ragged.row).toBe(1);
  });

  it("normaliza fin de línea CRLF", () => {
    const res = parseTable("a\tb\r\n1\t2\r\n");
    expect(res.rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("devuelve vacío sin lanzar con entrada vacía", () => {
    expect(parseTable("")).toEqual({ rows: [], headers: undefined, problems: [] });
    expect(parseTable("\n \n")).toEqual({ rows: [], headers: undefined, problems: [] });
  });

  it("no lanza con entradas no soportadas", () => {
    const res = parseTable(7);
    expect(res.rows).toEqual([]);
    expect(res.problems[0].row).toBeNull();
    expect(() => parseTable(null)).not.toThrow();
  });
});
