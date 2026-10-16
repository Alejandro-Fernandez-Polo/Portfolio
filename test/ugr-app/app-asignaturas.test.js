// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { bootUgrApp, flush, textOf } from "./appHarness.js";

// Caracterización del bloque **gestionar asignaturas** del monolito (unos 200
// líneas: la lista, el modal de alta y edición, los grupos y el borrado). Es el
// bloque **más acoplado** que queda —muta el `SUBJECTS` global, persiste
// instantáneas y habla con la sincronización del catálogo—, así que se le da red
// **antes** de extraerlo, como manda la lección de la fase 2.

const FFT = {
  codigo: "FFT",
  nombre: "Fundamentos Físicos y Tecnológicos",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  caracter: "Básica",
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }] },
    },
  ],
};

const ALG = {
  codigo: "ALG",
  nombre: "Algorítmica",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  caracter: "Básica",
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "lunes", inicio: "10:30", fin: "11:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "lunes", inicio: "12:30", fin: "13:30" }] },
    },
  ],
};

const codigosEnLista = () =>
  [...document.querySelectorAll("#manage-subjects-container tbody tr")]
    .map((tr) => tr.querySelector(".ficha-name-btn")?.dataset.fichaCodigo);

const botonDeFila = (codigo, accion) =>
  document.querySelector(`#manage-subjects-container [data-action="${accion}"][data-codigo="${codigo}"]`);

const modalAbierto = () => document.getElementById("subject-modal").style.display === "flex";

function rellenar({ codigo, nombre, creditos = "6", curso = "1", cuatrimestre = "1" }) {
  if (codigo !== undefined) document.getElementById("modal-codigo").value = codigo;
  if (nombre !== undefined) document.getElementById("modal-nombre").value = nombre;
  document.getElementById("modal-creditos").value = creditos;
  document.getElementById("modal-curso").value = curso;
  document.getElementById("modal-cuatrimestre").value = cuatrimestre;
}

describe("gestionar asignaturas (monolito real)", () => {
  let app;
  let confirmOriginal;
  let respuestas;

  beforeEach(async () => {
    confirmOriginal = globalThis.confirm;
    respuestas = [];
    globalThis.confirm = () => respuestas.shift() ?? true;
    app = await bootUgrApp({ subjects: [FFT, ALG] });
    document.querySelector('button[data-view="datos"]').click();
    await flush();
  });

  afterEach(() => {
    globalThis.confirm = confirmOriginal;
  });

  it("la lista enseña el catálogo con sus acciones de editar y eliminar", () => {
    // Orden de la lista: curso → cuatrimestre → tipo → mención → **nombre**.
    expect(codigosEnLista()).toEqual(["ALG", "FFT"]);
    expect(botonDeFila("FFT", "edit")).not.toBeNull();
    expect(botonDeFila("FFT", "delete")).not.toBeNull();
    // Y el nombre abre la ficha de la asignatura.
    expect(document.querySelector('#manage-subjects-container [data-ficha-codigo="FFT"]')).not.toBeNull();
  });

  it("da de alta una asignatura desde el modal y la persiste", async () => {
    document.getElementById("btn-add-subject").click();
    await flush();
    expect(modalAbierto()).toBe(true);

    rellenar({ codigo: "nueva", nombre: "Asignatura Nueva", creditos: "9" });
    document.getElementById("modal-save").click();
    await flush();

    // El código se guarda en mayúsculas y la asignatura entra en el catálogo.
    const nueva = globalThis.SUBJECTS.find((s) => s.codigo === "NUEVA");
    expect(nueva).toBeTruthy();
    expect(nueva).toMatchObject({ nombre: "Asignatura Nueva", creditos: 9, curso: 1, cuatrimestre: 1 });
    expect(codigosEnLista()).toContain("NUEVA");
    expect(modalAbierto()).toBe(false);

    // Y queda persistida (la instantánea de materias del adaptador).
    const guardadas = JSON.parse(localStorage.getItem("ugr-horario-subjects") || "[]");
    expect(guardadas.map((s) => s.codigo)).toContain("NUEVA");
  });

  it("no guarda sin código, sin nombre ni con créditos inválidos", async () => {
    document.getElementById("btn-add-subject").click();
    await flush();

    for (const caso of [{ codigo: "", nombre: "Sin código" }, { codigo: "X1", nombre: "" }, { codigo: "X2", nombre: "Sin créditos", creditos: "0" }]) {
      rellenar(caso);
      document.getElementById("modal-save").click();
      await flush();
      expect(modalAbierto()).toBe(true); // sigue abierto: no ha guardado
      expect(globalThis.SUBJECTS.some((s) => s.codigo === "X1" || s.codigo === "X2")).toBe(false);
    }
    expect(globalThis.SUBJECTS).toHaveLength(2);
  });

  it("rechaza un código que ya existe", async () => {
    document.getElementById("btn-add-subject").click();
    await flush();
    rellenar({ codigo: "FFT", nombre: "Otra con el mismo código" });
    document.getElementById("modal-save").click();
    await flush();

    expect(modalAbierto()).toBe(true);
    expect(globalThis.SUBJECTS).toHaveLength(2);
    expect(textOf("#toast-container")).toContain("Ya existe");
  });

  it("editar carga la asignatura, bloquea el código y guarda el cambio", async () => {
    botonDeFila("ALG", "edit").click();
    await flush();
    expect(modalAbierto()).toBe(true);
    expect(document.getElementById("modal-codigo").value).toBe("ALG");
    expect(document.getElementById("modal-codigo").disabled).toBe(true);
    expect(document.getElementById("modal-nombre").value).toBe("Algorítmica");

    document.getElementById("modal-nombre").value = "Algorítmica y Complejidad";
    document.getElementById("modal-save").click();
    await flush();

    expect(globalThis.SUBJECTS.find((s) => s.codigo === "ALG").nombre).toBe("Algorítmica y Complejidad");
    expect(globalThis.SUBJECTS).toHaveLength(2);
    expect(modalAbierto()).toBe(false);
  });

  it("eliminar pide confirmación y, aceptada, la quita de la lista", async () => {
    respuestas = [false];
    botonDeFila("ALG", "delete").click();
    await flush();
    expect(globalThis.SUBJECTS).toHaveLength(2); // declinada: no borra

    respuestas = [true];
    botonDeFila("ALG", "delete").click();
    await flush();
    expect(globalThis.SUBJECTS.map((s) => s.codigo)).toEqual(["FFT"]);
    expect(codigosEnLista()).toEqual(["FFT"]);
  });

  it("el modal deja añadir grupos y los guarda con la asignatura", async () => {
    document.getElementById("btn-add-subject").click();
    await flush();
    // El editor empieza vacío: el estado del modal es de la vista, no un global.
    expect(textOf("#modal-groups-container")).toContain("Sin grupos");

    document.getElementById("btn-add-group").click();
    await flush();
    expect(textOf("#modal-groups-container")).toContain("Grupo A");

    rellenar({ codigo: "G1", nombre: "Con grupo" });
    document.getElementById("modal-save").click();
    await flush();

    const nueva = globalThis.SUBJECTS.find((s) => s.codigo === "G1");
    expect(nueva.grupos).toHaveLength(1);
    expect(nueva.grupos[0].letra).toBe("A");
    expect(nueva.grupos[0].practicas.subgrupos).toEqual([]);
  });

  it("el editor de grupos añade teoría y subgrupos de práctica, y los quita", async () => {
    document.getElementById("btn-add-subject").click();
    await flush();
    document.getElementById("btn-add-group").click();
    await flush();

    const grupo = () => document.querySelector("#modal-groups-container .modal-group-item");

    // Teoría: una sesión con su día, sus dos horas y su botón de quitar.
    grupo().querySelector('[data-add="teoria"]').click();
    await flush();
    const celdaTeoria = grupo().querySelector(".modal-sessions[data-type='teoria']");
    expect(celdaTeoria.querySelector("select[data-field='dia']")).not.toBeNull();
    expect(celdaTeoria.querySelectorAll("input[type='time']")).toHaveLength(2);
    expect(celdaTeoria.querySelector("button[data-si='0']")).not.toBeNull();

    // Subgrupo: la letra del grupo + el número (A1, A2…).
    grupo().querySelector('[data-add="subgrupo"]').click();
    await flush();
    grupo().querySelector('[data-add="subgrupo"]').click();
    await flush();
    expect(textOf("#modal-groups-container")).toContain("A1");
    expect(textOf("#modal-groups-container")).toContain("A2");

    // Y se guardan con la asignatura, con su estructura de subgrupos.
    rellenar({ codigo: "G2", nombre: "Con grupos dentro" });
    document.getElementById("modal-save").click();
    await flush();
    const nueva = globalThis.SUBJECTS.find((s) => s.codigo === "G2");
    expect(nueva.grupos[0].teoria).toHaveLength(1);
    expect(nueva.grupos[0].practicas.subgrupos).toEqual(["A1", "A2"]);
    expect(nueva.grupos[0].practicas.A1).toEqual([]);

    // Quitar una sesión: el botón X de la fila. (El editor **no** ofrece quitar
    // un subgrupo entero: solo sesiones y el grupo completo; queda anotado.)
    botonDeFila("G2", "edit").click();
    await flush();
    const xTeoria = document.querySelector("#modal-groups-container .modal-sessions[data-type='teoria'] button[data-si]");
    xTeoria.click();
    await flush();
    document.getElementById("modal-save").click();
    await flush();

    const guardada = globalThis.SUBJECTS.find((s) => s.codigo === "G2");
    expect(guardada.grupos[0].teoria).toEqual([]);
    expect(guardada.grupos[0].practicas.subgrupos).toEqual(["A1", "A2"]);
  });
});
