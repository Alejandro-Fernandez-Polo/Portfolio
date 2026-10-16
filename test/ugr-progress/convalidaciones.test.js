import { describe, it, expect } from "vitest";

import {
  normalizeConvalidacion,
  normalizeConvalidaciones,
  destinosAprobados,
  gruposDeConvalidaciones,
  convalidacionDeDestino,
  resolverDestino,
  normalizarNombreAsignatura,
  DESTINO_LIBRE,
  esDestinoLibre,
} from "../../public/ugr/src/progress/convalidaciones.js";
import { ESTADO, normalizeEstado } from "../../public/ugr/src/progress/status.js";

// Las convalidaciones: lo cursado fuera (orígenes) y las asignaturas UGR que lo
// reconocen (destinos), con su estado. Lo que se fija aquí es la forma canónica
// —el destino lleva **código y nombre**—, la traducción del vocabulario viejo de
// estados y las reglas que sostienen el resto de la app: los destinos aprobados
// son los que cuentan como superados (recuperando por nombre los que cambiaron de
// código), los tres grupos que enseña Progreso y la convalidación de una
// asignatura.

const CATALOGO = [
  { codigo: "CA", nombre: "Cálculo", creditos: 6 },
  { codigo: "FS", nombre: "Fundamentos del Software", creditos: 6 },
  { codigo: "SG", nombre: "Sistemas Gráficos (Especialidad Ingeniería del Software)", creditos: 6 },
];

const CONVALIDACION = {
  id: "uned-calculo-1",
  origenes: [{ codigo: "011013", nombre: "Cálculo I (UNED)" }],
  destinos: [
    { codigo: "CA", nombre: "Cálculo" },
    { codigo: "FS", nombre: "Fundamentos del Software" },
  ],
  creditos: 12,
  calificacion: "7,5",
  estado: ESTADO.APROBADA,
};

describe("normalizeConvalidacion", () => {
  it("deja la forma canónica y normaliza el estado que falta a pendiente", () => {
    const c = normalizeConvalidacion({ origenes: [{ nombre: "Cálculo I" }], destinos: [{ codigo: "CA" }] });

    expect(c).toMatchObject({
      origenes: [{ codigo: "", nombre: "Cálculo I" }],
      destinos: [{ codigo: "CA", nombre: "" }],
      creditos: 0,
      estado: ESTADO.PENDIENTE,
    });
    // Sin id propio se genera uno estable a partir de las dos puntas.
    expect(c.id).toBe("Cálculo I|CA");
  });

  it("acepta el destino como string (datos ya guardados con la forma vieja)", () => {
    expect(normalizeConvalidacion({ origenes: ["Cálculo I"], destino: "CA" }).destinos).toEqual([{ codigo: "CA", nombre: "" }]);
  });

  it("traduce el vocabulario viejo de estados al leerlo (no se pierde nada)", () => {
    expect(normalizeEstado("concedida")).toBe(ESTADO.APROBADA);
    expect(normalizeEstado("denegada")).toBe(ESTADO.RECHAZADA);
    expect(normalizeEstado("solicitada")).toBe(ESTADO.PENDIENTE);
    expect(normalizeEstado("pendiente")).toBe(ESTADO.PENDIENTE);
    // Basura → null (quien la use decide; la convalidación cae a pendiente).
    expect(normalizeEstado("loquesea")).toBeNull();
    expect(normalizeConvalidacion({ ...CONVALIDACION, estado: "concedida" }).estado).toBe(ESTADO.APROBADA);
  });

  it("quita destinos repetidos (por código, y por nombre si no hay código)", () => {
    const c = normalizeConvalidacion({
      origenes: ["x"],
      destinos: [{ codigo: "CA" }, { codigo: "CA", nombre: "Cálculo" }, { nombre: "Fundamentos del Software" }, { nombre: "fundamentos del software" }],
    });

    expect(c.destinos).toEqual([
      { codigo: "CA", nombre: "" },
      { codigo: "", nombre: "Fundamentos del Software" },
    ]);
  });

  it("sin una de las dos puntas no es una convalidación", () => {
    expect(normalizeConvalidacion({ destinos: [{ codigo: "CA" }] })).toBeNull();
    expect(normalizeConvalidacion({ origenes: ["Cálculo I"] })).toBeNull();
    expect(normalizeConvalidacion(null)).toBeNull();
    expect(normalizeConvalidacion("loquesea")).toBeNull();
  });

  it("la lista entera se normaliza y no repite por id", () => {
    const lista = normalizeConvalidaciones([CONVALIDACION, { ...CONVALIDACION }, { basura: 1 }, null]);

    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe("uned-calculo-1");
    expect(normalizeConvalidaciones("no es una lista")).toEqual([]);
  });
});

describe("resolverDestino", () => {
  it("resuelve por código y completa el nombre del catálogo", () => {
    const r = resolverDestino({ codigo: "FS" }, CATALOGO);

    expect(r).toMatchObject({ codigo: "FS", nombre: "Fundamentos del Software" });
    expect(r.subject).toBe(CATALOGO[1]);
  });

  it("si el código ya no existe, resuelve por nombre (sin acentos ni especialidad)", () => {
    // El caso que importa: la convalidación guardada apunta a un código que
    // cambió, pero su nombre sigue casando con el de la asignatura del catálogo.
    const r = resolverDestino({ codigo: "14", nombre: "Sistemas Graficos" }, CATALOGO);

    expect(r).toMatchObject({ codigo: "SG", nombre: "Sistemas Gráficos (Especialidad Ingeniería del Software)" });
    expect(r.subject).toBe(CATALOGO[2]);
  });

  it("sin casar devuelve el destino guardado y ninguna asignatura", () => {
    const r = resolverDestino({ codigo: "99", nombre: "Asignatura de otra carrera" }, CATALOGO);

    expect(r).toEqual({ codigo: "99", nombre: "Asignatura de otra carrera", subject: null });
  });

  it("sin catálogo solo puede resolver por código", () => {
    expect(resolverDestino({ codigo: "CA" }).subject).toBeNull();
    expect(normalizarNombreAsignatura("  Cálculo  ")).toBe("calculo");
  });
});

describe("destinosAprobados", () => {
  it("solo los destinos de las aprobadas cuentan como superados", () => {
    const aprobados = destinosAprobados([
      CONVALIDACION,
      { origenes: ["Otra"], destinos: [{ codigo: "SO" }], estado: ESTADO.PENDIENTE },
      { origenes: ["Otra más"], destinos: [{ codigo: "ALG" }], estado: ESTADO.RECHAZADA },
    ]);

    expect([...aprobados].sort()).toEqual(["CA", "FS"]);
  });

  it("con el catálogo delante, recupera un destino cuyo código cambió", () => {
    const vieja = [{ origenes: ["Física (UNED)"], destinos: [{ codigo: "14", nombre: "Fundamentos del Software" }], creditos: 6, estado: ESTADO.APROBADA }];

    // El código viejo se traduce en los dos casos; con catálogo, además, sale con
    // el nombre y los datos de la asignatura de verdad.
    expect([...destinosAprobados(vieja)]).toEqual(["FS"]);
    expect([...destinosAprobados(vieja, CATALOGO)]).toEqual(["FS"]);
  });

  it("sin convalidaciones no hay nada aprobado (un catálogo ajeno no cuela)", () => {
    // La tabla personal del autor (forma con uned/ugr) no es una convalidación:
    // al normalizar se cae, así que nadie ve equivalencias que no sean suyas.
    const tablaDelAutor = [{ id: "FP-COMBINADA", uned: { codigo: "011013" }, ugr: { codigo: "CA" }, origen: "UNED+GS" }];
    expect(destinosAprobados(tablaDelAutor).size).toBe(0);
    expect(destinosAprobados([]).size).toBe(0);
  });
});

describe("gruposDeConvalidaciones", () => {
  it("reparte en pendientes, rechazadas y aprobadas", () => {
    const grupos = gruposDeConvalidaciones([
      CONVALIDACION,
      { id: "a", origenes: ["A"], destinos: [{ codigo: "SO" }], estado: ESTADO.PENDIENTE },
      { id: "b", origenes: ["B"], destinos: [{ codigo: "ALG" }], estado: ESTADO.RECHAZADA },
      { id: "c", origenes: ["C"], destinos: [{ codigo: "IA" }], estado: ESTADO.PENDIENTE },
    ]);

    expect(grupos.aprobadas.map((c) => c.id)).toEqual(["uned-calculo-1"]);
    expect(grupos.rechazadas.map((c) => c.id)).toEqual(["b"]);
    expect(grupos.pendientes.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("sin lista, los tres grupos vacíos", () => {
    expect(gruposDeConvalidaciones(undefined)).toEqual({ pendientes: [], rechazadas: [], aprobadas: [] });
  });
});

describe("recuperación de los códigos antiguos", () => {
  // Los datos viejos guardaban el destino con la tabla del autor (`1A`, `14`…),
  // a veces sin nombre: sin este camino se quedaban «fuera del catálogo».
  const CON_ES = [...CATALOGO, { codigo: "ES", nombre: "Estructuras de Datos", creditos: 6 }];

  it("un destino sin nombre se recupera traduciendo su código viejo (1A → ES)", () => {
    const r = resolverDestino({ codigo: "1A" }, CON_ES);

    expect(r).toMatchObject({ codigo: "ES", nombre: "Estructuras de Datos" });
    expect(r.subject.codigo).toBe("ES");
  });

  it("si el catálogo no tiene esa abreviatura, sigue sin resolver… pero traducido", () => {
    // Sin asignatura que enseñar, el código sale ya traducido: es lo que hace que
    // la aprobación calculada del motor (que no tiene catálogo) siga contando.
    expect(resolverDestino({ codigo: "1A" }, CATALOGO).subject).toBeNull();
    expect(resolverDestino({ codigo: "1A" }, CATALOGO).codigo).toBe("ES");
  });

  it("la aprobación calculada también lo recupera, con y sin catálogo", () => {
    const vieja = [{ id: "v", origenes: ["x"], destinos: [{ codigo: "1A" }], creditos: 6, estado: ESTADO.APROBADA }];

    expect([...destinosAprobados(vieja, CON_ES)]).toEqual(["ES"]);
    // Sin catálogo: el código sale traducido por la tabla antigua.
    expect([...destinosAprobados(vieja)]).toEqual(["ES"]);
  });

  it("el código de verdad manda sobre la tabla vieja", () => {
    // Si el catálogo ya tiene una asignatura con ese código, no se traduce nada.
    const conCodigo1A = [...CON_ES, { codigo: "1A", nombre: "Otra cosa" }];

    expect(resolverDestino({ codigo: "1A" }, conCodigo1A).nombre).toBe("Otra cosa");
  });
});

describe("convalidacionDeDestino", () => {
  it("encuentra la convalidación que reclama una asignatura", () => {
    expect(convalidacionDeDestino("FS", [CONVALIDACION]).id).toBe("uned-calculo-1");
    expect(convalidacionDeDestino("SO", [CONVALIDACION])).toBeNull();
    expect(convalidacionDeDestino("", [CONVALIDACION])).toBeNull();
  });

  it("la encuentra también si su código cambió", () => {
    const vieja = [{ id: "v", origenes: ["x"], destinos: [{ codigo: "14", nombre: "Fundamentos del Software" }] }];

    // El código viejo se traduce con la tabla antigua, así que se encuentra con y
    // sin catálogo; con él, además, resuelve a la asignatura de verdad.
    expect(convalidacionDeDestino("FS", vieja).id).toBe("v");
    expect(convalidacionDeDestino("FS", vieja, CATALOGO).id).toBe("v");
    expect(convalidacionDeDestino("SO", vieja, CATALOGO)).toBeNull();
  });
});

// Los créditos libres: el hueco para lo que la titulación reconoce sin que lo dé
// una asignatura concreta. Va como un destino más —el autor lo elige de la misma
// lista—, pero **no es una asignatura**: no tiene ECTS propios y no puede dar
// ninguna por superada.
describe("créditos libres", () => {
  it("se reconoce por su código reservado y por su nombre, con o sin tildes", () => {
    expect(esDestinoLibre({ codigo: DESTINO_LIBRE.codigo })).toBe(true);
    expect(esDestinoLibre({ nombre: "Créditos libres" })).toBe(true);
    expect(esDestinoLibre({ nombre: "creditos LIBRES" })).toBe(true);
    // Una asignatura del catálogo no se confunde con el hueco de créditos.
    expect(esDestinoLibre({ codigo: "CA", nombre: "Cálculo" })).toBe(false);
    expect(esDestinoLibre("")).toBe(false);
  });

  it("resolverDestino lo marca libre y no lo trata como asignatura ni como código viejo", () => {
    expect(resolverDestino(DESTINO_LIBRE, CATALOGO)).toMatchObject({
      codigo: "LIBRES",
      nombre: "Créditos libres",
      subject: null,
      libre: true,
    });
    // Sin catálogo delante, lo mismo: no depende de que haya asignaturas.
    expect(resolverDestino(DESTINO_LIBRE).libre).toBe(true);
  });

  it("no da ninguna asignatura por superada, ni siquiera junto a un destino de verdad", () => {
    const soloLibres = [
      { id: "l1", origenes: [{ nombre: "Curso de la UNED" }], destinos: [DESTINO_LIBRE], estado: ESTADO.APROBADA },
    ];
    expect([...destinosAprobados(soloLibres, CATALOGO)]).toEqual([]);

    const mixta = [
      {
        id: "l2",
        origenes: [{ nombre: "Curso de la UNED" }],
        destinos: [{ codigo: "CA", nombre: "Cálculo" }, DESTINO_LIBRE],
        estado: ESTADO.APROBADA,
      },
    ];
    expect([...destinosAprobados(mixta, CATALOGO)]).toEqual(["CA"]);
  });

  it("una convalidación con origen y solo créditos libres es válida", () => {
    const normalizada = normalizeConvalidacion({
      origenes: [{ nombre: "Máster (UNED)" }],
      destinos: [DESTINO_LIBRE],
      creditos: 9,
    });
    expect(normalizada.destinos).toEqual([{ codigo: "LIBRES", nombre: "Créditos libres" }]);
    expect(normalizada.creditos).toBe(9);
    expect(normalizada.estado).toBe(ESTADO.PENDIENTE);
  });
});
