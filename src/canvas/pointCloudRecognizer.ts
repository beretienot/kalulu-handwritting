// Reconocedor $P (Point-Cloud Recognizer, Vatavu/Anthony/Wobbrock 2012): compara la
// forma dibujada contra una plantilla como una "nube de puntos" sin importar el orden
// ni la cantidad de trazos, normalizando traslación y escala antes de comparar. A
// diferencia de la superposición de píxeles contra la fuente, no castiga que la letra
// haya quedado más grande/chica o corrida dentro del renglón — evalúa la forma en sí.
//
// $P solo no alcanza: como compara el promedio de toda la nube de puntos, a un trazo
// corto pero distintivo (el travesaño de la "A", el puntito de la "i") le puede faltar
// entero y el puntaje global apenas baja. Por eso se suma una verificación aparte: cada
// trazo de la plantilla tiene que tener tinta cerca en algún lado, o el puntaje se
// castiga fuerte sin importar qué tan bien haya salido el resto.

export interface Point {
  x: number;
  y: number;
}

/** Un trazo es una lista de puntos dibujados sin levantar el lápiz. */
export type Stroke = Point[];

interface TaggedPoint extends Point {
  strokeIndex: number;
}

const RESAMPLE_POINTS = 32;
const SQUARE_SIZE = 100;
// Calibrado empíricamente (no es la mitad de la diagonal del cuadrado): con nubes de
// ~32 puntos repartidas en una región acotada, hasta formas sin relación entre sí
// encuentran vecinos "cercanos" en el matching greedy, así que la distancia cruda
// nunca se acerca a la diagonal completa. Este valor separa bien trazos parecidos
// (distancia ~0-2) de formas incompletas (~4-5) y garabatos sin relación (~8-10).
// Subido de 10 a 13: la escritura manual real tiene más variación que trazos perfectos,
// y el umbral original era demasiado estricto para letras bien dibujadas.
const MAX_EXPECTED_DISTANCE = 13;

// Para la cobertura por trazo: qué tan cerca (en el mismo espacio normalizado de
// SQUARE_SIZE=100) debe caer un punto de tinta para contar como "cerca" de un punto
// de la plantilla, y qué fracción de los puntos de UN trazo necesitan tener tinta
// cerca para no considerarlo "faltante".
// Tolerancia subida de 8 a 12; target bajado de 0.6 a 0.5 para ser más tolerante
// con escritura natural que no coincide exactamente con la plantilla esquemática.
const STROKE_COVERAGE_TOLERANCE = 12;
const STROKE_COVERAGE_TARGET = 0.5;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

export function resampleStroke(points: Point[], count: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) return new Array(Math.max(1, count)).fill(points[0]);
  const total = pathLength(points);
  if (total === 0) return new Array(count).fill(points[0]);
  const interval = total / (count - 1);
  const result: Point[] = [points[0]];
  let d = 0;
  const pts = points.slice();
  for (let i = 1; i < pts.length; i++) {
    const segLen = distance(pts[i - 1], pts[i]);
    if (segLen === 0) continue;
    if (d + segLen >= interval) {
      const t = (interval - d) / segLen;
      const q: Point = {
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      };
      result.push(q);
      pts.splice(i, 0, q);
      d = 0;
    } else {
      d += segLen;
    }
  }
  while (result.length < count) result.push(pts[pts.length - 1]);
  return result.slice(0, count);
}

/**
 * Reparte `total` puntos entre los trazos preservando cada uno, con el índice de
 * trazo de origen. Mitad del presupuesto se reparte por igual entre trazos (para que
 * uno corto pero distintivo, como el travesaño de la "A" o el puntito de la "i", no
 * quede casi sin representación) y la otra mitad proporcional a su longitud real.
 */
function resamplePointCloud(strokes: Stroke[], total: number): TaggedPoint[] {
  const nonEmpty = strokes.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];
  const n = nonEmpty.length;
  const lengths = nonEmpty.map(pathLength);
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const equalShare = total / 2;
  const lengthShare = total - equalShare;
  const perStrokeEqual = equalShare / n;
  const counts = nonEmpty.map((_, i) => {
    const proportional = totalLength > 0 ? (lengths[i] / totalLength) * lengthShare : lengthShare / n;
    return Math.max(2, Math.round(perStrokeEqual + proportional));
  });

  // Ajustar para que la suma dé exactamente `total`.
  let diff = total - counts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && counts.length > 0) {
    const idx = i % counts.length;
    if (diff > 0) {
      counts[idx]++;
      diff--;
    } else if (counts[idx] > 2) {
      counts[idx]--;
      diff++;
    }
    i++;
    if (i > total * 4) break; // salvaguarda contra loops infinitos en casos degenerados
  }

  const result: TaggedPoint[] = [];
  nonEmpty.forEach((s, idx) => {
    resampleStroke(s, counts[idx]).forEach((p) => result.push({ ...p, strokeIndex: idx }));
  });
  return result;
}

function boundingBox(points: Point[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Escala PRESERVANDO la proporción (el lado más largo llega a SQUARE_SIZE) y centra
 * en el origen. Escalar cada eje por separado (como hace $P "de libro") rompe letras
 * casi rectas como la "I": su ancho real es casi cero, así que cualquier temblor
 * mínimo de la mano se estira hasta ocupar todo el ancho normalizado y la deforma por
 * completo. Con escala uniforme ese temblor sigue siendo minúsculo después de normalizar.
 */
function normalize<T extends Point>(points: T[]): T[] {
  const box = boundingBox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const span = Math.max(width, height) || 1e-9;
  const scaled = points.map((p) => ({
    ...p,
    x: ((p.x - box.minX) / span) * SQUARE_SIZE,
    y: ((p.y - box.minY) / span) * SQUARE_SIZE,
  }));
  const cx = scaled.reduce((s, p) => s + p.x, 0) / scaled.length;
  const cy = scaled.reduce((s, p) => s + p.y, 0) / scaled.length;
  return scaled.map((p) => ({ ...p, x: p.x - cx, y: p.y - cy }));
}

/** Nube de puntos ya remuestreada y normalizada, lista para comparar con `cloudDistanceScore`. */
export function prepareCloud(strokes: Stroke[]): Point[] {
  return normalize(resamplePointCloud(strokes, RESAMPLE_POINTS));
}

function cloudDistance(pts1: Point[], pts2: Point[], start: number): number {
  const n = pts1.length;
  const matched = new Array(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = distance(pts1[i], pts2[j]);
        if (d < min) {
          min = d;
          index = j;
        }
      }
    }
    matched[index] = true;
    const weight = 1 - (((i - start + n) % n) / n);
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  // Promedio ponderado por punto: sin esto `sum` crece con n y deja de ser comparable
  // con MAX_EXPECTED_DISTANCE (que es una distancia, no una suma de ~n/2 distancias).
  return sum / n;
}

function greedyCloudMatch(points1: Point[], points2: Point[]): number {
  const n = points1.length;
  if (n === 0 || points2.length !== n) return Infinity;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(points1, points2, i);
    const d2 = cloudDistance(points2, points1, i);
    min = Math.min(min, d1, d2);
  }
  return min;
}

/**
 * Puntaje 0-100 de similitud de forma entre dos nubes de puntos ya preparadas
 * (ver `prepareCloud`). Invariante a traslación y escala: no importa dónde ni
 * de qué tamaño se dibujó, solo la forma.
 */
export function cloudDistanceScore(candidate: Point[], template: Point[]): number {
  if (candidate.length === 0 || template.length === 0) return 0;
  const d = greedyCloudMatch(candidate, template);
  const score = 1 - d / MAX_EXPECTED_DISTANCE;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

/**
 * De 0 a 1: qué tan cubierto está el trazo peor cubierto de la plantilla (el que
 * tiene menos tinta cerca en el candidato). 1 = todos los trazos tienen tinta cerca
 * en todo su recorrido; 0 = algún trazo entero no tiene ninguna tinta cerca (falta
 * por completo), sin importar qué tan bien haya salido el resto de la letra.
 */
function minStrokeCoverage(candidate: Point[], template: TaggedPoint[]): number {
  const strokeCount = Math.max(0, ...template.map((p) => p.strokeIndex)) + 1;
  let worst = 1;
  for (let s = 0; s < strokeCount; s++) {
    const strokePoints = template.filter((p) => p.strokeIndex === s);
    if (strokePoints.length === 0) continue;
    const covered = strokePoints.filter((tp) => candidate.some((cp) => distance(tp, cp) <= STROKE_COVERAGE_TOLERANCE)).length;
    const coverage = covered / strokePoints.length;
    if (coverage < worst) worst = coverage;
  }
  return worst;
}

/**
 * Puntaje 0-100 final: similitud de forma ($P) penalizada si a algún trazo de la
 * plantilla le falta tinta cerca (letra incompleta), aunque el resto haya salido bien.
 */
export function shapeScore(candidateStrokes: Stroke[], templateStrokes: Stroke[]): number {
  const candidate = prepareCloud(candidateStrokes);
  const templateTagged = normalize(resamplePointCloud(templateStrokes, RESAMPLE_POINTS));
  const template = templateTagged.map(({ x, y }) => ({ x, y }));

  const base = cloudDistanceScore(candidate, template);
  const coverage = minStrokeCoverage(candidate, templateTagged);
  const coveragePenalty = Math.min(1, coverage / STROKE_COVERAGE_TARGET);

  // Respaldo estructural: cuando falta un trazo chico y aislado (el puntito de la
  // "i", por ejemplo), el trazo que sí quedó se estira al normalizar y por pura
  // coincidencia geométrica puede terminar "cerca" de donde iba el trazo faltante,
  // burlando la cobertura de arriba. Contar los trazos (levantar el lápiz) es una
  // señal más tosca pero más confiable de "faltó algo completo".
  // El piso se sube de 0.35 a 0.5: penalizar menos a quien dibuja bien la forma
  // pero con menos trazos que la plantilla (ej: "A" de un solo trazo continuo).
  //
  // El caso contrario (MÁS trazos que la plantilla) también necesita penalización,
  // no solo el de menos: una letra de varios trazos (la "E", con 4) dibujada encima
  // de una plantilla de un solo trazo (la "S") no tenía freno acá, y como $P por sí
  // solo no distingue bien formas distintas con extensión pareja, el puntaje base ya
  // salía cerca de la mitad — suficiente para aprobar en el nivel inicial.
  // Hasta el doble de trazos que la plantilla NO se penaliza: es el rango normal de
  // levantar el lápiz a mitad de una letra de un solo trazo (ej. la "u", pata
  // izquierda-levantar-pata derecha) y penalizarlo hacía fallar letras bien
  // dibujadas. Recién pasado el doble empieza el freno, con piso 0.7 (no 0.5) porque
  // incluso ahí puede tratarse de una letra bien dibujada con varios levantones, no
  // necesariamente una letra distinta.
  const strokeRatio = candidateStrokes.filter((s) => s.length > 0).length / Math.max(1, templateStrokes.length);
  const strokeCountPenalty =
    strokeRatio <= 1 ? Math.max(0.5, strokeRatio) : strokeRatio <= 2 ? 1 : Math.max(0.7, 2 / strokeRatio);

  console.debug(
    `[shapeScore] base=${base} coverage=${coverage.toFixed(2)} coveragePenalty=${coveragePenalty.toFixed(2)} strokeRatio=${strokeRatio.toFixed(2)} strokeCountPenalty=${strokeCountPenalty.toFixed(2)} → ${Math.round(base * Math.min(coveragePenalty, strokeCountPenalty))}`
  );

  return Math.round(base * Math.min(coveragePenalty, strokeCountPenalty));
}
