import { useEffect, useRef, useState } from "react";
import type { LetterUnit } from "../content/types";
import type { Point } from "../canvas/pointCloudRecognizer";
import {
  buildStrokeOrderPaths,
  computePathFit,
  findForwardProgress,
  pointAtDistance,
  type PathFit,
  type ScaledStroke,
} from "../canvas/strokeOrderPath";
import { playCelebration, playLetterSound } from "../audio/playSound";
import "./StrokeOrderPage.css";

interface StrokeOrderPageProps {
  unit: LetterUnit;
  onBack: () => void;
  onContinue: () => void;
  /** Letras a recorrer, en vez de unit.escritura.trazos completo — para una práctica
   *  puntual de una sola letra (ver WritingPage: reintento de trazo tras fallar el
   *  reconocimiento), no todo el repaso de la unidad. */
  chars?: string[];
}

const GUIDE_COLOR = "#c7d2e0";
const PROGRESS_COLOR = "#2a9d8f";
const DOT_COLOR = "#e9c46a";
const MARKER_TEXT_COLOR = "#1d3557";

// Qué tan lejos del camino puede estar el dedo/mouse y seguir contando como "sobre el
// trazo", y cuánto trazo hacia adelante se puede cubrir de una sola vez — ambos como
// fracción del lado más chico del área disponible. Estrictos a propósito: hay que
// pegarse de verdad al camino de letterShapes.ts, no basta con estar "cerca" en general.
const TOLERANCE_RATIO = 0.07;
const LOOKAHEAD_RATIO = 0.22;
const MIN_LOOKAHEAD_PX = 36;
const STROKE_COMPLETE_EPSILON_PX = 3;
const CELEBRATION_MS = 1300;

// Distancia (px) hacia atrás/adelante del punto actual que se usa para calcular hacia
// dónde apunta la flecha de dirección (la tangente del camino en ese punto).
const ARROW_LOOKAHEAD_PX = 22;

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

/** Círculo numerado en el punto de inicio de un trazo, para diferenciarlos entre sí:
 * cubierto (verde), el que sigue ahora (resaltado) o todavía no le toca (apagado). */
function drawStrokeNumberBadge(
  ctx: CanvasRenderingContext2D,
  center: Point,
  index: number,
  status: "done" | "current" | "pending",
  radius: number
) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = status === "done" ? PROGRESS_COLOR : status === "current" ? DOT_COLOR : "#ffffff";
  ctx.fill();
  if (status !== "done") {
    ctx.lineWidth = Math.max(1.5, radius * 0.15);
    ctx.strokeStyle = status === "current" ? DOT_COLOR : GUIDE_COLOR;
    ctx.stroke();
  }
  ctx.fillStyle = status === "pending" ? MARKER_TEXT_COLOR : "#ffffff";
  ctx.font = `bold ${Math.round(radius * 1.15)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), center.x, center.y + radius * 0.05);
}

/** Ángulo (radianes) hacia el que "avanza" el camino en `distance`, mirando un poco
 * antes y un poco después (funciona incluso pegado al principio o al final). */
function directionAngleAt(stroke: ScaledStroke, distance: number): number {
  const behind = pointAtDistance(stroke, Math.max(0, distance - ARROW_LOOKAHEAD_PX));
  const ahead = pointAtDistance(stroke, Math.min(stroke.length, distance + ARROW_LOOKAHEAD_PX));
  return Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
}

/** Flecha en `head` apuntando en la dirección en la que hay que seguir el trazo. */
function drawDirectionArrow(ctx: CanvasRenderingContext2D, head: Point, angle: number, size: number) {
  ctx.beginPath();
  ctx.arc(head.x, head.y, size * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = DOT_COLOR;
  ctx.fill();

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size * 1.1, 0);
  ctx.lineTo(-size * 0.5, size * 0.7);
  ctx.lineTo(-size * 0.5, -size * 0.7);
  ctx.closePath();
  ctx.fillStyle = MARKER_TEXT_COLOR;
  ctx.fill();
  ctx.restore();
}

// Cuánto más grueso que el trazo de progreso se dibuja la guía de fondo: bastante más
// grueso, así se ve como el "tubo" redondeado de las hojas de referencia (el contorno
// grande por el que después pasa la línea de progreso, más fina, encima).
const GUIDE_WIDTH_RATIO = 2.1;

export function StrokeOrderPage({ unit, onBack, onContinue, chars }: StrokeOrderPageProps) {
  const trazos = chars ?? unit.escritura.trazos;
  const [charIndex, setCharIndex] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement>(null);

  const strokesRef = useRef<ScaledStroke[]>([]);
  const fitRef = useRef<PathFit | null>(null);
  const lineWidthRef = useRef(16);
  const strokeIndexRef = useRef(0);
  const distanceRef = useRef(0);
  const drawingRef = useRef(false);

  const char = trazos[charIndex];

  /** Dibuja el contorno grueso que sirve de guía: el mismo camino que se sigue con el
   * dedo (ver strokeOrderShapes.ts), no un glifo de una tipografía aparte — así la guía
   * y el trazo son, por construcción, el mismo camino. */
  function drawGuide() {
    const canvas = guideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStrokePath(ctx, stroke.points, GUIDE_COLOR, lineWidthRef.current * GUIDE_WIDTH_RATIO);
    }
  }

  function drawProgress() {
    const canvas = progressCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = strokesRef.current;
    const badgeRadius = lineWidthRef.current * 0.7;

    for (let i = 0; i < strokeIndexRef.current; i++) {
      drawStrokePath(ctx, strokes[i].points, PROGRESS_COLOR, lineWidthRef.current);
    }

    // Un número por trazo (menos el activo, que lleva la flecha) para que se note que
    // son trazos distintos: ya hechos (verde), o todavía pendientes (apagado).
    strokes.forEach((stroke, i) => {
      if (i === strokeIndexRef.current) return;
      drawStrokeNumberBadge(ctx, stroke.points[0], i, i < strokeIndexRef.current ? "done" : "pending", badgeRadius);
    });

    const current = strokes[strokeIndexRef.current];
    if (!current) return;
    const covered = current.points.filter((_, i) => current.cumulative[i] <= distanceRef.current);
    const head = pointAtDistance(current, distanceRef.current);
    drawStrokePath(ctx, [...covered, head], PROGRESS_COLOR, lineWidthRef.current);

    const angle = directionAngleAt(current, distanceRef.current);
    drawDirectionArrow(ctx, head, angle, lineWidthRef.current * 0.8);
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

    fitRef.current = computePathFit(char, width, height);
    strokesRef.current = buildStrokeOrderPaths(char, fitRef.current) ?? [];
    strokeIndexRef.current = 0;
    distanceRef.current = 0;
    drawingRef.current = false;

    drawGuide();
    drawProgress();
  }

  useEffect(() => {
    rebuildForChar();
    playLetterSound(char, unit.fonemaFallback, unit.fonemaRecordingKey).catch(() => {});

    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => rebuildForChar());
    observer.observe(stage);
    return () => observer.disconnect();
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
    const startTolerance = Math.max(lineWidthRef.current * 1.2, Math.min(canvas.width, canvas.height) * TOLERANCE_RATIO);
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
    const tolerance = Math.max(lineWidthRef.current * 1.0, minSide * TOLERANCE_RATIO);
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
