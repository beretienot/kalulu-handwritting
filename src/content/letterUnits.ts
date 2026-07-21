import type { LetterUnit } from "./types";

// Contenido extraído fielmente de reference/Argentina-Cuadernillo-1 (1).pdf, páginas 3-21.
// Cada unidad = 1 letra nueva; los ejercicios de lectura solo usan letras ya vistas,
// igual que en el cuadernillo original.
export const letterUnits: LetterUnit[] = [
  {
    id: "a",
    order: 1,
    grafemas: ["A", "a", "Á", "á"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "a",
    lectura: {
      grid: [
        ["á", "á", "a", "a", "a", "á"],
        ["a", "á", "á", "a", "á", "a"],
        ["á", "á", "á", "a", "á", "á"],
        ["a", "a", "a", "á", "a", "a"],
      ],
      palabras: [],
      oraciones: [],
    },
    escritura: {
      trazos: ["A", "Á", "a", "á"],
      palabraFinal: [],
    },
  },
  {
    id: "m",
    order: 2,
    grafemas: ["M", "m"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "mmm",
    lectura: {
      grid: [
        ["ma", "má", "am", "am", "ám", "ám"],
        ["ám", "ma", "má", "má", "am", "ma"],
        ["ám", "ma", "má", "am", "am", "má"],
        ["má", "am", "ma", "ám", "ám", "ma"],
      ],
      palabras: ["ma", "ama", "mamá"],
      oraciones: ["Mamá ama.", "Ama a mamá."],
    },
    escritura: {
      trazos: ["M", "m"],
      palabraFinal: ["mamá"],
    },
  },
  {
    id: "e",
    order: 3,
    grafemas: ["E", "e", "É", "é"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "e",
    lectura: {
      grid: [
        ["em", "e", "é", "me", "me", "me"],
        ["e", "e", "me", "em", "em", "é"],
        ["em", "é", "em", "me", "e", "é"],
        ["e", "em", "é", "é", "e", "me"],
      ],
      palabras: ["me", "eme"],
      oraciones: ["Mamá me ama.", "Me ama mamá."],
    },
    escritura: {
      trazos: ["E", "É", "e", "é"],
      palabraFinal: ["eme"],
    },
  },
  {
    id: "o",
    order: 4,
    grafemas: ["O", "o", "Ó", "ó"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "o",
    lectura: {
      grid: [
        ["ó", "mó", "om", "mó", "om", "mó"],
        ["mo", "ó", "o", "mo", "ó", "o"],
        ["ó", "o", "mó", "o", "mo", "om"],
        ["om", "mo", "o", "mó", "om", "ó"],
      ],
      palabras: ["amo"],
      oraciones: ["Amo a mamá."],
    },
    escritura: {
      trazos: ["O", "Ó", "o", "ó"],
      palabraFinal: [],
    },
  },
  {
    id: "s",
    order: 5,
    grafemas: ["S", "s"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "sa",
    lectura: {
      grid: [
        ["es", "os", "sa", "sa", "as", "so"],
        ["as", "as", "se", "so", "sé", "es"],
        ["sa", "es", "sé", "so", "se", "os"],
      ],
      palabras: [
        "se", "es", "sé", "ese",
        "oso", "eso", "esa", "asa",
        "sea", "mes", "más", "ase",
        "mesa", "osos", "esos", "masa",
        "esas", "seas", "aseo", "somos",
        "asoma", "meses", "amasa", "mesas",
      ],
      oraciones: ["Mamá amasa.", "¡Ese oso amasa!"],
    },
    escritura: {
      trazos: ["S", "s"],
      palabraFinal: ["mesa", "osos"],
    },
  },
  {
    id: "n",
    order: 6,
    grafemas: ["N", "n"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "na",
    lectura: {
      grid: [
        ["né", "on", "no", "ná", "on", "ón"],
        ["ón", "an", "no", "an", "nó", "nó"],
        ["en", "en", "na", "ne", "na", "né"],
      ],
      palabras: [
        "en", "no", "son", "nos",
        "nena", "mano", "mono", "mona",
        "aman", "sean", "sano", "sana",
        "sonó", "enano", "manos", "menos",
        "monos", "nenas", "manso", "monas",
        "semana", "asoman", "mansos", "semanas",
      ],
      oraciones: ["Somos monos mansos.", "Mamá ama a Ana. Ana ama a mamá."],
    },
    escritura: {
      trazos: ["N", "n"],
      palabraFinal: ["nena", "mano"],
    },
  },
  {
    id: "p",
    order: 7,
    grafemas: ["P", "p"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "pa",
    lectura: {
      grid: [
        ["pó", "pa", "ep", "ep", "ap", "pé"],
        ["po", "op", "pé", "pá", "pa", "pó"],
        ["ap", "pe", "pe", "op", "po", "pá"],
      ],
      palabras: [
        "pan", "papa", "pone", "mapa",
        "pena", "sopa", "pesa", "peso",
        "paso", "pasa", "sapo", "papá",
        "ponen", "paseo", "pasos", "ponés",
        "pasan", "sapos", "mapas", "papas",
        "pesos", "pensó", "espesa", "ponemos",
      ],
      oraciones: ["Ana pensó en papá.", "Papá ama a mamá.", "Papá pasea a Pepe."],
    },
    escritura: {
      trazos: ["P", "p"],
      palabraFinal: ["pan", "mapa"],
    },
  },
  {
    id: "i",
    order: 8,
    grafemas: ["I", "i", "Í", "í"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "i",
    lectura: {
      grid: [
        ["í", "mí", "mi", "sí", "mí", "i"],
        ["si", "sí", "im", "ni", "pí", "í"],
        ["pi", "ip", "ni", "is", "ip", "in"],
      ],
      palabras: [
        "ni", "mi", "si", "mí",
        "sí", "así", "pie", "sin",
        "mis", "mía", "mías", "mío",
        "míos", "papi", "mimo", "mami",
        "pies", "seis", "piso", "piano",
        "peina", "mismo", "misma", "pepino",
        "anima", "pienso", "mismos", "Nina",
      ],
      oraciones: ["Mi papá es Pepe.", "Nina pisó mi pie.", "Mamá me peina.", "Mi papá me anima."],
    },
    escritura: {
      trazos: ["I", "Í", "i", "í"],
      palabraFinal: ["pies"],
    },
  },
  {
    id: "y",
    order: 9,
    grafemas: ["Y", "y"],
    fonemaEsPlaceholder: true,
    fonemaFallback: "ya",
    fonemaRecordingKey: "y-i",
    lectura: {
      grid: [
        ["ey", "ey", "ey", "oy", "oy", "ey"],
        ["ey", "oy", "oy", "oy", "oy", "oy"],
        ["ey", "oy", "ey", "ey", "oy", "ey"],
      ],
      palabras: ["y", "soy"],
      oraciones: [
        "Soy mamá.",
        "Soy una nena.",
        "Mis papás me aman.",
        "Son nenas y nenes.",
        "Mis papás amasan pan y pisan papas.",
        "Mis manos y mis pies.",
      ],
    },
    escritura: {
      trazos: ["Y", "y"],
      palabraFinal: ["soy"],
    },
  },
];
