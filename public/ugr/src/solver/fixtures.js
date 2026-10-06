// Fixture reproducible usado por `__ugr.selfTest()` y `__ugr.bench()`.
// Son las 6 asignaturas del generador histórico del corpus EC
// (un solo grupo cada una: E para ALEM/FFT, C para ED/EC/SCD/SO).
// El conjunto sin conflictos es exactamente el corpus del oráculo EC (133),
// preservado como fixture en test/ugr-solver/oracle-ec.json.

export const EC_CODES = ["ALEM", "FFT", "ED", "EC", "SCD", "SO"];

export const EC_EXPECTED_COUNT = 133;

export const EC_SUBJECTS = [
  {
    codigo: "ALEM",
    nombre: "Algebra Lineal y Estructuras Matematicas",
    curso: 1,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "E",
        turno: "tarde",
        teoria: [
          { dia: "lunes", inicio: "18:30", fin: "19:30" },
          { dia: "viernes", inicio: "17:30", fin: "18:30" },
          { dia: "viernes", inicio: "18:30", fin: "19:30" },
        ],
        practicas: {
          subgrupos: ["E1", "E2", "E3"],
          E1: [{ dia: "martes", inicio: "18:30", fin: "19:30" }],
          E2: [{ dia: "miercoles", inicio: "17:30", fin: "18:30" }],
          E3: [{ dia: "lunes", inicio: "16:30", fin: "17:30" }],
        },
      },
    ],
  },
  {
    codigo: "FFT",
    nombre: "Fundamentos Fisicos y Tecnologicos",
    curso: 1,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "E",
        turno: "tarde",
        teoria: [
          { dia: "jueves", inicio: "17:30", fin: "18:30" },
          { dia: "jueves", inicio: "18:30", fin: "19:30" },
        ],
        practicas: {
          subgrupos: ["E1", "E2", "E3"],
          E1: [
            { dia: "miercoles", inicio: "17:30", fin: "18:30" },
            { dia: "miercoles", inicio: "18:30", fin: "19:30" },
          ],
          E2: [
            { dia: "martes", inicio: "17:30", fin: "18:30" },
            { dia: "martes", inicio: "18:30", fin: "19:30" },
          ],
          E3: [
            { dia: "jueves", inicio: "15:30", fin: "16:30" },
            { dia: "jueves", inicio: "16:30", fin: "17:30" },
          ],
        },
      },
    ],
  },
  {
    codigo: "ED",
    nombre: "Estructura de Datos",
    curso: 2,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "C",
        turno: "manana",
        teoria: [
          { dia: "jueves", inicio: "9:30", fin: "10:30" },
          { dia: "jueves", inicio: "10:30", fin: "11:30" },
          { dia: "viernes", inicio: "10:30", fin: "11:30" },
        ],
        practicas: {
          subgrupos: ["C1", "C2", "C3"],
          C1: [{ dia: "martes", inicio: "10:30", fin: "11:30" }],
          C2: [{ dia: "viernes", inicio: "11:30", fin: "12:30" }],
          C3: [{ dia: "miercoles", inicio: "9:30", fin: "10:30" }],
        },
      },
    ],
  },
  {
    codigo: "EC",
    nombre: "Estructura de Computadores",
    curso: 2,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "C",
        turno: "manana",
        teoria: [
          { dia: "lunes", inicio: "9:30", fin: "10:30" },
          { dia: "lunes", inicio: "10:30", fin: "11:30" },
        ],
        practicas: {
          subgrupos: ["C1", "C2", "C3"],
          C1: [
            { dia: "lunes", inicio: "11:30", fin: "12:30" },
            { dia: "lunes", inicio: "12:30", fin: "13:30" },
          ],
          C2: [
            { dia: "martes", inicio: "9:30", fin: "10:30" },
            { dia: "martes", inicio: "10:30", fin: "11:30" },
          ],
          C3: [
            { dia: "viernes", inicio: "11:30", fin: "12:30" },
            { dia: "viernes", inicio: "12:30", fin: "13:30" },
          ],
        },
      },
    ],
  },
  {
    codigo: "SCD",
    nombre: "Sistemas Concurrentes y Distribuidos",
    curso: 3,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "C",
        turno: "manana",
        teoria: [
          { dia: "martes", inicio: "11:30", fin: "12:30" },
          { dia: "martes", inicio: "12:30", fin: "13:30" },
        ],
        practicas: {
          subgrupos: ["C1", "C2", "C3"],
          C1: [
            { dia: "jueves", inicio: "11:30", fin: "12:30" },
            { dia: "jueves", inicio: "12:30", fin: "13:30" },
          ],
          C2: [
            { dia: "lunes", inicio: "11:30", fin: "12:30" },
            { dia: "lunes", inicio: "12:30", fin: "13:30" },
          ],
          C3: [
            { dia: "martes", inicio: "9:30", fin: "10:30" },
            { dia: "martes", inicio: "10:30", fin: "11:30" },
          ],
        },
      },
    ],
  },
  {
    codigo: "SO",
    nombre: "Sistemas Operativos",
    curso: 3,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "C",
        turno: "manana",
        teoria: [
          { dia: "miercoles", inicio: "12:30", fin: "13:30" },
          { dia: "viernes", inicio: "9:30", fin: "10:30" },
        ],
        practicas: {
          subgrupos: ["C1", "C2", "C3"],
          C1: [
            { dia: "miercoles", inicio: "8:30", fin: "9:30" },
            { dia: "miercoles", inicio: "9:30", fin: "10:30" },
          ],
          C2: [
            { dia: "jueves", inicio: "11:30", fin: "12:30" },
            { dia: "jueves", inicio: "12:30", fin: "13:30" },
          ],
          C3: [
            { dia: "lunes", inicio: "11:30", fin: "12:30" },
            { dia: "lunes", inicio: "12:30", fin: "13:30" },
          ],
        },
      },
    ],
  },
];
