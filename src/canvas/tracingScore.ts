import { getDifficultySettings } from "../lib/difficulty";

export const CANVAS_WIDTH = 560;
export const CANVAS_HEIGHT = 320;
// Progresión pedagógica por renglón: primero calcando sobre la letra guía, después
// escribiéndola de memoria (sin guía) a partir del modelo mostrado al inicio del renglón.
export const REQUIRED_TRACED_REPETITIONS = 2;
export const REQUIRED_FREE_REPETITIONS = 2;
export const REQUIRED_REPETITIONS = REQUIRED_TRACED_REPETITIONS + REQUIRED_FREE_REPETITIONS;

// Geometría del renglón caligráfico del cuadernillo: línea superior + línea de base
// (oscuras) con 3 líneas guía celestes intermedias; la letra apoya sobre la línea de base.
// El margen arriba/abajo de estas líneas es generoso a propósito: las vocales con tilde
// (Á, É...) suben por encima de RULE_TOP_Y y las descendentes (p, y) bajan por debajo de
// RULE_BOTTOM_Y, y el canvas necesita espacio real para eso o se recortan.
export const RULE_TOP_Y = 75;
export const RULE_BOTTOM_Y = RULE_TOP_Y + 172;

export function drawRuledBackground(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const band = RULE_BOTTOM_Y - RULE_TOP_Y;
  const ys = [RULE_TOP_Y, RULE_TOP_Y + band / 3, RULE_TOP_Y + (band * 2) / 3, RULE_BOTTOM_Y];
  ys.forEach((y, i) => {
    const isBoundary = i === 0 || i === ys.length - 1;
    ctx.strokeStyle = isBoundary ? "#5c6b82" : "#bcd4ee";
    ctx.lineWidth = isBoundary ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });
}

// Mulish/Muli es la tipografía que usa el Cuadernillo 1 (ver reference/*.pdf, pdffonts).
// Se autohospeda vía @font-face en index.css. El respaldo termina en sans-serif (nunca
// "cursive": ese genérico resuelve a una tipografía manuscrita en varios navegadores/SO).
export function fontString(size: number): string {
  return `bold ${size}px "Mulish", Verdana, "Trebuchet MS", sans-serif`;
}

// El canvas no espera solo a los webfonts como el texto HTML: si se dibuja antes de que
// "Mulish" termine de descargarse, queda con la tipografía de respaldo para siempre (no
// hay repintado automático cuando el font llega). Hay que esperar explícitamente.
let fontsLoadedPromise: Promise<void> | null = null;
export function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  if (!fontsLoadedPromise) {
    fontsLoadedPromise = document.fonts
      .load('bold 100px "Mulish"')
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsLoadedPromise;
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number): number {
  let fontSize = startSize;
  ctx.font = fontString(fontSize);
  while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
    fontSize -= 4;
    ctx.font = fontString(fontSize);
  }
  return fontSize;
}

/** El mismo tamaño de fuente que usa drawGlyph, expuesto para posicionar las flechas de trazo. */
export function computeFontSizeForGlyph(ctx: CanvasRenderingContext2D, text: string, canvasWidth: number): number {
  const band = RULE_BOTTOM_Y - RULE_TOP_Y;
  return fitFontSize(ctx, text, canvasWidth * 0.85, Math.floor(band / 0.7));
}

interface DrawGlyphOptions {
  alpha?: number;
  /** Si es false, no limpia el canvas antes de dibujar (para dibujar sobre el renglón ya pintado) */
  clear?: boolean;
}

export function drawGlyph(ctx: CanvasRenderingContext2D, text: string, options: DrawGlyphOptions = {}): void {
  const { alpha = 1, clear = true } = options;
  const { width, height } = ctx.canvas;
  if (clear) ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.globalAlpha = alpha;
  computeFontSizeForGlyph(ctx, text, width);
  ctx.fillText(text, width / 2, RULE_BOTTOM_Y);
  ctx.globalAlpha = 1;
}

function renderTargetCanvas(text: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  drawGlyph(ctx, text);
  return canvas;
}

function blurredAlpha(source: CanvasImageSource, blurPx: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
}

/**
 * Puntaje 0-100: qué fracción de la letra objetivo tiene tinta cerca (cobertura)
 * menos qué fracción de la tinta quedó lejos de la letra (penalización por
 * tinta perdida). "Cerca" se define por la tolerancia del nivel de dificultad
 * actual (ver lib/difficulty.ts), no exige que el trazo caiga exactamente sobre
 * el contorno de la fuente. No es reconocimiento de escritura real.
 */
export async function scoreTracing(target: string, inkCanvas: HTMLCanvasElement): Promise<number> {
  await ensureFontsLoaded();
  const { tolerancePx, strayWeight } = getDifficultySettings();
  const targetCanvas = renderTargetCanvas(target);
  const targetAlpha = targetCanvas.getContext("2d")!.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
  const inkAlpha = inkCanvas.getContext("2d")!.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
  const inkNearTarget = blurredAlpha(targetCanvas, tolerancePx);
  const targetNearInk = blurredAlpha(inkCanvas, tolerancePx);

  let targetPixels = 0;
  let coveredPixels = 0;
  let strayPixels = 0;
  let inkPixels = 0;

  for (let i = 3; i < targetAlpha.length; i += 4) {
    const isTarget = targetAlpha[i] > 40;
    const isInk = inkAlpha[i] > 40;
    if (isTarget) {
      targetPixels++;
      if (targetNearInk[i] > 15) coveredPixels++;
    }
    if (isInk) {
      inkPixels++;
      if (inkNearTarget[i] <= 15) strayPixels++;
    }
  }

  if (targetPixels === 0) return 0;
  const coverage = coveredPixels / targetPixels;
  const strayRatio = inkPixels > 0 ? strayPixels / inkPixels : 0;
  const score = Math.max(0, coverage - strayRatio * strayWeight);
  return Math.round(score * 100);
}
