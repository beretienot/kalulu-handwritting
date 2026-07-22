// Camino a seguir para la pantalla de "orden de trazo": a diferencia de
// pointCloudRecognizer.ts (que compara la forma final sin importar orden ni dirección),
// acá el trazo SÍ se recorre en el orden y dirección en que está definido, punto por
// punto, para enseñar cómo se escribe la letra (no solo puntuar cómo quedó). Por eso
// usa sus propias formas (strokeOrderShapes.ts) en vez de las de letterShapes.ts (que
// alimentan el puntaje $P de TracingCanvas): ese archivo es invariante a orden/dirección
// y no necesariamente coincide con lo que hace falta acá.
//
// El ajuste de escala/posición (computePathFit) sale pura y exclusivamente de la
// geometría de strokeOrderShapes.ts, no de ninguna tipografía: la guía que se dibuja en
// pantalla (ver StrokeOrderPage.tsx) es ese mismo camino, así que no hay glifo ajeno con
// el que calzar. Antes esto medía la fuente real (Mulish) y corregía el camino calcado
// para que cayera sobre esa tinta (snapPointsToInkCenter) — se sacó porque Mulish tiene
// proporciones bastante distintas a las de la hoja de referencia en varios puntos (d, g,
// n), y esa corrección podía fallar y alejar el trazo de la letra que se ve en pantalla.

import { type Point, distance, pathLength, resampleStroke } from "./pointCloudRecognizer";
import { getStrokeOrderShape } from "./strokeOrderShapes";

export interface ScaledStroke {
  points: Point[];
  /** cumulative[i] = distancia recorrida desde points[0] hasta points[i]. */
  cumulative: number[];
  length: number;
}

/** Cómo mapear los puntos normalizados de strokeOrderShapes.ts a píxeles de pantalla:
 * escalado uniforme + traslación para centrar el bounding box real del trazo (ver
 * computePathFit) en el espacio disponible. */
export interface PathFit {
  scale: number;
  originX: number;
  originY: number;
}

// Separación aproximada (en píxeles de pantalla) entre puntos remuestreados: densa
// para que "point at distance" y la búsqueda de progreso se sientan suaves, pero sin
// generar miles de puntos para trazos largos.
const RESAMPLE_SPACING_PX = 4;

// Cuánto del espacio disponible ocupa la letra (deja aire alrededor para el punto de
// inicio, que puede sobresalir un poco del trazo).
const FIT_MARGIN = 0.85;

/**
 * Calcula el escalado + posición para que los trazos de `char` (ver
 * strokeOrderShapes.ts) entren en `availWidth` x `availHeight` píxeles de pantalla,
 * centrados. El bounding box sale de recorrer TODOS los puntos de TODOS los trazos —
 * ya incluye la tilde (que sube a y negativo) y los descendentes (que bajan de y=1),
 * sin necesidad de reservarles espacio a mano.
 */
export function computePathFit(char: string, availWidth: number, availHeight: number): PathFit {
  const shape = getStrokeOrderShape(char) ?? [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const stroke of shape) {
    for (const p of stroke) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 1;
    minY = 0;
    maxY = 1;
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.min((availWidth * FIT_MARGIN) / width, (availHeight * FIT_MARGIN) / height);

  return {
    scale,
    originX: availWidth / 2 - ((minX + maxX) / 2) * scale,
    originY: availHeight / 2 - ((minY + maxY) / 2) * scale,
  };
}

/**
 * Trazos de `char` (ver strokeOrderShapes.ts) mapeados a píxeles de pantalla con `fit`
 * (ver computePathFit), remuestreados a densidad fija con distancia acumulada por
 * punto. `null` si la letra no tiene forma definida.
 */
export function buildStrokeOrderPaths(char: string, fit: PathFit): ScaledStroke[] | null {
  const shape = getStrokeOrderShape(char);
  if (!shape) return null;

  return shape.map((stroke) => {
    const scaledPoints = stroke.map((p) => ({
      x: fit.originX + p.x * fit.scale,
      y: fit.originY + p.y * fit.scale,
    }));
    return buildScaledStroke(resampleForDrawing(smoothCurve(scaledPoints)));
  });
}

/** Arma un ScaledStroke a partir de una lista de puntos ya en píxeles de pantalla,
 *  calculando la distancia acumulada por punto. */
export function buildScaledStroke(points: Point[]): ScaledStroke {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] ?? 0 };
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
 * Las curvas (panza de la "a", arcos de "m"/"n"/"p", "e", "s") están definidas con
 * pocos puntos de control. Acá SÍ se ve el camino, así que hace falta una curva suave
 * (Catmull-Rom) pasando por esos mismos puntos en vez de unirlos con líneas rectas. Un
 * trazo de 2 puntos es una línea recta a propósito (asta, renglón, tilde) y se deja
 * tal cual.
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
