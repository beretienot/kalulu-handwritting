import { shapeScore, type Stroke } from "./pointCloudRecognizer";
import { getLetterShape, getBaseCharForMeasurement } from "./letterShapes";
import { ensureFontsLoaded, fontString } from "./tracingScore";

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d")!;
  }
  return measureCtx;
}

function mapY(normY: number, ascent: number, descent: number): number {
  if (normY <= 1) return -(1 - normY) * ascent;
  return (normY - 1) * descent;
}

export interface LetterTemplate {
  char: string;
  strokes: Stroke[];
}

/**
 * Arma los trazos-plantilla de `text` (una letra o una palabra corta) letra por letra,
 * en un espacio abstracto propio: cada carácter se ubica uno al lado del otro usando su
 * ancho real en la tipografía Mulish, y su altura (mayúscula/minúscula/con descendente)
 * según las métricas reales de la fuente.
 */
export async function buildLetterTemplates(text: string): Promise<LetterTemplate[]> {
  await ensureFontsLoaded();
  const ctx = getMeasureContext();
  const REFERENCE_SIZE = 200;
  ctx.font = fontString(REFERENCE_SIZE);

  let cursorX = 0;
  const letters: LetterTemplate[] = [];
  for (const char of text) {
    const shape = getLetterShape(char);
    const m = ctx.measureText(char);
    const width = m.width || REFERENCE_SIZE * 0.55;
    // La altura se mide sobre la letra BASE (sin tilde): medir "Í" da una altura que ya
    // incluye la tilde, y la forma (asta + tildecita, ver letterShapes.ts) espera poder
    // agregar la tilde POR ENCIMA de la altura de la letra base, no de una que ya la tiene.
    const metrics = ctx.measureText(getBaseCharForMeasurement(char));
    const ascent = metrics.actualBoundingBoxAscent || REFERENCE_SIZE * 0.7;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const strokes = (shape ?? []).map((stroke) =>
      stroke.map((p) => ({ x: cursorX + p.x * width, y: mapY(p.y, ascent, descent) }))
    );
    letters.push({ char, strokes });
    cursorX += width;
  }
  return letters;
}

/**
 * Trazos-plantilla de `text` como una sola nube (para $P sobre el texto entero, ver
 * pointCloudRecognizer.ts). El resultado se compara vía $P, que normaliza escala y
 * posición, así que no hace falta que coincida con ningún tamaño de canvas en particular.
 */
export async function buildTextTemplate(text: string): Promise<Stroke[]> {
  const letters = await buildLetterTemplates(text);
  return letters.flatMap((l) => l.strokes);
}

function strokeCenterX(stroke: Stroke): number {
  return stroke.reduce((sum, p) => sum + p.x, 0) / stroke.length;
}

/**
 * Reparte los trazos dibujados en `letterCount` grupos, de izquierda a derecha, cortando
 * por los espacios (gaps en X) más grandes entre trazos consecutivos — en vez de por un
 * rango horizontal proporcional al ancho tipográfico de cada letra en la fuente Mulish
 * (versión anterior). Los chicos no escriben proporcional a la tipografía (una "i" les
 * queda casi tan ancha como una "m"), así que esa proporción corría los límites y le
 * "robaba" trazos a la letra vecina: una letra bien escrita quedaba sin trazos asignados
 * y su puntaje 0 tiraba abajo la palabra entera (ver `scoreWordLetters`). Cortar por los
 * espacios más grandes sigue el gesto real de escribir — levantar el lápiz entre una
 * letra y la siguiente — en vez de una proporción teórica que no coincide con cómo
 * escribe a mano un chico.
 */
function assignStrokesToLetters(strokes: Stroke[], letterCount: number): Stroke[][] {
  const groups: Stroke[][] = Array.from({ length: letterCount }, () => []);
  const items = strokes
    .filter((s) => s.length > 0)
    .map((stroke) => ({ stroke, centerX: strokeCenterX(stroke) }))
    .sort((a, b) => a.centerX - b.centerX);
  if (items.length === 0 || letterCount === 0) return groups;

  // Con menos trazos que letras no hay gaps de sobra para "perder": cada corte separa
  // un trazo más, así que como mucho se llenan tantos grupos como trazos haya (el resto
  // queda vacío = letra salteada, puntaje 0 para esa letra, igual que antes).
  const cutCount = Math.min(letterCount - 1, items.length - 1);
  const gaps = items.slice(1).map((item, i) => ({ index: i + 1, size: item.centerX - items[i].centerX }));
  const cutIndices = gaps
    .sort((a, b) => b.size - a.size)
    .slice(0, cutCount)
    .map((g) => g.index)
    .sort((a, b) => a - b);

  let groupIndex = 0;
  let start = 0;
  for (const cut of cutIndices) {
    groups[groupIndex] = items.slice(start, cut).map((it) => it.stroke);
    start = cut;
    groupIndex++;
  }
  groups[groupIndex] = items.slice(start).map((it) => it.stroke);
  return groups;
}

/**
 * Puntaje 0-100 para una PALABRA, juzgando cada letra por separado contra su propia
 * plantilla — a diferencia de comparar toda la palabra como una sola nube $P (ver
 * shapeScore), que normaliza escala/traslación sobre la nube ENTERA: si falta una letra
 * o está cambiada por otra de forma parecida, el resto de la palabra "explica" la forma
 * general igual y el puntaje global apenas baja (una letra de 4-5 pesa poco en el
 * promedio). Acá alcanza con que UNA letra esté mal u omitida para que la palabra
 * entera no apruebe: el puntaje final es el de la letra peor escrita, no un promedio.
 *
 * Como $P no sabe qué trazo del alumno es de qué letra, los trazos se agrupan por letra
 * con `assignStrokesToLetters` (por espacios reales entre trazos, no por proporción
 * tipográfica). Una letra completamente salteada queda con cero trazos asignados →
 * puntaje 0 para esa letra → puntaje final 0.
 */
export function scoreWordLetters(candidateStrokes: Stroke[], letters: LetterTemplate[]): number {
  const scorable = letters.filter((l) => l.strokes.length > 0);
  if (scorable.length === 0) return 0;

  const strokesByLetter = assignStrokesToLetters(candidateStrokes, scorable.length);

  const perLetterScores = scorable.map((letter, i) => shapeScore(strokesByLetter[i], letter.strokes));
  return Math.min(...perLetterScores);
}
