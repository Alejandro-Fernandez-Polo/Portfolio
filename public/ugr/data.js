const SUBJECTS = [
  {
    "codigo": "FFT",
    "nombre": "Fundamentos Físicos y Tecnológicos",
    "curso": 1,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1"
          ],
          "F1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "ALEM",
    "nombre": "Álgebra Lineal y Estructuras Matemáticas",
    "curso": 1,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": []
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1"
          ],
          "F1": [
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "SO",
    "nombre": "Sistemas Operativos",
    "curso": 2,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "miercoles",
              "inicio": "8:30",
              "fin": "9:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "SCD",
    "nombre": "Sistemas Concurrentes y Distribuidos",
    "curso": 2,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "19:30",
            "fin": "20:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DDSI",
    "nombre": "Diseño y Desarrollo de Sistemas de Información",
    "curso": 3,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "lunes",
              "inicio": "13:30",
              "fin": "14:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            },
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "IG",
    "nombre": "Informática Gráfica",
    "curso": 3,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            },
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "ISE",
    "nombre": "Ingeniería de Servidores",
    "curso": 3,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DBA",
    "nombre": "Desarrollo Basado en Agentes",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "13:30",
            "fin": "14:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "jueves",
              "inicio": "13:30",
              "fin": "14:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DGP",
    "nombre": "Dirección y Gestión de Proyectos",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "8:30",
              "fin": "9:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "LP",
    "nombre": "Lógica y Programación",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "MDA",
    "nombre": "Metodologías de Desarrollo Ágil",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "8:30",
            "fin": "9:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "PGV",
    "nombre": "Programación Gráfica de Videojuegos",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "SSO",
    "nombre": "Seguridad en Sistemas Operativos",
    "curso": 4,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "IA",
    "nombre": "Inteligencia Artificial",
    "curso": 2,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1"
          ],
          "C1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DSD",
    "nombre": "Desarrollo de Sistemas Distribuidos",
    "curso": 3,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DS",
    "nombre": "Desarrollo de Software",
    "curso": 3,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "DIU",
    "nombre": "Diseño de Interfaces de Usuario",
    "curso": 3,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "SG",
    "nombre": "Sistemas Gráficos",
    "curso": 3,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "SIBW",
    "nombre": "Sistemas de Información Basados en Web",
    "curso": 3,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1"
          ],
          "B1": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ]
  },
  {
    "codigo": "CEGE",
    "nombre": "Creación de Empresas y Gestión Emprendedora",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "8:30",
            "fin": "9:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "DI",
    "nombre": "Derecho Informático",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "martes",
            "inicio": "13:30",
            "fin": "14:30"
          },
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "EISI",
    "nombre": "Ética, Informática y Sociedad de la Información",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "8:30",
            "fin": "9:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "AO",
    "nombre": "Animación por Ordenador",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "NTP",
    "nombre": "Nuevas Tecnologías de la Programación",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "13:30",
            "fin": "14:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "PPR",
    "nombre": "Programación Paralela",
    "curso": 4,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ]
  },
  {
    "codigo": "CA",
    "nombre": "Cálculo",
    "curso": 1,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "A2": [
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "B2": [
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "C2": [
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D2",
            "D3"
          ],
          "D2": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "D3": [
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "E2": [
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "E3": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "F2": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "FMI"
  },
  {
    "codigo": "FP",
    "nombre": "Fundamentos de Programación",
    "curso": 1,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D3"
          ],
          "D3": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E3": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "F2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "DAW"
  },
  {
    "codigo": "FS",
    "nombre": "Fundamentos del Software",
    "curso": 1,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "C2": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [],
        "practicas": {
          "subgrupos": [
            "D1"
          ],
          "D1": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E3": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "F2": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "DAW"
  },
  {
    "codigo": "ES",
    "nombre": "Estadística",
    "curso": 1,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A2": [
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "D2": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "D3": [
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ],
          "E3": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ],
          "F2": [
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "Estadística"
  },
  {
    "codigo": "IES",
    "nombre": "Ingeniería, Empresa y Sociedad",
    "curso": 1,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": []
        }
      }
    ],
    "aprobada": true,
    "corresponde": "DAW"
  },
  {
    "codigo": "LMD",
    "nombre": "Lógica y Métodos Discretos",
    "curso": 1,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "A2": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "A3": [
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "B2": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "B3": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "C2": [
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D3": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ],
          "E2": [
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E3": [
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "F2": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "Lógica"
  },
  {
    "codigo": "MP",
    "nombre": "Metodología de la Programación",
    "curso": 1,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D3": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E3": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "F2": [
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "IC1"
  },
  {
    "codigo": "TOC",
    "nombre": "Tecnología y Organización de Computadores",
    "curso": 1,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A3": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D3": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2",
            "E3"
          ],
          "E1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E3": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "F",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "F1",
            "F2"
          ],
          "F1": [
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "F2": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "FSD"
  },
  {
    "codigo": "EC",
    "nombre": "Estructura de Computadores",
    "curso": 2,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A2": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A3": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "B2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "B3": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2",
            "C3"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "C3": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D2": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D3": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "E2": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "IC2"
  },
  {
    "codigo": "ED",
    "nombre": "Estructura de Datos",
    "curso": 2,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          },
          {
            "dia": "viernes",
            "inicio": "13:30",
            "fin": "14:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "A2": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "A3": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "8:30",
            "fin": "9:30"
          },
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "B2": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "B3": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2",
            "C3"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "C2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "C3": [
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D2": [
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D3": [
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "jueves",
            "inicio": "19:30",
            "fin": "20:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "E2": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "EPED"
  },
  {
    "codigo": "PDOO",
    "nombre": "Programación y Diseño Orientado a Objetos",
    "curso": 2,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "martes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A2": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "A3": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "B2": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "B3": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2",
            "C3"
          ],
          "C1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "miercoles",
              "inicio": "8:30",
              "fin": "9:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "C3": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D2": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D3": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "E2": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "POO"
  },
  {
    "codigo": "ALG",
    "nombre": "Algorítmica",
    "curso": 2,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "A2": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "A3": [
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "B3": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2",
            "C3"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ],
          "C3": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "martes",
            "inicio": "16:30",
            "fin": "17:30"
          },
          {
            "dia": "viernes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "D3": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          },
          {
            "dia": "viernes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ],
          "E2": [
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": false,
    "corresponde": "PREDA"
  },
  {
    "codigo": "AC",
    "nombre": "Arquitectura de Computadores",
    "curso": 2,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "martes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2",
            "C3"
          ],
          "C1": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C3": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "jueves",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "jueves",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D3": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "IC3"
  },
  {
    "codigo": "FBD",
    "nombre": "Fundamentos de Bases de Datos",
    "curso": 2,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            }
          ],
          "B2": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "15:30",
            "fin": "16:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            },
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D3": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            },
            {
              "dia": "jueves",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "17:30",
            "fin": "18:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            },
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            },
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "DAW"
  },
  {
    "codigo": "FIS",
    "nombre": "Fundamentos de Ingeniería del Software",
    "curso": 2,
    "cuatrimestre": 2,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "miercoles",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "miercoles",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "viernes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "jueves",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "jueves",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "C2": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "miercoles",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2"
          ],
          "D1": [
            {
              "dia": "miercoles",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "miercoles",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "D2": [
            {
              "dia": "viernes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "viernes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "lunes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "E2": [
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "DAW"
  },
  {
    "codigo": "FR",
    "nombre": "Fundamentos de Redes",
    "curso": 3,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "jueves",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "lunes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "lunes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "viernes",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "viernes",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "miercoles",
              "inicio": "8:30",
              "fin": "9:30"
            },
            {
              "dia": "miercoles",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "lunes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "lunes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "jueves",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "martes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "martes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "C2": [
            {
              "dia": "lunes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2"
          ],
          "D1": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "E",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "15:30",
            "fin": "16:30"
          },
          {
            "dia": "lunes",
            "inicio": "16:30",
            "fin": "17:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "E1",
            "E2"
          ],
          "E1": [
            {
              "dia": "martes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "martes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ],
          "E2": [
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            },
            {
              "dia": "lunes",
              "inicio": "18:30",
              "fin": "19:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "Redes"
  },
  {
    "codigo": "MC",
    "nombre": "Modelos de Computación",
    "curso": 3,
    "cuatrimestre": 1,
    "creditos": 6,
    "grupos": [
      {
        "letra": "A",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "lunes",
            "inicio": "10:30",
            "fin": "11:30"
          },
          {
            "dia": "lunes",
            "inicio": "9:30",
            "fin": "10:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "A1",
            "A2",
            "A3"
          ],
          "A1": [
            {
              "dia": "viernes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "viernes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A2": [
            {
              "dia": "miercoles",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "miercoles",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ],
          "A3": [
            {
              "dia": "martes",
              "inicio": "11:30",
              "fin": "12:30"
            },
            {
              "dia": "martes",
              "inicio": "12:30",
              "fin": "13:30"
            }
          ]
        }
      },
      {
        "letra": "B",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "jueves",
            "inicio": "11:30",
            "fin": "12:30"
          },
          {
            "dia": "jueves",
            "inicio": "12:30",
            "fin": "13:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "B1",
            "B2",
            "B3"
          ],
          "B1": [
            {
              "dia": "viernes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "viernes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B2": [
            {
              "dia": "jueves",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "jueves",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ],
          "B3": [
            {
              "dia": "martes",
              "inicio": "10:30",
              "fin": "11:30"
            },
            {
              "dia": "martes",
              "inicio": "9:30",
              "fin": "10:30"
            }
          ]
        }
      },
      {
        "letra": "C",
        "turno": "mañana",
        "teoria": [
          {
            "dia": "martes",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "martes",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "C1",
            "C2"
          ],
          "C1": [
            {
              "dia": "lunes",
              "inicio": "16:30",
              "fin": "17:30"
            },
            {
              "dia": "lunes",
              "inicio": "17:30",
              "fin": "18:30"
            }
          ],
          "C2": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      },
      {
        "letra": "D",
        "turno": "tarde",
        "teoria": [
          {
            "dia": "miercoles",
            "inicio": "17:30",
            "fin": "18:30"
          },
          {
            "dia": "miercoles",
            "inicio": "18:30",
            "fin": "19:30"
          }
        ],
        "practicas": {
          "subgrupos": [
            "D1",
            "D2",
            "D3"
          ],
          "D1": [
            {
              "dia": "jueves",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "jueves",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D2": [
            {
              "dia": "viernes",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "viernes",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ],
          "D3": [
            {
              "dia": "miercoles",
              "inicio": "15:30",
              "fin": "16:30"
            },
            {
              "dia": "miercoles",
              "inicio": "16:30",
              "fin": "17:30"
            }
          ]
        }
      }
    ],
    "aprobada": true,
    "corresponde": "AGL"
  }
];
