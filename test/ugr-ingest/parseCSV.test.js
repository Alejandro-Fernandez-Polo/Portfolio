import { describe, it, expect } from "vitest";
import { parseCSV, detectEncoding } from "../../public/ugr/src/ingest/parseCSV.js";

describe("parseCSV", () => {
  it("parsea CSV simple con coma y detecta cabecera", () => {
    const res = parseCSV("a,b\n1,2");
    expect(res.delimiter).toBe(",");
    expect(res.hasHeader).toBe(true);
    expect(res.headers).toEqual(["a", "b"]);
    expect(res.rows).toEqual([["a", "b"], ["1", "2"]]);
    expect(res.problems).toEqual([]);
  });

  it("autodetecta punto y coma (aunque haya comas en los datos)", () => {
    const res = parseCSV("Nombre;Nota\nAna;3,5\nLuis;4,0");
    expect(res.delimiter).toBe(";");
    expect(res.rows).toHaveLength(3);
    expect(res.rows[1]).toEqual(["Ana", "3,5"]);
  });

  it("autodetecta tabulador", () => {
    const res = parseCSV("a\tb\n1\t2");
    expect(res.delimiter).toBe("\t");
    expect(res.headers).toEqual(["a", "b"]);
  });

  it("autodetecta pipe", () => {
    const res = parseCSV("a|b\n1|2");
    expect(res.delimiter).toBe("|");
    expect(res.rows[1]).toEqual(["1", "2"]);
  });

  it("ignora delimitadores dentro de comillas al detectar", () => {
    const res = parseCSV('a;b\n"x;y;z";p');
    expect(res.delimiter).toBe(";");
    expect(res.rows[1]).toEqual(["x;y;z", "p"]);
  });

  it("respeta comillas: delimitador literal dentro de un campo", () => {
    const res = parseCSV('a,b\n"x,y",z');
    expect(res.delimiter).toBe(",");
    expect(res.rows[1]).toEqual(["x,y", "z"]);
  });

  it("escapa comillas dobles (\"\" → \")", () => {
    const res = parseCSV('"say ""hi""",b\nc,d');
    expect(res.rows[0]).toEqual(['say "hi"', "b"]);
  });

  it("maneja fin de línea CRLF sin residuos", () => {
    const res = parseCSV("a,b\r\n1,2\r\n");
    expect(res.rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("admite saltos de línea dentro de campos entre comillas", () => {
    const res = parseCSV('"line1\nline2",b\n');
    expect(res.rows[0]).toEqual(["line1\nline2", "b"]);
    expect(res.rows).toHaveLength(1);
  });

  it("sin cabecera si la primera fila es numérica", () => {
    const res = parseCSV("1,2\n3,4");
    expect(res.hasHeader).toBe(false);
    expect(res.headers).toBeUndefined();
    expect(res.rows).toHaveLength(2);
  });

  it("nunca lanza con comillas sin cerrar y lo marca como problema", () => {
    const res = parseCSV('a,b\n"unclosed,2');
    expect(Array.isArray(res.rows)).toBe(true);
    expect(res.problems.some((p) => p.message.includes("comillas sin cerrar"))).toBe(true);
  });

  it("marca filas con número de columnas inconsistente", () => {
    const res = parseCSV("a,b\n1\n2,3");
    const ragged = res.problems.find((p) => p.message.includes("columnas"));
    expect(ragged).toBeTruthy();
    expect(ragged.row).toBe(1);
  });

  it("descarta líneas en blanco", () => {
    const res = parseCSV("a,b\n\n1,2\n");
    expect(res.rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("quita el BOM UTF-8", () => {
    const res = parseCSV("\uFEFFa,b\n1,2");
    expect(res.headers).toEqual(["a", "b"]);
  });

  it("decodifica bytes UTF-8 válidos", () => {
    const bytes = new TextEncoder().encode("Asignatura,Créditos\nFFT,6");
    const res = parseCSV(bytes);
    expect(res.encoding).toBe("utf-8");
    expect(res.headers).toEqual(["Asignatura", "Créditos"]);
  });

  it("cae a latin-1 cuando los bytes no son UTF-8", () => {
    const bytes = new Uint8Array([0x41, 0x2c, 0xf1]);
    const res = parseCSV(bytes);
    expect(res.encoding).toBe("latin-1");
    expect(res.rows[0]).toEqual(["A", "ñ"]);
  });

  it("detecta encoding sospechoso en texto ya decodificado", () => {
    expect(detectEncoding("normal, texto")).toBe("utf-8");
    expect(detectEncoding("roto \uFFFD aqu\u00ED")).toBe("latin-1");
    expect(detectEncoding("mojibake \u00c3\u0081")).toBe("latin-1");
  });

  it("no lanza con entradas no soportadas", () => {
    const res = parseCSV(42);
    expect(res.rows).toEqual([]);
    expect(res.problems[0].row).toBeNull();
  });

  it("nunca lanza con entradas malformadas variadas", () => {
    for (const input of ['', '"', ",,", "\r\n\r\n", "a\0b", 'x,"y""']) {
      expect(() => parseCSV(input)).not.toThrow();
    }
  });
});
