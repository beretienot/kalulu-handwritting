import { getBaseCharForMeasurement } from "./letterShapes";

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

// Medido sobre reference/Argentina-Cuadernillo-1 (1).pdf: renderizada a 300dpi
// (pdftoppm -r 300), la separación entre líneas guía es consistentemente ~47px
// (=3.97mm≈4mm), y cada renglón de escritura va de línea oscura a línea oscura
// con 3 líneas celestes intermedias en el medio, es decir 4 franjas de ~4mm.
// Este es el único número que ata el tamaño en pantalla al tamaño real en papel:
// el canvas interno sigue usando su propia resolución de píxeles (CANVAS_WIDTH/
// HEIGHT) para dibujar nítido, pero se muestra con `mm` de CSS (ver
// CANVAS_WIDTH_MM/CANVAS_HEIGHT_MM) para que la separación entre líneas sea la
// misma físicamente sin importar la densidad de píxeles del dispositivo.
const MM_PER_BAND = 4;
const BAND_COUNT = 4;
const BAND_PX = (RULE_BOTTOM_Y - RULE_TOP_Y) / BAND_COUNT;
const MM_PER_CANVAS_PX = MM_PER_BAND / BAND_PX;
export const CANVAS_WIDTH_MM = CANVAS_WIDTH * MM_PER_CANVAS_PX;
export const CANVAS_HEIGHT_MM = CANVAS_HEIGHT * MM_PER_CANVAS_PX;

export function drawRuledBackground(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const band = RULE_BOTTOM_Y - RULE_TOP_Y;
  const ys = [0, 1, 2, 3, 4].map((i) => RULE_TOP_Y + (band * i) / BAND_COUNT);
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

// En el cuadernillo real, no todas las letras ocupan el renglón entero: las minúsculas
// "de cuerpo" (a, n, o...) llegan solo hasta la línea celeste del medio (mitad del
// renglón), mientras que mayúsculas y ascendentes (b, d, f, l, t) llegan hasta la línea
// superior. Mulish (la fuente que dibuja esta guía) NO respeta esa proporción 1:2 por su
// cuenta: medido a 300px, su x-height es ~72% de su altura de mayúscula, no 50%. Por eso
// hay que forzar dos tamaños de fuente distintos (uno para cada categoría) en vez de uno
// solo — con un único tamaño calibrado a la mayúscula, las minúsculas de cuerpo quedan
// mucho más altas de lo que el renglón indica.
const ASCENDER_LOWER = new Set(["b", "d", "f", "l", "t"]);

type HeightClass = "full" | "xheight";

function isUpperChar(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

/** A qué línea del renglón debe llegar arriba `char`: "full" = línea superior (mayúsculas
 *  y ascendentes b/d/f/l/t), "xheight" = línea del medio (el resto de las minúsculas,
 *  incluidas las descendentes g/j/p/q/y, que solo difieren por abajo, no por arriba). */
function heightClassFor(char: string): HeightClass {
  const base = getBaseCharForMeasurement(char);
  if (isUpperChar(base) || ASCENDER_LOWER.has(base)) return "full";
  return "xheight";
}

/** Ascenso real (fracción del tamaño de fuente) de una mayúscula y de una minúscula de
 *  cuerpo en la fuente actual, para calcular qué tamaño de fuente hace que cada una
 *  llegue exactamente a su línea objetivo. Se mide en vivo (no una constante fija) para
 *  no depender de las proporciones exactas de Mulish si el font cambia. */
function measureHeightRatios(ctx: CanvasRenderingContext2D): { full: number; xheight: number } {
  const REFERENCE_SIZE = 300;
  ctx.font = fontString(REFERENCE_SIZE);
  const full = ctx.measureText("N").actualBoundingBoxAscent / REFERENCE_SIZE;
  const xheight = ctx.measureText("n").actualBoundingBoxAscent / REFERENCE_SIZE;
  return { full, xheight };
}

interface DrawGlyphOptions {
  alpha?: number;
  /** Si es false, no limpia el canvas antes de dibujar (para dibujar sobre el renglón ya pintado) */
  clear?: boolean;
}

/**
 * Dibuja `text` (una letra o una palabra corta) letra por letra en vez de con un solo
 * fillText: cada carácter usa el tamaño de fuente de su categoría (ver heightClassFor)
 * para que las minúsculas de cuerpo lleguen a la línea del medio y las mayúsculas/
 * ascendentes a la línea superior, ambas con la base en RULE_BOTTOM_Y — igual que en el
 * cuadernillo. Los descendentes (p, g, y...) y las tildes bajan/suben por su cuenta según
 * el propio dibujo de la fuente, sin necesidad de un tercer tamaño: ese margen ya está
 * contemplado fuera de RULE_TOP_Y/RULE_BOTTOM_Y (ver comentario más arriba).
 */
export function drawGlyph(ctx: CanvasRenderingContext2D, text: string, options: DrawGlyphOptions = {}): void {
  const { alpha = 1, clear = true } = options;
  const { width, height } = ctx.canvas;
  if (clear) ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.globalAlpha = alpha;

  const band = RULE_BOTTOM_Y - RULE_TOP_Y;
  const ratios = measureHeightRatios(ctx);
  let fullSize = band / ratios.full;
  let xheightSize = band / 2 / ratios.xheight;
  const sizeFor = (cls: HeightClass) => (cls === "full" ? fullSize : xheightSize);

  const chars = [...text];
  const classes = chars.map(heightClassFor);
  const widthOf = (ch: string, cls: HeightClass) => {
    ctx.font = fontString(sizeFor(cls));
    return ctx.measureText(ch).width;
  };
  let totalWidth = 0;
  chars.forEach((ch, i) => (totalWidth += widthOf(ch, classes[i])));

  const maxWidth = width * 0.85;
  if (totalWidth > maxWidth) {
    const shrink = maxWidth / totalWidth;
    fullSize *= shrink;
    xheightSize *= shrink;
    totalWidth = maxWidth;
  }

  let cursorX = (width - totalWidth) / 2;
  chars.forEach((ch, i) => {
    ctx.font = fontString(sizeFor(classes[i]));
    const w = ctx.measureText(ch).width;
    ctx.fillText(ch, cursorX + w / 2, RULE_BOTTOM_Y);
    cursorX += w;
  });

  ctx.globalAlpha = 1;
}
