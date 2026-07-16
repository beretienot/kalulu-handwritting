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
