/* UGR Horario - Convalidaciones UNED -> UGR (tabla real convalidaciones.html) y Grado Superior -> UGR */
const CONVALIDACIONES = [
  {
    id: "011013-FFT",
    origen: "UNED",
    uned: { codigo: "011013", nombre: "Fundamentos Físicos de la Informática", guiaPdf: "guias_uned/Fundamentos_Fisicos_de_la_Informatica.pdf" },
    ugr: { codigo: "FFT", nombre: "Fundamentos Físicos y Tecnológicos", guiaPdf: "guias_ugr/Fundamentos_Fisicos_y_Tecnologicos.pdf" },
    corresponde: "FFT",
    creditos: 6,
    calificacion: "0,8",
    justificacion: "Ambas asignaturas cubren los principios físicos subyacentes a la informática: óptica, electromagnetismo, semiconductores y fundamentos de hardware."
  },
  {
    id: "01102-CA",
    origen: "UNED",
    uned: { codigo: "01102-", nombre: "Fundamentos Matemáticos de la Informática", guiaPdf: "guias_uned/Fundamentos_Matematicos_de_la_Informatica.pdf" },
    ugr: { codigo: "CA", nombre: "Cálculo", guiaPdf: "guias_ugr/Calculo.pdf" },
    corresponde: "CA",
    creditos: 6,
    calificacion: "7,8",
    justificacion: "La materia de la UNED incluye cálculo diferencial e integral, series y ecuaciones diferenciales, que son el núcleo de Cálculo en la UGR. Se descarta Álgebra Lineal porque la materia UNED no cubre vectores ni matrices de forma significativa."
  },
  {
    id: "901020-FP",
    origen: "UNED",
    uned: { codigo: "901020", nombre: "Fundamentos de Programación", guiaPdf: "guias_uned/Fundamentos_de_Programacion.pdf" },
    ugr: { codigo: "FP", nombre: "Fundamentos de Programación", guiaPdf: "guias_ugr/Fundamentos_de_Programacion.pdf" },
    corresponde: "FP",
    creditos: 6,
    calificacion: "7,6",
    justificacion: "Coincidencia nominal y de contenido exacta. Ambas introducen programación imperativa, estructuras básicas de control, funciones y tipos de datos."
  },
  {
    id: "FP-COMBINADA",
    origen: "UNED+GS",
    uned: { codigo: "901020", nombre: "Fundamentos de Programación", guiaPdf: "guias_uned/Fundamentos_de_Programacion.pdf" },
    ugr: { codigo: "FP", nombre: "Fundamentos de Programación", guiaPdf: "guias_ugr/Fundamentos_de_Programacion.pdf" },
    corresponde: "FP + DAW",
    nota: "Convalidable por UNED 901020 y por Grado Superior DAW",
    creditos: 6,
    calificacion: "7,6",
    justificacion: "Coincidencia nominal y de contenido exacta. También convalidable por Ciclo Formativo DAW."
  },
  {
    id: "901014-TOC",
    origen: "UNED",
    uned: { codigo: "901014", nombre: "Fundamentos de Sistemas Digitales", guiaPdf: "guias_uned/Fundamentos_de_Sistemas_Digitales.pdf" },
    ugr: { codigo: "TOC", nombre: "Tecnología y Organización de Computadores", guiaPdf: "guias_ugr/Tecnologia_y_Organizacion_de_Computadores.pdf" },
    corresponde: "TOC",
    creditos: 6,
    calificacion: "9,1",
    justificacion: "La UNED enseña circuitos digitales, compuertas lógicas, aritmética binaria y organización del hardware. La UGR cubre tecnología y organización interna del computador a nivel de puertas lógicas y microprocesador."
  },
  {
    id: "901037-LMD",
    origen: "UNED",
    uned: { codigo: "901037", nombre: "Lógica y Estructuras Discretas", guiaPdf: "guias_uned/Logica_y_Estructuras_Discretas.pdf" },
    ugr: { codigo: "LMD", nombre: "Lógica y Métodos Discretos", guiaPdf: "guias_ugr/Logica_y_Metodos_Discretos.pdf" },
    corresponde: "LMD",
    creditos: 6,
    calificacion: "7,7",
    justificacion: "Coincidencia casi nominal. Ambas abarcan lógica proposicional, conjuntos, relaciones, funciones, grafos y combinatoria."
  },
  {
    id: "901043-MP",
    origen: "UNED",
    uned: { codigo: "901043", nombre: "Estrategias de Programación y Estructuras de Datos", guiaPdf: "guias_uned/Estrategias_de_Programacion_y_Estructuras_de_Datos.pdf" },
    ugr: { codigo: "MP", nombre: "Metodología de la Programación", guiaPdf: "guias_ugr/Metodologia_de_la_Programacion.pdf" },
    corresponde: "MP",
    creditos: 6,
    calificacion: "7,3",
    justificacion: "La UNED enseña estrategias de resolución de problemas, diseño de algoritmos y estructuras de datos básicas. La UGR cubre técnicas de diseño, pseudocódigo, modularidad y estilo de programación."
  },
  {
    id: "90105-ES",
    origen: "UNED",
    uned: { codigo: "90105-", nombre: "Estadística", guiaPdf: "guias_uned/Estadistica_Ing_Informatica_Ing_TI.pdf" },
    ugr: { codigo: "ES", nombre: "Estadística", guiaPdf: "guias_ugr/Estadistica.pdf" },
    corresponde: "ES",
    creditos: 6,
    calificacion: "7,5",
    justificacion: "Coincidencia nominal y de contenido directa. Ambas cubren descriptiva, probabilidad, distribuciones, inferencia y regresión."
  },
  {
    id: "902031-IES",
    origen: "UNED",
    uned: { codigo: "902031", nombre: "Gestión de Empresas Informáticas", guiaPdf: "guias_uned/Gestion_de_Empresas_Informaticas.pdf" },
    ugr: { codigo: "IES", nombre: "Ingeniería, Empresa y Sociedad", guiaPdf: "guias_ugr/Ingenieria_Empresa_y_Sociedad.pdf" },
    corresponde: "IES",
    creditos: 6,
    calificacion: "5,9",
    justificacion: "Ambas sitúan la informática en contexto empresarial y social. Núcleo común de gestión y organización."
  },
  {
    id: "IES-COMBINADA",
    origen: "UNED+GS",
    uned: { codigo: "902031", nombre: "Gestión de Empresas Informáticas", guiaPdf: "guias_uned/Gestion_de_Empresas_Informaticas.pdf" },
    ugr: { codigo: "IES", nombre: "Ingeniería, Empresa y Sociedad", guiaPdf: "guias_ugr/Ingenieria_Empresa_y_Sociedad.pdf" },
    corresponde: "IES + DAW",
    nota: "Convalidable por UNED 902031 y por Grado Superior DAW",
    creditos: 6,
    calificacion: "5,9",
    justificacion: "Ambas sitúan la informática en contexto empresarial y social. También convalidable por Ciclo Formativo DAW."
  },
  {
    id: "901066-EC",
    origen: "UNED",
    uned: { codigo: "901066", nombre: "Ingeniería de Computadores I", guiaPdf: "guias_uned/Ingenieria_de_Computadores_I.pdf" },
    ugr: { codigo: "EC", nombre: "Estructura de Computadores", guiaPdf: "guias_ugr/Estructura_de_Computadores.pdf" },
    corresponde: "EC",
    creditos: 6,
    calificacion: "6,1",
    justificacion: "Ingeniería de Computadores I trata estructura interna del computador: CPU, memoria, periféricos y ensamblador. Equivale a Estructura de Computadores (unidad central, jerarquía de memoria y E/S)."
  },
  {
    id: "901072-PDOO",
    origen: "UNED",
    uned: { codigo: "901072", nombre: "Programación Orientada a Objetos", guiaPdf: "guias_uned/Programacion_Orientada_a_Objetos.pdf" },
    ugr: { codigo: "PDOO", nombre: "Programación y Diseño Orientado a Objetos", guiaPdf: "guias_ugr/Programacion_y_Diseno_Orientado_a_Objetos.pdf" },
    corresponde: "PDOO",
    creditos: 6,
    calificacion: "7,9",
    justificacion: "Coincidencia nominal casi exacta. Principios POO: clases, objetos, herencia, polimorfismo, encapsulamiento y diseño de clases."
  },
  {
    id: "902025-AC",
    origen: "UNED",
    uned: { codigo: "902025", nombre: "Ingeniería de Computadores II", guiaPdf: "guias_uned/Ingenieria_de_Computadores_II.pdf" },
    ugr: { codigo: "AC", nombre: "Arquitectura de Computadores", guiaPdf: "guias_ugr/Arquitectura_de_Computadores.pdf" },
    corresponde: "AC",
    creditos: 6,
    calificacion: "6,8",
    justificacion: "Ingeniería de Computadores II profundiza en arquitectura de procesadores, conjuntos de instrucciones, canalización y sistemas paralelos. Equivale a Arquitectura de Computadores."
  },
  {
    id: "902077-FIS",
    origen: "UNED",
    uned: { codigo: "902077", nombre: "Introducción a la Ingeniería de Software", guiaPdf: "guias_uned/Introduccion_a_la_Ingenieria_de_Software.pdf" },
    ugr: { codigo: "FIS", nombre: "Fundamentos de Ingeniería del Software", guiaPdf: "guias_ugr/Fundamentos_de_Ingenieria_del_Software.pdf" },
    corresponde: "FIS",
    creditos: 6,
    calificacion: "7,2",
    justificacion: "Coincidencia nominal y temática directa. Ciclo de vida del software, requisitos, diseño, verificación y mantenimiento."
  },
  {
    id: "012018-SCD",
    origen: "UNED",
    uned: { codigo: "012018", nombre: "Ingeniería de Computadores III", guiaPdf: "guias_uned/Ingenieria_de_Computadores_III.pdf" },
    ugr: { codigo: "SCD", nombre: "Sistemas Concurrentes y Distribuidos", guiaPdf: "guias_ugr/Sistemas_Concurrentes_y_Distribuidos.pdf" },
    corresponde: "SCD",
    creditos: 6,
    calificacion: "9,5",
    justificacion: "Ingeniería de Computadores III abarca sistemas operativos, concurrencia, procesos, hilos y sistemas distribuidos. Se asigna a SCD por ser la que menos solapamiento tiene con otras convalidaciones."
  },
  {
    id: "902060-IA",
    origen: "UNED",
    uned: { codigo: "902060", nombre: "Fundamentos de Inteligencia Artificial", guiaPdf: "guias_uned/Fundamentos_de_Inteligencia_Artificial.pdf" },
    ugr: { codigo: "IA", nombre: "Inteligencia Artificial", guiaPdf: "guias_ugr/Inteligencia_Artificial.pdf" },
    corresponde: "IA",
    creditos: 6,
    calificacion: "1,8",
    justificacion: "Coincidencia nominal y de contenido directa. Búsqueda, representación del conocimiento, razonamiento y redes neuronales. Pendiente de aprobar (<5).",
    estadoSugerido: "pendiente"
  },
  {
    id: "902019-ALG",
    origen: "UNED",
    uned: { codigo: "902019", nombre: "Programación y Estructuras de Datos Avanzadas", guiaPdf: "guias_uned/Programacion_y_Estructuras_de_Datos_Avanzadas.pdf" },
    ugr: { codigo: "ALG", nombre: "Algorítmica", guiaPdf: "guias_ugr/Algoritmica.pdf" },
    corresponde: "ALG",
    creditos: 6,
    calificacion: "2,7",
    justificacion: "Algoritmos avanzados, complejidad, estructuras complejas y técnicas de diseño. Equivale a Algorítmica. Pendiente de aprobar (<5).",
    estadoSugerido: "pendiente"
  },
  {
    id: "012024-SO",
    origen: "UNED",
    uned: { codigo: "012024", nombre: "Teoría de los Lenguajes de Programación", guiaPdf: "guias_uned/Teoria_de_los_Lenguajes_de_Programacion.pdf" },
    ugr: { codigo: "SO", nombre: "Sistemas Operativos", guiaPdf: "guias_ugr/Sistemas_Operativos.pdf" },
    corresponde: "SO",
    creditos: 6,
    calificacion: "5,2",
    justificacion: "Asignación por exclusión. Teoría de Lenguajes ya cubierta por Autómatas → Modelos. SO es la pendiente más afín al perfil técnico."
  },
  {
    id: "012030-FR",
    origen: "UNED",
    uned: { codigo: "012030", nombre: "Redes de Computadores", guiaPdf: "guias_uned/Redes_de_Computadores.pdf" },
    ugr: { codigo: "FR", nombre: "Fundamentos de Redes", guiaPdf: "guias_ugr/Fundamentos_de_Redes.pdf" },
    corresponde: "FR",
    creditos: 6,
    calificacion: "5,9",
    justificacion: "Coincidencia nominal y de contenido directa. Modelos OSI/TCP-IP, conmutación, enrutamiento y protocolos."
  },
  {
    id: "901089-MC",
    origen: "UNED",
    uned: { codigo: "901089", nombre: "Autómatas, Gramáticas y Lenguajes", guiaPdf: "guias_uned/Automatas_Gramaticas_y_Lenguajes.pdf" },
    ugr: { codigo: "MC", nombre: "Modelos de Computación", guiaPdf: "guias_ugr/Modelos_de_Computacion.pdf" },
    corresponde: "MC",
    creditos: 6,
    calificacion: "8,5",
    justificacion: "Autómatas finitos, gramáticas formales, lenguajes regulares y libres de contexto. Núcleo de teoría de la computación."
  },
  // ── Grado Superior puras (sin UNED) ──
  {
    id: "FS-DAW-GS",
    origen: "GRADO_SUPERIOR",
    uned: null,
    ugr: { codigo: "FS", nombre: "Fundamentos del Software", guiaPdf: "guias_ugr/Fundamentos_del_Software.pdf" },
    corresponde: "DAW",
    nota: "Convalidada por Ciclo Formativo de Grado Superior (DAW)",
    creditos: 6
  },
  {
    id: "FBD-DAW-GS",
    origen: "GRADO_SUPERIOR",
    uned: null,
    ugr: { codigo: "FBD", nombre: "Fundamentos de Bases de Datos", guiaPdf: "guias_ugr/Fundamentos_de_Bases_de_Datos.pdf" },
    corresponde: "DAW",
    nota: "Convalidada por Ciclo Formativo de Grado Superior (DAW)",
    creditos: 6
  },
  {
    id: "FIS-DAW-GS",
    origen: "GRADO_SUPERIOR",
    uned: null,
    ugr: { codigo: "FIS", nombre: "Fundamentos de Ingeniería del Software", guiaPdf: "guias_ugr/Fundamentos_de_Ingenieria_del_Software.pdf" },
    corresponde: "DAW",
    nota: "Convalidada por Ciclo Formativo de Grado Superior (DAW) — también UNED 902077",
    creditos: 6
  },
  // ── UGR sin correspondencia directa ──
  {
    id: "ALEM-SIN",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "ALEM", nombre: "Álgebra Lineal y Estructuras Matemáticas", guiaPdf: "guias_ugr/Algebra_Lineal_y_Estructuras_Matematicas.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "DDSI-SIN",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "DDSI", nombre: "Diseño y Desarrollo de Sistemas de Información", guiaPdf: "guias_ugr/Diseno_y_Desarrollo_de_Sistemas_de_Informacion.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "IG-SIN",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "IG", nombre: "Informática Gráfica", guiaPdf: "guias_ugr/Informatica_Grafica.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "ISE-SIN",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "ISE", nombre: "Ingeniería de Servidores", guiaPdf: "guias_ugr/Ingenieria_de_Servidores.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "IA-SIN-PEND",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "IA", nombre: "Inteligencia Artificial", guiaPdf: "guias_ugr/Inteligencia_Artificial.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "SCD-SIN-PEND",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "SCD", nombre: "Sistemas Concurrentes y Distribuidos", guiaPdf: "guias_ugr/Sistemas_Concurrentes_y_Distribuidos.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  {
    id: "SO-SIN-PEND",
    origen: "SIN_CONVALIDACION",
    uned: null,
    ugr: { codigo: "SO", nombre: "Sistemas Operativos", guiaPdf: "guias_ugr/Sistemas_Operativos.pdf" },
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  },
  // ── UNED sin correspondencia directa ──
  {
    id: "UNED-FIA-SIN",
    origen: "SIN_CONVALIDACION",
    uned: { codigo: "61013066", nombre: "Fundamentos de Inteligencia Artificial", guiaPdf: "guias_uned/Fundamentos_de_Inteligencia_Artificial.pdf" },
    ugr: null,
    corresponde: "Sin correspondencia directa",
    creditos: 6,
    sinCorrespondencia: true
  }
];
