import { useEffect, useRef, useState } from "react";
import type { LetterUnit } from "../content/types";
import type { Point } from "../canvas/pointCloudRecognizer";
import { buildStrokeOrderPaths, findForwardProgress, pointAtDistance, type ScaledStroke } from "../canvas/strokeOrderPath";
import { ensureFontsLoaded, fontString } from "../canvas/tracingScore";
import { playCelebration, playLetterSound } from "../audio/playSound";
import "./StrokeOrderPage.css";

interface StrokeOrderPageProps {
  unit: LetterUnit;
  onBack: () => void;
  onContinue: () => void;
}

const GUIDE_COLOR = "#c7d2e0";
const PROGRESS_COLOR = "#2a9d8f";
const DOT_COLOR = "#e9c46a";

// Qué tan lejos del camino puede estar el dedo/mouse y seguir contando como "sobre el
// trazo", y cuánto trazo hacia adelante se puede cubrir de una sola vez — ambos como
// fracción del lado más chico del área disponible. Valores para probar con chicos
// reales y ajustar: son una primera aproximación, no una medición.
const TOLERANCE_RATIO = 0.13;
const LOOKAHEAD_RATIO = 0.45;
const MIN_LOOKAHEAD_PX = 70;
const STROKE_COMPLETE_EPSILON_PX = 3;
const CELEBRATION_MS = 1300;

function pointFromEvent(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function drawStrokePath(ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
}

// Igual que buildTextTemplate (textTemplate.ts): mide a un tamaño de referencia y
// escala, para que el ancho/alto reales del glifo (no el em-square) entren en el área
// disponible.
const GUIDE_REFERENCE_SIZE = 200;
const GUIDE_FIT_MARGIN = 0.85;

/**
 * Dibuja `char` con la misma tipografía real (Mulish) que usa la plantilla de calcado
 * de TracingCanvas/ModelGlyph, como guía de fondo — en vez del trazo esquemático de
 * letterShapes.ts (pensado para puntuar forma, no para verse). El seguimiento de
 * progreso (ver drawProgress) sigue basado en letterShapes: puede no calzar pixel a
 * pixel con el contorno de la fuente en letras curvas, pero da una guía visual
 * consistente con el resto de la app.
 */
function drawGuideGlyph(ctx: CanvasRenderingContext2D, char: string, width: number, height: number, color: string) {
  ctx.font = fontString(GUIDE_REFERENCE_SIZE);
  const m = ctx.measureText(char);
  const glyphWidth = m.width || GUIDE_REFERENCE_SIZE * 0.55;
  const ascent = m.actualBoundingBoxAscent || GUIDE_REFERENCE_SIZE * 0.7;
  const descent = m.actualBoundingBoxDescent || 0;
  const glyphHeight = ascent + descent || GUIDE_REFERENCE_SIZE;
  const scale = Math.min((width * GUIDE_FIT_MARGIN) / glyphWidth, (height * GUIDE_FIT_MARGIN) / glyphHeight);

  ctx.font = fontString(GUIDE_REFERENCE_SIZE * scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  const baselineY = height / 2 + ((ascent - descent) * scale) / 2;
  ctx.fillText(char, width / 2, baselineY);
}

export function StrokeOrderPage({ unit, onBack, onContinue }: StrokeOrderPageProps) {
  const trazos = unit.escritura.trazos;
  const [charIndex, setCharIndex] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement>(null);

  const strokesRef = useRef<ScaledStroke[]>([]);
  const lineWidthRef = useRef(16);
  const strokeIndexRef = useRef(0);
  const distanceRef = useRef(0);
  const drawingRef = useRef(false);

  const char = trazos[charIndex];

  function drawGuide() {
    const canvas = guideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuideGlyph(ctx, char, canvas.width, canvas.height, GUIDE_COLOR);
  }

  function drawProgress() {
    const canvas = progressCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = strokesRef.current;
    for (let i = 0; i < strokeIndexRef.current; i++) {
      drawStrokePath(ctx, strokes[i].points, PROGRESS_COLOR, lineWidthRef.current);
    }

    const current = strokes[strokeIndexRef.current];
    if (!current) return;
    const covered = current.points.filter((_, i) => current.cumulative[i] <= distanceRef.current);
    const head = pointAtDistance(current, distanceRef.current);
    drawStrokePath(ctx, [...covered, head], PROGRESS_COLOR, lineWidthRef.current);

    ctx.beginPath();
    ctx.arc(head.x, head.y, lineWidthRef.current * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR;
    ctx.fill();
  }

  function rebuildForChar() {
    const stage = stageRef.current;
    const guideCanvas = guideCanvasRef.current;
    const progressCanvas = progressCanvasRef.current;
    if (!stage || !guideCanvas || !progressCanvas) return;

    const width = stage.clientWidth;
    const height = stage.clientHeight;
    [guideCanvas, progressCanvas].forEach((c) => {
      c.width = width;
      c.height = height;
    });
    lineWidthRef.current = Math.max(10, Math.min(width, height) * 0.045);

    strokesRef.current = buildStrokeOrderPaths(char, width, height) ?? [];
    strokeIndexRef.current = 0;
    distanceRef.current = 0;
    drawingRef.current = false;

    drawGuide();
    drawProgress();
  }

  useEffect(() => {
    rebuildForChar();
    playLetterSound(char, unit.fonemaFallback, unit.fonemaRecordingKey).catch(() => {});

    // El canvas no espera al webfont como el HTML: si se dibuja antes de que "Mulish"
    // esté lista, la guía queda con la tipografía de respaldo para siempre.
    let cancelled = false;
    ensureFontsLoaded().then(() => {
      if (!cancelled) drawGuide();
    });

    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => rebuildForChar());
    observer.observe(stage);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, unit]);

  async function finishChar() {
    drawingRef.current = false;
    setCelebrating(true);
    await playCelebration();
    window.setTimeout(() => {
      setCelebrating(false);
      if (charIndex + 1 < trazos.length) {
        setCharIndex(charIndex + 1);
      } else {
        onContinue();
      }
    }, CELEBRATION_MS);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const current = strokesRef.current[strokeIndexRef.current];
    if (!current) return;
    const canvas = e.currentTarget;
    const p = pointFromEvent(canvas, e);
    const head = pointAtDistance(current, distanceRef.current);
    const startTolerance = Math.max(lineWidthRef.current * 2, Math.min(canvas.width, canvas.height) * TOLERANCE_RATIO);
    if (Math.hypot(p.x - head.x, p.y - head.y) > startTolerance) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores/dispositivos pueden rechazar la captura; el trazo sigue
      // funcionando igual mientras el puntero no salga del canvas.
    }
    drawingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || celebrating) return;
    const current = strokesRef.current[strokeIndexRef.current];
    if (!current) return;
    const canvas = e.currentTarget;
    const p = pointFromEvent(canvas, e);
    const minSide = Math.min(canvas.width, canvas.height);
    const tolerance = Math.max(lineWidthRef.current * 1.5, minSide * TOLERANCE_RATIO);
    const lookahead = Math.max(MIN_LOOKAHEAD_PX, current.length * LOOKAHEAD_RATIO);

    const next = findForwardProgress(current, distanceRef.current, p, tolerance, lookahead);
    if (next === null) {
      drawingRef.current = false;
      return;
    }
    distanceRef.current = next;
    drawProgress();

    if (current.length - distanceRef.current <= STROKE_COMPLETE_EPSILON_PX) {
      if (strokeIndexRef.current + 1 < strokesRef.current.length) {
        strokeIndexRef.current += 1;
        distanceRef.current = 0;
        drawingRef.current = false;
        drawProgress();
      } else {
        finishChar();
      }
    }
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  return (
    <div className="stroke-order-page">
      <div className="stroke-order-page__header">
        <button className="stroke-order-page__back" onClick={onBack}>
          ← Volver
        </button>
        <p className="stroke-order-page__hint">
          Seguí el camino con el dedo ({charIndex + 1}/{trazos.length})
        </p>
      </div>

      <div className="stroke-order-page__stage" ref={stageRef}>
        <canvas ref={guideCanvasRef} className="stroke-order-page__canvas" />
        <canvas
          ref={progressCanvasRef}
          className="stroke-order-page__canvas stroke-order-page__canvas--ink"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {celebrating && (
          <div className="stroke-order-page__celebration">
            <span className="stroke-order-page__sparkle stroke-order-page__sparkle--1">✨</span>
            <span className="stroke-order-page__sparkle stroke-order-page__sparkle--2">✨</span>
            <span className="stroke-order-page__sparkle stroke-order-page__sparkle--3">✨</span>
            <span className="stroke-order-page__sparkle stroke-order-page__sparkle--4">✨</span>
            <span className="stroke-order-page__star">⭐</span>
          </div>
        )}
      </div>
    </div>
  );
}
