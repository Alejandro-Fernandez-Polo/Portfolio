/* UGR Horario - Docentes por grupo (capa de datos) */
const DOCENTES = [
  {
    key: "SO-A",
    name: "Miguel Lastra Leidinger",
    subjectCode: "SO",
    groupLetter: "A",
    profile: {
      dificultad: "gris",
      razon: "Correcto pero menos evidencia pública",
      opinion: ""
    }
  },
  {
    key: "SO-B",
    name: "Pablo Antonio Pico Valencia",
    subjectCode: "SO",
    groupLetter: "B",
    profile: {
      dificultad: "gris",
      razon: "Menos evidencia de docencia en SO",
      opinion: ""
    }
  },
  {
    key: "SO-C",
    name: "Patricia Paderewski Rodríguez",
    subjectCode: "SO",
    groupLetter: "C",
    profile: {
      dificultad: "naranja",
      razon: "Larga trayectoria en SO, experiencia con Linux",
      opinion: "Explica medianamente bien, si asistes a las clases te llevas cosillas entendidas a casa, que se agradece mucho en esta asignatura, pero no esperes enterarte de todo. Va rapídito pero es soportable. Es simpática y atiende bien las dudas en tutoría. Los exámenes son asefables pero corrige de forma dura."
    }
  },
  {
    key: "SO-D",
    name: "Alejandro José León Salas",
    subjectCode: "SO",
    groupLetter: "D",
    profile: {
      dificultad: "naranja",
      razon: "Experiencia directa, vinculación con Linux",
      opinion: "Le echa ganas a la asignatura pero explica demasiado rápido y la asignatura es infumable. Sus exámenes son a papel y muy largos. Es normal corrigiendo y no tarda mucho. Puede bajar la nota mínima para aprobarste (4 con algo en vez de 5)"
    }
  },
  {
    key: "SO-E",
    name: "José Luis Garrido Bullejos",
    subjectCode: "SO",
    groupLetter: "E",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático. Máxima categoría. Experiencia consolidada",
      opinion: "Este hombre es una enciclopedia andante, saber sabe como ninguno por lo que también espera que tu sepas lo mismo que Google, es muy apagado a la bibliografía de la asignatura, sí o si te va a hacer falta rellenar información de ellos ya que las diapositivas son meh, lo que de verdad importa es atender a lo que te dice, porque habla entre líneas y te da el examen hecho, lo que pasa que cualquiera se acuerda tan específicamente de lo que dijo. Importantísimo también que te vea con interés e incluso participando en clase, le gusta mucho que tomes parte en ellas sobre todo si hacéis preguntas interesantes, que vea que entendéis el tema. De igual manera es recomendable ir a tutoría a preguntarle cualquier cosa. Os pide que le hagáis la relación de ejercicios y que la corrijáis juntos porque si no él no hace ejercicios en clase. No es muy frecuente pero a lo mejor le da por hacer un ejercicio que cuenta un 10% de la nota de algo que haya puesto énfasis o que vea interesante de cara al examen o que investiguemos por nuestra cuenta. Los exámenes son otro rollo, preguntas complejas e incluso rebuscadas de verdadero o falso justificando y luego algún ejercicio práctico que normalmente también estará dado con una vuelta de rosca. Tarda MUCHÍSIMO en corregir osea que se sufre mucho teniendo en cuenta que es SO."
    }
  },
  {
    key: "IG-A",
    name: "Germán Arroyo Moreno",
    subjectCode: "IG",
    groupLetter: "A",
    profile: {
      dificultad: "amarillo",
      razon: "+20 años en gráficos, OpenGL/GLSL. Enfoque práctico",
      opinion: "Suele explicar las prácticas a su manera y las defensas consiste en hacer modificaciones en los códigos de tus prácticas para ver si lo has hecho tú (a veces las defensas son muy enredadas). Profesor que deja un poco que desees en las explicaciones pero si que trabajas y te esfuerzas puedes sacar muy buena nota con él."
    }
  },
  {
    key: "IG-B",
    name: "Juan Carlos Torres Cantero",
    subjectCode: "IG",
    groupLetter: "B",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, máximo dominio pero enfoque teórico",
      opinion: "Aunque de primeras parezca que no, es un buen profesor y se preocupa por que entiendas las cosas. Además, súper recommendable ir a revisión para el examen final de teoría. Si tienes más de un 3, puedes llevarte una sorpresa. Sus explicaciones en clase dejan mucho que desear. Es mejor ir a tutorías en donde lo explica todo mejor. Es estricto corrigiendo pero aconsejable ir a revisión ya que es posible subir nota pero tienes que rebatirle mucho dado que hay cosas que pones bien en el examen pero él te dice que está mal y luego no sabe muy bien como argumentarlo. El examen no se parece al modelo que proporciona además de que corrige totalmente aleatorio. En las revisiones dice que él tiene su método y no te explica nada, además de equivocarse intentando defender cómo ha corregido, te dice que solicites tribu nal y resulta que él es el director del departamento."
    }
  },
  {
    key: "IG-C",
    name: "Antonio López Fernández",
    subjectCode: "IG",
    groupLetter: "C",
    profile: {
      dificultad: "cyan",
      razon: "Continuidad teoría-prácticas, accesible",
      opinion: "Es muy buena gente y todo lo que te preguntas se va a implica en ayudarte pero las clases son muy aburridas y probablemente no te enteres de nada ni de las diapositivas ni de sus explicaciones de teoría pero no importa demasiado ya que el examen no es nada difícil y de hecho prácticamente dice como hacer los ejercicios durante el examen. La parte más importante de esta asignatura y donde realmente vas a dedicar el tiempo (al menos con este profesor) es en las prácticas. Como consejo diría que es conveniente tener más o menos buena relación con él (haciendo bien las prácticas, yendo a clase...) y sobre todo atender mucho y copiad con todo detalle cuando hace los ejercicios en clase porque no vais a tener más ejercicios ni explicaciones que las de clase y los ejercicios del examen son prácticamente iguales así que si no los copiáis (y muy prefiblemente entendéis) luego cuando vayáis a estudiar no vais a tener nada más allá de lo que os pasen."
    }
  },
  {
    key: "IG-D",
    name: "Juan Carlos Torres Cantero",
    subjectCode: "IG",
    groupLetter: "D",
    profile: {
      dificultad: "naranja",
      razon: "Mismo profesor que B, decidir por horario",
      opinion: "Aunque de primeras parezca que no, es un buen profesor y se preocupa por que entiendas las cosas. Además, súper recommendable ir a revisión para el examen final de teoría. Si tienes más de un 3, puedes llevarte una sorpresa. Sus explicaciones en clase dejan mucho que desear. Es mejor ir a tutorías en donde lo explica todo mejor. Es estricto corrigiendo pero aconsejable ir a revisión ya que es posible subir nota pero tienes que rebatirle mucho dado que hay cosas que pones bien en el examen pero él te dice que está mal y luego no sabe muy bien como argumentarlo. El examen no se parece al modelo que proporciona además de que corrige totalmente aleatorio. En las revisiones dice que él tiene su método y no te explica nada, además de equivocarse intentando defender cómo ha corregido, te dice que solicites tribu nal y resulta que él es el director del departamento."
    }
  },
  {
    key: "IG-E",
    name: "Domingo Martín Perandrés",
    subjectCode: "IG",
    groupLetter: "E",
    profile: {
      dificultad: "naranja",
      razon: "Buen perfil técnico pero menos evidencia pública",
      opinion: "Explica el temario de prácticas de forma detallada a nivel teórico. Saca a los alumnos a la pizarra a hacer ejercicios que propone y suele hacer preguntas en clase. Es MUY estricto corrigiendo el examen de la ordinaria. Realmente no es tan tan malo, pero es una persona metódica y le gustan las cosas bien hechas. Valora muchísimo que asistas, que le pongas interés, que preguntes, que hagas los ejercicios, que corrijas las cosas que te diga, etc... Si bien es algo estricto a la hora de corregir y de hacer ejercicios, explica bastante bien la asignatura y habiendo asistido a todas las clases puedo afirmar que todo lo que pide en el examen lo da en clase. Además de que el trato al alumnado fue bastante bueno, se le pueden preguntar dudas sin problema y más allá de que pueda asustar un poco el inicio de curso con la tarea que pone de \"para quién quiera aprobar\" a mí me parece un buen profesor. Nos permitió hacer dos clases de dudas cerca del examen lo cual se agradece bastante porque explica como quiere que hagamos los ejercicios y algunos consejos para ejercicios algo difíciles de suelen. Suela aprobar el 50% de los matriculados."
    }
  },
  {
    key: "ISE-A",
    name: "Héctor Emilio Pomares Cintas",
    subjectCode: "ISE",
    groupLetter: "A",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, altísimo nivel pero alta exigencia",
      opinion: "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    }
  },
  {
    key: "ISE-B",
    name: "Héctor Emilio Pomares Cintas",
    subjectCode: "ISE",
    groupLetter: "B",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, altísimo nivel pero alta exigencia",
      opinion: "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    }
  },
  {
    key: "ISE-C",
    name: "Héctor Emilio Pomares Cintas",
    subjectCode: "ISE",
    groupLetter: "C",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, altísimo nivel pero alta exigencia",
      opinion: "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    }
  },
  {
    key: "ISE-D",
    name: "Pablo García Sánchez",
    subjectCode: "ISE",
    groupLetter: "D",
    profile: {
      dificultad: "verde",
      razon: "Práctico, cercano al sector, Software Libre",
      opinion: "Es bastante bueno y sabe del tema. Pone empeño y resuelve dudas aunque no da tiempo a copiar las explicaciones en clase. Se lleva genial con los alumnos y como es joven es más comprensible con las cosas, explica bien, fomenta que participes y es muy enrollao. Le gusta mucho charlar de otra cosa que no sea dar clase. Los exámenes, dentro de lo que cabean, son asequibles y corrige bien, además es muy propenso a ayudarte en cuanto a dudas"
    }
  },
  {
    key: "ISE-E",
    name: "Héctor Emilio Pomares Cintas",
    subjectCode: "ISE",
    groupLetter: "E",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, altísimo nivel pero alta exigencia",
      opinion: "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    }
  },
  {
    key: "DDSI-A",
    name: "Carlos Jesús Fernández Basso",
    subjectCode: "DDSI",
    groupLetter: "A",
    profile: {
      dificultad: "gris",
      razon: "Enfoque práctico, menos evidencia pública",
      opinion: ""
    }
  },
  {
    key: "DDSI-B",
    name: "Ignacio José Blanco Medina",
    subjectCode: "DDSI",
    groupLetter: "B",
    profile: {
      dificultad: "verde",
      razon: "Trayectoria consolidada en bases de datos y SI",
      opinion: "Extrovertido y buena gente, se hace el duro a veces pero no lo es. Te suele aprobar con buena nota y te busca horario de tutoría aunque no aparezca esa hora como disponible en Prado. Explica bien, aunque a veces es difícil de seguir y es fácil aprobar"
    }
  },
  {
    key: "DDSI-C",
    name: "Carlos Alberto Cruz Corona",
    subjectCode: "DDSI",
    groupLetter: "C",
    profile: {
      dificultad: "cyan",
      razon: "Titular, enfoque multidisciplinar aplicado",
      opinion: "De los mejores de la asignatura. Es muy despreocupado y la carga es mínima."
    }
  },
  {
    key: "DDSI-D",
    name: "David Criado Ramón",
    subjectCode: "DDSI",
    groupLetter: "D",
    profile: {
      dificultad: "gris",
      razon: "Menos información pública verificable",
      opinion: ""
    }
  },
  {
    key: "ALEM-A",
    name: "José Carlos Rosales González",
    subjectCode: "ALEM",
    groupLetter: "A",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, +100 artículos, muy teórico y denso",
      opinion: "En clase solo lee PDF aunque tiene clases grabadas y sus apuntes son buenos. Estricto a la hora de corregir ya que es todo bien o todo mal. Conviene ir a tutorías pero no a las revisiones del examen final (no se lo toma bien). Llevando la asignatura al día se aprueba."
    }
  },
  {
    key: "ALEM-B",
    name: "Juan Manuel Urbano Blanco",
    subjectCode: "ALEM",
    groupLetter: "B",
    profile: {
      dificultad: "negro",
      razon: "Enseñanza estructurada, pausado y metódico",
      opinion: "La relación con el alumnado es de todo menos buena, su forma de corregir es terrible, en las clases explica demasiado rápido (así todo el curso) y no te enteras de nada, reprocha la poca comprensión de sus clases a los alumnos por \"no estudiar\". No te da ninguna información de cómo va a evaluarte, no te explica nada sobre los exámenes finales y si le preguntas se enfada. Es un tío muy estricto pero si haces las cosas como a él le gusta puedes aprobar."
    }
  },
  {
    key: "ALEM-C",
    name: "Juan Manuel Urbano Blanco",
    subjectCode: "ALEM",
    groupLetter: "C",
    profile: {
      dificultad: "negro",
      razon: "Enseñanza estructurada, pausado y metódico",
      opinion: "La relación con el alumnado es de todo menos buena, su forma de corregir es terrible, en las clases explica demasiado rápido (así todo el curso) y no te enteras de nada, reprocha la poca comprensión de sus clases a los alumnos por \"no estudiar\". No te da ninguna información de cómo va a evaluarte, no te explica nada sobre los exámenes finales y si le preguntas se enfada. Es un tío muy estricto pero si haces las cosas como a él le gusta puedes aprobar."
    }
  },
  {
    key: "ALEM-D",
    name: "José Carlos Rosales González",
    subjectCode: "ALEM",
    groupLetter: "D",
    profile: {
      dificultad: "naranja",
      razon: "Catedrático, +100 artículos, muy teórico y denso",
      opinion: "En clase solo lee PDF aunque tiene clases grabadas y sus apuntes son buenos. Estricto a la hora de corregir ya que es todo bien o todo mal. Conviene ir a tutorías pero no a las revisiones del examen final (no se lo toma bien). Llevando la asignatura al día se aprueba."
    }
  },
  {
    key: "ALEM-E",
    name: "Jesús García Miranda",
    subjectCode: "ALEM",
    groupLetter: "E",
    profile: {
      dificultad: "amarillo",
      razon: "Veterano, opción intermedia",
      opinion: "Mejor profesor de la ETSIIT. Pone preguntas con \"una vuelta de tornillo\" de más, pero sus explicaciones y su implicación están a la altura. Está siempre disponible y te explica lo que haga falta, es cercano y amable. En las clases de teoría no suele apuntar mucho en la pizarra, explica las diapositivas y de vez en cuando hace algún ejemplo. No hay parciales, el examen final no es fácil y es largo (3 horas aproximadamente). Además el examen consta con bastantes ejercicios que cambian cada año, aunque la estructura general del examen es similar (un ejercicio por tema más o menos). A la hora de la corrección es relativamente estricto."
    }
  },
  {
    key: "ALEM-F",
    name: "José Antonio Jiménez Madrid",
    subjectCode: "ALEM",
    groupLetter: "F",
    profile: {
      dificultad: "amarillo",
      razon: "Enfoque teórico pero metódico",
      opinion: "Es muy buena gente, sus clases no son una maravilla pero es bueno. La relación con el alumnado es excelente, responde a todas las dudas y da muchas más horas de tutoría de las que debería ya que se nota que es profesor por vocación. En prado sube multitud de contenido de ampliación y divulgación para quienes estén interesados. Tiene muy buen carácter y le encanta resolver dudas en tutorías. Es un poco caótico pero le gusta mucho su asignatura."
    }
  },
  {
    key: "SCD-A",
    name: "Carlos Ureña Almagro",
    subjectCode: "SCD",
    groupLetter: "A",
    profile: {
      dificultad: "amarillo",
      razon: "Perfil dual gráficas+concurrencia, menos directo",
      opinion: "Explica bien la teoría y sus exámenes son asefables. Corrige de manera justa."
    }
  },
  {
    key: "SCD-B",
    name: "Luis Gonzaga Baca Ruiz",
    subjectCode: "SCD",
    groupLetter: "B",
    profile: {
      dificultad: "cyan",
      razon: "Titular, +45 publicaciones, especialista en concurrencia",
      opinion: "Muy buen profesor y muy buena relacion con el alumnado, sus examenes son super asefables, suele preguntar unos 6 puntos de teoria en tipo test (bastante sencillo) y el resto en uno o dos problemas de la teoria dada en clase (semáforos, monitores...). Regala puntos por participar, tanto en teoria como practicas, por lo que hay gente que aprueba la asignatura sin hacer ni siquiera un examen. Corrige muy rápido y la probabilidad de sacar muy buena nota con él es alta si te lo propones. Con estudiar sus diapositivas vas sobrado tanto en el test como los ejercicios."
    }
  },
  {
    key: "SCD-C",
    name: "José Ángel Segura Muros",
    subjectCode: "SCD",
    groupLetter: "C",
    profile: {
      dificultad: "gris",
      razon: "Experiencia consolidada en sistemas distribuidos",
      opinion: ""
    }
  },
  {
    key: "SCD-D",
    name: "Luis Gonzaga Baca Ruiz",
    subjectCode: "SCD",
    groupLetter: "D",
    profile: {
      dificultad: "cyan",
      razon: "Titular, +45 publicaciones, especialista en concurrencia",
      opinion: "Muy buen profesor y muy buena relacion con el alumnado, sus examenes son super asefables, suele preguntar unos 6 puntos de teoria en tipo test (bastante sencillo) y el resto en uno o dos problemas de la teoria dada en clase (semáforos, monitores...). Regala puntos por participar, tanto en teoria como practicas, por lo que hay gente que aprueba la asignatura sin hacer ni siquiera un examen. Corrige muy rápido y la probabilidad de sacar muy buena nota con él es alta si te lo propones. Con estudiar sus diapositivas vas sobrado tanto en el test como los ejercicios."
    }
  },
  {
    key: "SCD-E",
    name: "Pedro Villar Castro",
    subjectCode: "SCD",
    groupLetter: "E",
    profile: {
      dificultad: "amarillo",
      razon: "Titular, experiencia continua en SCD",
      opinion: "Explica las diapositivas de memoria aunque los ejercicios los explica bien y hace bastantes. En las tutorías no es malo pero tampoco esperes que te arregle el código. Corrige los exámenes muy a la baja. No hace parciales como otros profesores y su examen de la ordinaria son ejercicios de la relación, así que aunque sea larga conviene hacerla entera porque suelen ser muchos ejercicios de ahí."
    }
  },
  {
    key: "FFT-A",
    name: "Pedro Cartujo Cassinello",
    subjectCode: "FFT",
    groupLetter: "A",
    profile: {
      dificultad: "amarillo",
      razon: "Bonachón pero explica fatal, bueno corrigiendo",
      opinion: "Bonachón pero explica fatal. Muy recomendable acudir a tutorías para la revisión del examen. Repite preguntas de hace años y es bueno corrigiendo. Si suspendes en la extraordinaria con al menos un 3 ve a la revisión, puedes llevarte una sorpresa y aprobar."
    }
  },
  {
    key: "FFT-B",
    name: "José Luis Padilla De la Torre",
    subjectCode: "FFT",
    groupLetter: "B",
    profile: {
      dificultad: "rojo",
      razon: "Explica bien pero muchísimo temario, examen muy duro",
      opinion: "Explica muy bien pero es muchísimo temario y a diferencia de otros no hace parciales. Examen final muy duro y aprueba poca gente."
    }
  },
  {
    key: "FFT-C",
    name: "Ignacio Melchor Ferrer",
    subjectCode: "FFT",
    groupLetter: "C",
    profile: {
      dificultad: "verde",
      razon: "Explica muy bien, muchos ejámplos, recomendado",
      opinion: "Explica muy bien, se hacen muchos ejercicios (incluso clases de repaso antes del examen). Sus videos son clave. Muy recomendado."
    }
  },
  {
    key: "FFT-D",
    name: "Ignacio Melchor Ferrer",
    subjectCode: "FFT",
    groupLetter: "D",
    profile: {
      dificultad: "verde",
      razon: "Explica muy bien, muchos ejámplos, recomendado",
      opinion: "Explica muy bien, se hacen muchos ejercicios (incluso clases de repaso antes del examen). Sus videos son clave. Muy recomendado."
    }
  },
  {
    key: "FFT-E",
    name: "Pedro Cartujo Cassinello",
    subjectCode: "FFT",
    groupLetter: "E",
    profile: {
      dificultad: "naranja",
      razon: "Bonachón pero explica fatal, tutorías recomendadas",
      opinion: "Bonachón pero explica fatal. Muy recomendable acudir a tutorías para la revisión del examen. Repite preguntas de hace años y es bueno corrigiendo. Si suspendes en la extraordinaria con al menos un 3 ve a la revisión, puedes llevarte una sorpresa y aprobar."
    }
  },
  {
    key: "FFT-F",
    name: "Pedro García Fernández",
    subjectCode: "FFT",
    groupLetter: "F",
    profile: {
      dificultad: "gris",
      razon: "Perfil desconocido",
      opinion: ""
    }
  },
  {
    key: "EC-A",
    name: "Francisco Javier Fernández Baldomero",
    subjectCode: "EC",
    groupLetter: "A",
    profile: {
      dificultad: "naranja",
      razon: "Estadísticas bajas, material incompleto",
      opinion: "Imposible seguir en clase y se refleja en sus estadísticas (60% aprobado con 5 o 6, solo 3 personas con un 7, 1 persona con un 8). Cambia mucho de tema y se concentra en cosas 0 importantes (por ejemplo sin exageración, el 80% de las clases se te pasaba los primeros 15 min explicando el sistema de evaluación porque un alumno empanado le había mandado un correo y otra vez se pasó unos 5 min escribiendo 1s para explicar lo que era FFFFFFFF en binario). Esto desmotiva al alumno para ir a clases pero el gran problema es que sus apuntes no están NADA completos. No se puede estudiar de ellos. Mucha gente cree aprobar su examen final es solo una cuestion de hacer infinitos tests, y yo no lo recomiendo. Es mucho mejor, hacer menos tests y tratar de conseguir su bibliografía principal en pdf y ir haciendo Ctrl+F en conceptos que no entiendas, o conseguir los libros en biblioteca e ir leyendo. Además de buscar en YouTube explicaciones de otras universidades españolas. Muy recomendable apuntar como hacer los problemas de clase a medida que vas entregando (si es que entregas alguno porque no te motiva para nada el decir que cuentan poco) porque para el examen final ya te habras olvidado el procedimiento para resolverlos. Es casi imposible aprobar la asignatura sin tener un máximo en la nota de clase (problemas + tests de clase), priorizar esto. Por estas razones, por su forma de dar la clase y armar el material para que el alumnno estudie, rojo sangre es el color correcto."
    }
  },
  {
    key: "EC-B",
    name: "Antonio Cañas Vargas",
    subjectCode: "EC",
    groupLetter: "B",
    profile: {
      dificultad: "verde",
      razon: "Creador de SWAD, muy buen recurso",
      opinion: "Un profesor muy bueno y cercano. Te responde las dudas de forma ULTRA completa y muy rápido en cualquier momento. Explica bien, pero entre que la asignatura NO es fácil de seguir y que él tampoco es precisamente el alma de la fiesta, como te pierdas o te distraigas más de la cuenta (que no es raro) la clase se te puede hacer bastante aburrida porque no le enteres de nada. Corrige bien y te da muchos recursos para poder subir nota (los \"kahoots\" de todas las clases, los ejercicios...) y aunque creas que el examen final te lo haya hechoWTal, la magia de cañas lo mismo te te have llevarte una sorpresa. Recomendable. Es el creador de SWAD btw."
    }
  },
  {
    key: "EC-C",
    name: "Francisco Javier Fernández Baldomero",
    subjectCode: "EC",
    groupLetter: "C",
    profile: {
      dificultad: "naranja",
      razon: "Estadísticas bajas, material incompleto",
      opinion: "Imposible seguir en clase y se refleja en sus estadísticas (60% aprobado con 5 o 6, solo 3 personas con un 7, 1 persona con un 8). Cambia mucho de tema y se concentra en cosas 0 importantes (por ejemplo sin exageración, el 80% de las clases se te pasaba los primeros 15 min explicando el sistema de evaluación porque un alumno empanado le había mandado un correo y otra vez se pasó unos 5 min escribiendo 1s para explicar lo que era FFFFFFFF en binario). Esto desmotiva al alumno para ir a clases pero el gran problema es que sus apuntes no están NADA completos. No se puede estudiar de ellos. Mucha gente cree aprobar su examen final es solo una cuestion de hacer infinitos tests, y yo no lo recomiendo. Es mucho mejor, hacer menos tests y tratar de conseguir su bibliografía principal en pdf y ir haciendo Ctrl+F en conceptos que no entiendas, o conseguir los libros en biblioteca e ir leyendo. Además de buscar en YouTube explicaciones de otras universidades españolas. Muy recomendable apuntar como hacer los problemas de clase a medida que vas entregando (si es que entregas alguno porque no te motiva para nada el decir que cuentan poco) porque para el examen final ya te habras olvidado el procedimiento para resolverlos. Es casi imposible aprobar la asignatura sin tener un máximo en la nota de clase (problemas + tests de clase), priorizar esto. Por estas razones, por su forma de dar la clase y armar el material para que el alumnno estudie, rojo sangre es el color correcto."
    }
  },
  {
    key: "EC-D",
    name: "Francisco Javier Fernández Baldomero",
    subjectCode: "EC",
    groupLetter: "D",
    profile: {
      dificultad: "naranja",
      razon: "Estadísticas bajas, material incompleto",
      opinion: "Imposible seguir en clase y se refleja en sus estadísticas (60% aprobado con 5 o 6, solo 3 personas con un 7, 1 persona con un 8). Cambia mucho de tema y se concentra en cosas 0 importantes (por ejemplo sin exageración, el 80% de las clases se te pasaba los primeros 15 min explicando el sistema de evaluación porque un alumno empanado le había mandado un correo y otra vez se pasó unos 5 min escribiendo 1s para explicar lo que era FFFFFFFF en binario). Esto desmotiva al alumno para ir a clases pero el gran problema es que sus apuntes no están NADA completos. No se puede estudiar de ellos. Mucha gente cree aprobar su examen final es solo una cuestion de hacer infinitos tests, y yo no lo recomiendo. Es mucho mejor, hacer menos tests y tratar de conseguir su bibliografía principal en pdf y ir haciendo Ctrl+F en conceptos que no entiendas, o conseguir los libros en biblioteca e ir leyendo. Además de buscar en YouTube explicaciones de otras universidades españolas. Muy recomendable apuntar como hacer los problemas de clase a medida que vas entregando (si es que entregas alguno porque no te motiva para nada el decir que cuentan poco) porque para el examen final ya te habras olvidado el procedimiento para resolverlos. Es casi imposible aprobar la asignatura sin tener un máximo en la nota de clase (problemas + tests de clase), priorizar esto. Por estas razones, por su forma de dar la clase y armar el material para que el alumnno estudie, rojo sangre es el color correcto."
    }
  },
  {
    key: "EC-E",
    name: "Antonio Cañas Vargas",
    subjectCode: "EC",
    groupLetter: "E",
    profile: {
      dificultad: "verde",
      razon: "Creador de SWAD, muy buen recurso",
      opinion: "Un profesor muy bueno y cercano. Te responde las dudas de forma ULTRA completa y muy rápido en cualquier momento. Explica bien, pero entre que la asignatura NO es fácil de seguir y que él tampoco es precisamente el alma de la fiesta, como te pierdas o te distraigas más de la cuenta (que no es raro) la clase se te puede hacer bastante aburrida porque no le enteres de nada. Corrige bien y te da muchos recursos para poder subir nota (los \"kahoots\" de todas las clases, los ejercicios...) y aunque creas que el examen final te lo haya hechoWTal, la magia de cañas lo mismo te te have llevarte una sorpresa. Recomendable. Es el creador de SWAD btw."
    }
  },
  {
    key: "ED-A",
    name: "Francisco Javier Rodríguez Díaz",
    subjectCode: "ED",
    groupLetter: "A",
    profile: {
      dificultad: "naranja",
      razon: "Estricto corrigiendo, buena persona",
      opinion: "Sus clases son muy aburridas y se dedica a leer los PDFs (el material subido a Prado no aporta demasiado). A la hora de corregir los exámenes es muy estricto y al mínimo error pone un 0 directamente en el ejercicio. Recomendable tener buena nota en las prácticas y prepararte muy bien al menos tres ejercicios del examen para no llevarse sorpresas. Es muy buena persona. Te resuelve las dudas que tengas con mucha amabilidad. Incluso ofrece aumentar los deadlines de las tareas si el alumnno lo necesita."
    }
  },
  {
    key: "ED-B",
    name: "Joaquín Fernández Valdivia",
    subjectCode: "ED",
    groupLetter: "B",
    profile: {
      dificultad: "verde",
      razon: "100% recomendable, el mejor de ED",
      opinion: "Puedes aprobar la asignatura sacando un 2 en el final, ya que da varios puntos entre prácticas y entregas de teoría. Además, explica muy bien, es rápido corrigiendo y siempre está disponible para lo que haga falta. Ayuda en todo lo que pueda. Profesor que vive por y para sus alumnos. Es muy cercano y además facilita todo para poder aprobar la asignatura. Explicaciones claras y muchísimo temario y ejercicios disponibles para poder practicar de cara al examen. Se nota que le gusta su asignatura y dar clase; lo mejor de ED sin duda alguna. Al final del cuatrimestre, da una charla muy interesante acerca del futuro que se nos viene como ingenieros. 100% recomendable."
    }
  },
  {
    key: "ED-C",
    name: "Miguel García Silvente",
    subjectCode: "ED",
    groupLetter: "C",
    profile: {
      dificultad: "rojo",
      razon: "Organización deficiente, exámenes duros",
      opinion: "El profesor se organiza bastante mal en cuanto a tiempos y coordinación entre teoría y prácticas, lo que hace que algunos temas se den tarde, con prisas o incluso no se lleguen a ver (grafos no se da). Además, a veces lo explicado en teoría no es suficiente para resolver los ejercicios (como por ejemplo en árboles binarios). Los exámenes son más difíciles que los del departamento y los enunciados no siempre son claros, ni en exámenes ni en la relación de ejercicios. La comunicación con el profesor no es muy fluida durante el curso, aunque mejora antes de los exámenes. Eso sí, si vas a tutoría, te resuelve las dudas."
    }
  },
  {
    key: "ED-D",
    name: "Rosa María Rodríguez Sánchez",
    subjectCode: "ED",
    groupLetter: "D",
    profile: {
      dificultad: "verde",
      razon: "Explicaciones desde 0, muy completa",
      opinion: "Explica todo desde 0. Las explicaciones son buenas y en profundidad. Si vas al día es casi imposible perderse. Las clases son algunas aburridas y lentas pero dado que es una asignatura que se basa en la comprensión lo acabas agradeciendo. Además pone a disposición de los alumnos videos de las clases por lo que si no vas puedes igualmente verlos y enterarte."
    }
  },
  {
    key: "ED-E",
    name: "Rosa María Rodríguez Sánchez",
    subjectCode: "ED",
    groupLetter: "E",
    profile: {
      dificultad: "verde",
      razon: "Explicaciones desde 0, muy completa",
      opinion: "Explica todo desde 0. Las explicaciones son buenas y en profundidad. Si vas al día es casi imposible perderse. Las clases son algunas aburridas y lentas pero dado que es una asignatura que se basa en la comprensión lo acabas agradeciendo. Además pone a disposición de los alumnos videos de las clases por lo que si no vas puedes igualmente verlos y enterarte."
    }
  },
];
