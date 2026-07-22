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
  /** Rango horizontal de esta letra en el espacio abstracto de buildLetterTemplates
   *  (mismas unidades que los trazos): para ubicar qué parte del dibujo del alumno le
   *  corresponde a esta letra (ver scoreWordLetters). */
  xStart: number;
  xEnd: number;
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
    letters.push({ char, strokes, xStart: cursorX, xEnd: cursorX + width });
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

/**
 * Puntaje 0-100 para una PALABRA, juzgando cada letra por separado contra su propia
 * plantilla — a diferencia de comparar toda la palabra como una sola nube $P (ver
 * shapeScore), que normaliza escala/traslación sobre la nube ENTERA: si falta una letra
 * o está cambiada por otra de forma parecida, el resto de la palabra "explica" la forma
 * general igual y el puntaje global apenas baja (una letra de 4-5 pesa poco en el
 * promedio). Acá alcanza con que UNA letra esté mal u omitida para que la palabra
 * entera no apruebe: el puntaje final es el de la letra peor escrita, no un promedio.
 *
 * Como $P no sabe qué trazo del alumno es de qué letra, cada trazo dibujado se asigna a
 * la letra cuyo rango horizontal (reescalado proporcionalmente del espacio de la
 * plantilla al espacio real de lo dibujado) contiene su centro. Una letra completamente
 * salteada queda con cero trazos asignados → puntaje 0 para esa letra → puntaje final 0.
 */
export function scoreWordLetters(candidateStrokes: Stroke[], letters: LetterTemplate[]): number {
  const scorable = letters.filter((l) => l.strokes.length > 0);
  if (scorable.length === 0) return 0;

  const candPoints = candidateStrokes.flat();
  if (candPoints.length === 0) return 0;
  const candMinX = Math.min(...candPoints.map((p) => p.x));
  const candMaxX = Math.max(...candPoints.map((p) => p.x));
  const candSpan = candMaxX - candMinX || 1;
  const templateMinX = scorable[0].xStart;
  const templateMaxX = scorable[scorable.length - 1].xEnd;
  const templateSpan = templateMaxX - templateMinX || 1;
  const toCandidateX = (templateX: number) => candMinX + ((templateX - templateMinX) / templateSpan) * candSpan;

  const strokesByLetter: Stroke[][] = scorable.map(() => []);
  for (const stroke of candidateStrokes) {
    if (stroke.length === 0) continue;
    const centerX = stroke.reduce((sum, p) => sum + p.x, 0) / stroke.length;
    let bestIndex = 0;
    let bestDistance = Infinity;
    scorable.forEach((letter, i) => {
      const start = toCandidateX(letter.xStart);
      const end = toCandidateX(letter.xEnd);
      const distance = centerX < start ? start - centerX : centerX > end ? centerX - end : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });
    strokesByLetter[bestIndex].push(stroke);
  }

  const perLetterScores = scorable.map((letter, i) => shapeScore(strokesByLetter[i], letter.strokes));
  return Math.min(...perLetterScores);
}
