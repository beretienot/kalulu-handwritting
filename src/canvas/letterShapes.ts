// Plantillas de forma por letra para el reconocedor $P: cada letra es una lista de
// trazos, cada trazo una lista de puntos normalizados dentro de su propia caja
// (x: 0 izquierda a 1 derecha; y: 0 arriba a 1 renglón base; y>1 = descendente).
// No hace falta que sean caligráficamente perfectas: $P compara la forma general
// normalizada en escala y posición, no el contorno exacto de la fuente.

import type { Stroke } from "./pointCloudRecognizer";

function arc(cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number, steps = 16): Stroke {
  const points: Stroke = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + ((endDeg - startDeg) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    points.push({ x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) });
  }
  return points;
}

function oval(cy = 0.5, ry = 0.5): Stroke {
  return arc(0.5, cy, 0.5, ry, -90, 270);
}

const LETTER_SHAPES: Record<string, Stroke[]> = {
  A: [
    [{ x: 0, y: 1 }, { x: 0.5, y: 0 }],
    [{ x: 0.5, y: 0 }, { x: 1, y: 1 }],
    [{ x: 0.22, y: 0.6 }, { x: 0.78, y: 0.6 }],
  ],
  M: [
    [{ x: 0, y: 1 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0.5, y: 0.65 }],
    [{ x: 0.5, y: 0.65 }, { x: 1, y: 0 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }],
  ],
  E: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0.9, y: 0 }],
    [{ x: 0, y: 0.5 }, { x: 0.7, y: 0.5 }],
    [{ x: 0, y: 1 }, { x: 0.9, y: 1 }],
  ],
  O: [oval()],
  S: [
    [
      { x: 0.8, y: 0.12 }, { x: 0.5, y: 0 }, { x: 0.2, y: 0.12 }, { x: 0.2, y: 0.33 },
      { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.67 }, { x: 0.8, y: 0.88 }, { x: 0.5, y: 1 }, { x: 0.2, y: 0.88 },
    ],
  ],
  N: [
    [{ x: 0, y: 1 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    [{ x: 1, y: 1 }, { x: 1, y: 0 }],
  ],
  P: [
    [{ x: 0.15, y: 1 }, { x: 0.15, y: 0 }],
    [
      { x: 0.15, y: 0 }, { x: 0.75, y: 0 }, { x: 0.9, y: 0.15 }, { x: 0.9, y: 0.3 },
      { x: 0.75, y: 0.45 }, { x: 0.15, y: 0.45 },
    ],
  ],
  I: [[{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }]],
  Y: [
    [{ x: 0.1, y: 0 }, { x: 0.5, y: 0.5 }],
    [{ x: 0.9, y: 0 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 1 }],
  ],
  L: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 1 }, { x: 0.65, y: 1 }],
  ],
  U: [
    [
      { x: 0, y: 0 }, { x: 0, y: 0.6 }, { x: 0.05, y: 0.85 }, { x: 0.25, y: 1 },
      { x: 0.75, y: 1 }, { x: 0.95, y: 0.85 }, { x: 1, y: 0.6 }, { x: 1, y: 0 },
    ],
  ],
  C: [
    [
      { x: 0.9, y: 0.15 }, { x: 0.7, y: 0.02 }, { x: 0.4, y: 0 }, { x: 0.15, y: 0.15 },
      { x: 0.02, y: 0.4 }, { x: 0, y: 0.6 }, { x: 0.05, y: 0.8 }, { x: 0.25, y: 0.95 },
      { x: 0.55, y: 1 }, { x: 0.8, y: 0.9 }, { x: 0.92, y: 0.75 },
    ],
  ],
  D: [
    [{ x: 0.15, y: 0 }, { x: 0.15, y: 1 }],
    [
      { x: 0.15, y: 0 }, { x: 0.65, y: 0 }, { x: 0.9, y: 0.2 }, { x: 0.9, y: 0.8 },
      { x: 0.65, y: 1 }, { x: 0.15, y: 1 },
    ],
  ],
  T: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
  ],
  B: [
    [{ x: 0.15, y: 0 }, { x: 0.15, y: 1 }],
    [
      { x: 0.15, y: 0 }, { x: 0.65, y: 0 }, { x: 0.85, y: 0.12 }, { x: 0.85, y: 0.38 },
      { x: 0.65, y: 0.5 }, { x: 0.15, y: 0.5 },
    ],
    [
      { x: 0.15, y: 0.5 }, { x: 0.7, y: 0.5 }, { x: 0.92, y: 0.65 }, { x: 0.92, y: 0.85 },
      { x: 0.7, y: 1 }, { x: 0.15, y: 1 },
    ],
  ],
  R: [
    [{ x: 0.15, y: 0 }, { x: 0.15, y: 1 }],
    [
      { x: 0.15, y: 0 }, { x: 0.75, y: 0 }, { x: 0.9, y: 0.15 }, { x: 0.9, y: 0.35 },
      { x: 0.75, y: 0.5 }, { x: 0.15, y: 0.5 },
    ],
    [{ x: 0.4, y: 0.5 }, { x: 0.9, y: 1 }],
  ],
  F: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0.9, y: 0 }],
    [{ x: 0, y: 0.5 }, { x: 0.7, y: 0.5 }],
  ],
  V: [
    [{ x: 0, y: 0 }, { x: 0.5, y: 1 }],
    [{ x: 1, y: 0 }, { x: 0.5, y: 1 }],
  ],
  G: [
    [
      { x: 0.9, y: 0.15 }, { x: 0.7, y: 0.02 }, { x: 0.4, y: 0 }, { x: 0.15, y: 0.15 },
      { x: 0.02, y: 0.4 }, { x: 0, y: 0.6 }, { x: 0.05, y: 0.8 }, { x: 0.25, y: 0.95 },
      { x: 0.55, y: 1 }, { x: 0.8, y: 0.9 }, { x: 0.92, y: 0.7 }, { x: 0.92, y: 0.52 },
    ],
    [{ x: 0.92, y: 0.52 }, { x: 0.55, y: 0.52 }],
  ],

  a: [
    [
      { x: 0.8, y: 0.3 }, { x: 0.5, y: 0.05 }, { x: 0.2, y: 0.3 }, { x: 0.2, y: 0.7 },
      { x: 0.5, y: 0.95 }, { x: 0.8, y: 0.7 }, { x: 0.8, y: 0.3 },
    ],
    [{ x: 0.8, y: 0.3 }, { x: 0.8, y: 1 }],
  ],
  m: [
    [{ x: 0.08, y: 0.35 }, { x: 0.08, y: 1 }],
    [{ x: 0.08, y: 0.35 }, { x: 0.12, y: 0.15 }, { x: 0.38, y: 0.15 }, { x: 0.42, y: 0.35 }, { x: 0.42, y: 1 }],
    [{ x: 0.42, y: 0.35 }, { x: 0.46, y: 0.15 }, { x: 0.72, y: 0.15 }, { x: 0.76, y: 0.35 }, { x: 0.76, y: 1 }],
  ],
  e: [
    [
      { x: 0.12, y: 0.55 }, { x: 0.88, y: 0.55 }, { x: 0.88, y: 0.3 }, { x: 0.6, y: 0.05 },
      { x: 0.3, y: 0.05 }, { x: 0.1, y: 0.3 }, { x: 0.1, y: 0.7 }, { x: 0.35, y: 0.95 },
      { x: 0.65, y: 0.95 }, { x: 0.85, y: 0.78 },
    ],
  ],
  o: [oval()],
  s: [
    [
      { x: 0.8, y: 0.15 }, { x: 0.5, y: 0.02 }, { x: 0.2, y: 0.15 }, { x: 0.2, y: 0.35 },
      { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.65 }, { x: 0.8, y: 0.85 }, { x: 0.5, y: 0.98 }, { x: 0.2, y: 0.85 },
    ],
  ],
  n: [
    [{ x: 0.12, y: 0.35 }, { x: 0.12, y: 1 }],
    [{ x: 0.12, y: 0.35 }, { x: 0.16, y: 0.15 }, { x: 0.44, y: 0.15 }, { x: 0.48, y: 0.35 }, { x: 0.48, y: 1 }],
  ],
  p: [
    [{ x: 0.18, y: 0.3 }, { x: 0.18, y: 1.35 }],
    [
      { x: 0.18, y: 0.32 }, { x: 0.24, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.56, y: 0.35 },
      { x: 0.56, y: 0.55 }, { x: 0.5, y: 0.75 }, { x: 0.24, y: 0.75 }, { x: 0.18, y: 0.58 },
    ],
  ],
  i: [
    [{ x: 0.5, y: 0.02 }, { x: 0.5, y: 0.12 }],
    [{ x: 0.5, y: 0.38 }, { x: 0.5, y: 1 }],
  ],
  y: [
    [{ x: 0.15, y: 0.3 }, { x: 0.5, y: 0.72 }],
    [{ x: 0.85, y: 0.3 }, { x: 0.5, y: 0.72 }, { x: 0.35, y: 1.32 }],
  ],
  l: [[{ x: 0.5, y: -0.15 }, { x: 0.5, y: 1 }]],
  u: [
    [
      { x: 0.14, y: 0.35 }, { x: 0.14, y: 0.8 }, { x: 0.18, y: 0.95 }, { x: 0.38, y: 1.02 },
      { x: 0.58, y: 1.02 }, { x: 0.76, y: 0.95 }, { x: 0.8, y: 0.8 }, { x: 0.8, y: 0.35 },
    ],
  ],
  c: [
    [
      { x: 0.78, y: 0.45 }, { x: 0.6, y: 0.35 }, { x: 0.35, y: 0.37 }, { x: 0.18, y: 0.5 },
      { x: 0.12, y: 0.68 }, { x: 0.18, y: 0.86 }, { x: 0.35, y: 0.98 }, { x: 0.6, y: 1 }, { x: 0.78, y: 0.9 },
    ],
  ],
  d: [
    [
      { x: 0.7, y: 0.35 }, { x: 0.45, y: 0.15 }, { x: 0.2, y: 0.35 }, { x: 0.2, y: 0.8 },
      { x: 0.45, y: 1 }, { x: 0.7, y: 0.8 }, { x: 0.7, y: 0.35 },
    ],
    [{ x: 0.7, y: 0.35 }, { x: 0.7, y: -0.15 }],
  ],
  t: [
    [{ x: 0.45, y: 0.05 }, { x: 0.45, y: 0.9 }, { x: 0.5, y: 1 }, { x: 0.65, y: 0.98 }],
    [{ x: 0.25, y: 0.35 }, { x: 0.7, y: 0.35 }],
  ],
  b: [
    [{ x: 0.15, y: -0.15 }, { x: 0.15, y: 1 }],
    [
      { x: 0.15, y: 0.65 }, { x: 0.4, y: 0.35 }, { x: 0.65, y: 0.35 }, { x: 0.8, y: 0.5 },
      { x: 0.8, y: 0.85 }, { x: 0.65, y: 1 }, { x: 0.4, y: 1 }, { x: 0.15, y: 0.8 },
    ],
  ],
  r: [
    [{ x: 0.15, y: 0.35 }, { x: 0.15, y: 1 }],
    [{ x: 0.15, y: 0.35 }, { x: 0.2, y: 0.15 }, { x: 0.45, y: 0.12 }, { x: 0.55, y: 0.2 }],
  ],
  rr: [
    [{ x: 0.07, y: 0.35 }, { x: 0.07, y: 1 }],
    [{ x: 0.07, y: 0.35 }, { x: 0.1, y: 0.15 }, { x: 0.25, y: 0.12 }, { x: 0.32, y: 0.2 }],
    [{ x: 0.57, y: 0.35 }, { x: 0.57, y: 1 }],
    [{ x: 0.57, y: 0.35 }, { x: 0.6, y: 0.15 }, { x: 0.75, y: 0.12 }, { x: 0.82, y: 0.2 }],
  ],
  f: [
    [{ x: 0.6, y: -0.1 }, { x: 0.35, y: -0.05 }, { x: 0.25, y: 0.15 }, { x: 0.25, y: 1 }],
    [{ x: 0.1, y: 0.35 }, { x: 0.5, y: 0.35 }],
  ],
  v: [
    [{ x: 0.1, y: 0.35 }, { x: 0.5, y: 1 }],
    [{ x: 0.9, y: 0.35 }, { x: 0.5, y: 1 }],
  ],
  ll: [
    [{ x: 0.2, y: -0.15 }, { x: 0.2, y: 1 }],
    [{ x: 0.75, y: -0.15 }, { x: 0.75, y: 1 }],
  ],
  g: [
    [
      { x: 0.7, y: 0.4 }, { x: 0.5, y: 0.32 }, { x: 0.28, y: 0.4 }, { x: 0.2, y: 0.6 },
      { x: 0.28, y: 0.8 }, { x: 0.5, y: 0.88 }, { x: 0.7, y: 0.8 }, { x: 0.7, y: 0.4 },
    ],
    [{ x: 0.7, y: 0.5 }, { x: 0.7, y: 1.1 }, { x: 0.55, y: 1.3 }, { x: 0.3, y: 1.28 }],
  ],
};

// Las vocales con tilde reutilizan la forma de la vocal base, con un trazo extra
// (la tilde) arriba a la derecha del cuerpo de la letra.
const ACCENT_TO_BASE: Record<string, string> = {
  Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U",
  á: "a", é: "e", í: "i", ó: "o", ú: "u",
};

const ACCENT_TICK: Stroke = [{ x: 0.35, y: -0.28 }, { x: 0.6, y: -0.05 }];

export function getLetterShape(char: string): Stroke[] | null {
  if (LETTER_SHAPES[char]) return LETTER_SHAPES[char];
  const base = ACCENT_TO_BASE[char];
  if (base && LETTER_SHAPES[base]) return [...LETTER_SHAPES[base], ACCENT_TICK];
  return null;
}

/**
 * true si `char` es una vocal acentuada, es decir si su forma (ver `getLetterShape`)
 * termina con la tilde como último trazo. Sirve para decirle al reconocedor CUÁL
 * trazo es la tilde en vez de que lo adivine por longitud relativa (ver
 * `dominantStrokeIndices` en pointCloudRecognizer.ts): esa heurística depende de
 * cuánto recorrido tienen los OTROS trazos de la letra, y eso varía mucho letra a
 * letra — en la "a" (con su óvalo, trazo largo) la tilde queda chica en
 * comparación y se excluye bien sola, pero en la "A" (tres trazos rectos y cortos)
 * la tilde termina siendo relativamente larga y la heurística la cuenta como un
 * trazo más del cuerpo, no como la tildecita — capando el puntaje igual que antes
 * de arreglar esto, pero solo para las mayúsculas acentuadas.
 */
export function isAccentedChar(char: string): boolean {
  return char in ACCENT_TO_BASE;
}

/**
 * Para medir la altura real de la letra base (sin la tilde) al armar la plantilla:
 * medir "Í" da la altura CON la tilde ya incluida, así que si se usa esa altura para
 * ubicar tanto el asta como la tildecita, el asta queda estirada de más y la tilde
 * termina el doble de alto de lo que debería.
 */
export function getBaseCharForMeasurement(char: string): string {
  return ACCENT_TO_BASE[char] ?? char;
}
