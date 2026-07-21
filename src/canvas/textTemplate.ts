import type { Stroke } from "./pointCloudRecognizer";
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

/**
 * Arma los trazos-plantilla de `text` (una letra o una palabra corta) en un espacio
 * abstracto propio: cada carácter se ubica uno al lado del otro usando su ancho real
 * en la tipografía Mulish, y su altura (mayúscula/minúscula/con descendente) según las
 * métricas reales de la fuente. El resultado se compara vía $P, que normaliza escala y
 * posición, así que no hace falta que coincida con ningún tamaño de canvas en particular.
 */
export async function buildTextTemplate(text: string): Promise<Stroke[]> {
  await ensureFontsLoaded();
  const ctx = getMeasureContext();
  const REFERENCE_SIZE = 200;
  ctx.font = fontString(REFERENCE_SIZE);

  let cursorX = 0;
  const strokes: Stroke[] = [];
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
    if (shape) {
      for (const stroke of shape) {
        strokes.push(stroke.map((p) => ({ x: cursorX + p.x * width, y: mapY(p.y, ascent, descent) })));
      }
    }
    cursorX += width;
  }
  return strokes;
}
