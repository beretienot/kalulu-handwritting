// Camino a seguir para la pantalla de "orden de trazo": a diferencia de
// pointCloudRecognizer.ts (que compara la forma final sin importar orden ni dirección),
// acá el trazo de letterShapes.ts SÍ se recorre en el orden y dirección en que está
// definido, punto por punto, para enseñar cómo se escribe la letra (no solo puntuar
// cómo quedó).

import { type Point, distance, pathLength, resampleStroke } from "./pointCloudRecognizer";
import { getLetterShape } from "./letterShapes";

export interface ScaledStroke {
  points: Point[];
  /** cumulative[i] = distancia recorrida desde points[0] hasta points[i]. */
  cumulative: number[];
  length: number;
}

// Separación aproximada (en píxeles de pantalla) entre puntos remuestreados: densa
// para que "point at distance" y la búsqueda de progreso se sientan suaves, pero sin
// generar miles de puntos para trazos largos.
const RESAMPLE_SPACING_PX = 4;

// Cuánto del espacio disponible ocupa la letra (deja aire alrededor para el punto de
// inicio, que puede sobresalir un poco del trazo).
const FIT_MARGIN = 0.85;

/**
 * Trazos de `char` (ver letterShapes.ts) escalados y centrados para ocupar como máximo
 * `availWidth` x `availHeight` píxeles de pantalla, preservando su proporción real (no
 * los estira a un cuadrado: una letra con descendente o tilde es más alta que ancha).
 * Cada trazo queda remuestreado a densidad fija con distancia acumulada por punto.
 * `null` si la letra no tiene forma definida en letterShapes.ts.
 */
export function buildStrokeOrderPaths(char: string, availWidth: number, availHeight: number): ScaledStroke[] | null {
  const shape = getLetterShape(char);
  if (!shape) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const stroke of shape) {
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const shapeWidth = maxX - minX || 1;
  const shapeHeight = maxY - minY || 1;
  const scale = Math.min((availWidth * FIT_MARGIN) / shapeWidth, (availHeight * FIT_MARGIN) / shapeHeight);
  const originX = availWidth / 2 - (minX + shapeWidth / 2) * scale;
  const originY = availHeight / 2 - (minY + shapeHeight / 2) * scale;

  return shape.map((stroke) => {
    const scaledPoints = stroke.map((p) => ({ x: originX + p.x * scale, y: originY + p.y * scale }));
    const points = resampleForDrawing(smoothCurve(scaledPoints));
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
    }
    return { points, cumulative, length: cumulative[cumulative.length - 1] ?? 0 };
  });
}

function resampleForDrawing(points: Point[]): Point[] {
  const rawLength = pathLength(points);
  const count = Math.max(2, Math.round(rawLength / RESAMPLE_SPACING_PX) + 1);
  return resampleStroke(points, count);
}

// Cuántos puntos generar por segmento de spline al suavizar una curva.
const CURVE_SAMPLES_PER_SEGMENT = 12;

function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * letterShapes.ts define curvas (panza de la "a", arcos de "m"/"n"/"p", "e", "s") con
 * pocos puntos de control, pensados para puntuar forma con $P (no le importa que el
 * camino entre puntos sea recto). Acá SÍ se ve el camino, así que hace falta una curva
 * suave (Catmull-Rom) pasando por esos mismos puntos en vez de unirlos con líneas
 * rectas. Un trazo de 2 puntos es una línea recta a propósito (asta, renglón, tilde) y
 * se deja tal cual.
 */
function smoothCurve(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const n = points.length;
  const result: Point[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    for (let s = 0; s < CURVE_SAMPLES_PER_SEGMENT; s++) {
      result.push(catmullRomPoint(p0, p1, p2, p3, s / CURVE_SAMPLES_PER_SEGMENT));
    }
  }
  result.push(points[n - 1]);
  return result;
}

/** Punto exacto (interpolado) a `targetDistance` a lo largo del trazo. */
export function pointAtDistance(stroke: ScaledStroke, targetDistance: number): Point {
  const { points, cumulative, length } = stroke;
  const d = Math.max(0, Math.min(length, targetDistance));
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] >= d) {
      const segLen = cumulative[i] - cumulative[i - 1];
      const t = segLen === 0 ? 0 : (d - cumulative[i - 1]) / segLen;
      return {
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
      };
    }
  }
  return points[points.length - 1];
}

/**
 * Busca, dentro de la ventana [fromDistance, fromDistance + maxLookahead] del trazo, el
 * punto más cercano a `pointer`. Si queda a menos de `tolerance`, devuelve su distancia
 * acumulada (el progreso nunca retrocede); si ninguno alcanza, devuelve `null` — el dedo
 * se despegó del camino y no se avanza (pero tampoco se pierde el progreso ya hecho).
 */
export function findForwardProgress(
  stroke: ScaledStroke,
  fromDistance: number,
  pointer: Point,
  tolerance: number,
  maxLookahead: number
): number | null {
  const { points, cumulative } = stroke;
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = cumulative[i];
    if (d < fromDistance || d > fromDistance + maxLookahead) continue;
    const dist = distance(points[i], pointer);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  if (best === null || bestDist > tolerance) return null;
  return best;
}
