'use strict';
/* UGR Horario - Propuestas de convalidación (en bloque) */
const PROPUESTAS_INICIALES = [
  {
    id: 'prop-foto-54',
    nombre: 'Propuesta ETSIIT 54 ECTS (foto)',
    fecha: '2025',
    enBloque: true,
    nota: '54 (*) convalidaciones en bloque — según documento aportado',
    totalCreditos: 54,
    mappings: [
      { tipo: 'bloque', id: 'bloque-1-4', cursadas: [
        { codigo: '901014', nombre: 'Fundamentos de Sistemas Digitales' },
        { codigo: '901020+DAW', nombre: 'Fundamentos de Programación (T.S. en Desarrollo de Aplicaciones Web)' },
        { codigo: '901043', nombre: 'Estrategias de Programación y Estructuras de Datos' },
        { codigo: '901066', nombre: 'Ingeniería de Computadores I' }
      ], reconocidas: [
        { codigo: '14', nombre: 'Fundamentos del Software' },
        { codigo: '15', nombre: 'Fundamentos de Programación' },
        { codigo: '17', nombre: 'Tecnología y Organización de Computadores' },
        { codigo: '18', nombre: 'Metodología de la Programación' }
      ], creditos: 24, calificacion: 7.5, nota: 'Bloque 4↔4 — concesión conjunta' },
      { cursada: 'Programación Orientada a Objetos', cursadaCodigo: '901072', reconocida: 'Programación y Diseño Orientado a Objetos', reconocidaCodigo: '21', reconocidaNombre: 'Programación Orientada a Objetos (21)', creditos: 6, calificacion: 7.9 },
      { cursada: 'Gestión de Empresas Informáticas', cursadaCodigo: '902031', reconocida: 'Ingeniería, Empresa y Sociedad', reconocidaCodigo: '19', reconocidaNombre: 'Ingeniería, Empresa y Sociedad (19)', creditos: 6, calificacion: 5.9 },
      { cursada: 'Fundamentos Matemáticos de la Informática', cursadaCodigo: '01102-', reconocida: 'Cálculo', reconocidaCodigo: '12', reconocidaNombre: 'Cálculo (12)', creditos: 6, calificacion: 7.8 },
      { cursada: 'Lógica y Estructuras Discretas', cursadaCodigo: '901037', reconocida: 'Lógica y Métodos Discretos', reconocidaCodigo: '16', reconocidaNombre: 'Lógica y Métodos Discretos (16)', creditos: 6, calificacion: 7.7 },
      { cursada: 'Estadística', cursadaCodigo: '90105-', reconocida: 'Estadística', reconocidaCodigo: '1A', reconocidaNombre: 'Estadística (1A)', creditos: 6, calificacion: 7.5 }
    ]
  }
];

function getPropuestaById(id) {
  if (typeof PROPUESTAS !== 'undefined' && Array.isArray(PROPUESTAS)) {
    return PROPUESTAS.find(p => p.id === id) || null;
  }
  return PROPUESTAS_INICIALES.find(p => p.id === id) || null;
}
