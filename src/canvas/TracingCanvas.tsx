import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawGlyph, drawRuledBackground, ensureFontsLoaded } from "./tracingScore";
import { cloudDistanceScore, prepareCloud, type Point, type Stroke } from "./pointCloudRecognizer";
import { buildTextTemplate } from "./textTemplate";
import { playCelebration, playSound } from "../audio/playSound";
import { getDifficultySettings } from "../lib/difficulty";
import "./TracingCanvas.css";

interface TracingCanvasProps {
  target: string;
  audioId?: string;
  /** false = renglón "sin calcar": no se muestra la letra guía, solo el renglón en blanco. */
  showGuide?: boolean;
  onScored?: (score: number) => void;
}

function pointFromEvent(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

export function TracingCanvas({ target, audioId, showGuide = true, onScored }: TracingCanvasProps) {
  const guideRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  // Puntos crudos del trazo (no solo los píxeles dibujados): $P compara la forma como
  // una nube de puntos, invariante a escala y posición.
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke>([]);
  const [score, setScore] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const passScore = getDifficultySettings().passScore;

  useEffect(() => {
    function draw() {
      const guideCanvas = guideRef.current;
      if (!guideCanvas) return;
      const ctx = guideCanvas.getContext("2d")!;
      drawRuledBackground(ctx);
      if (showGuide) {
        drawGlyph(ctx, target, { alpha: 0.22, clear: false });
      }
    }
    let cancelled = false;
    draw();
    ensureFontsLoaded().then(() => {
      if (!cancelled) draw();
    });
    clearInk();
    setScore(null);
    return () => {
      cancelled = true;
    };
  }, [target, showGuide]);

  function clearInk() {
    const inkCanvas = inkRef.current;
    if (!inkCanvas) return;
    inkCanvas.getContext("2d")!.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    hasInkRef.current = false;
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setScore(null);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = inkRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores/dispositivos pueden rechazar la captura; el trazo
      // sigue funcionando igual mientras el puntero no salga del canvas.
    }
    drawingRef.current = true;
    hasInkRef.current = true;
    const ctx = canvas.getContext("2d")!;
    const p = pointFromEvent(canvas, e);
    currentStrokeRef.current = [p];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d3557";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const p = pointFromEvent(canvas, e);
    currentStrokeRef.current.push(p);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = 4 + pressure * 14;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
    }
    currentStrokeRef.current = [];
  }

  async function handleCheck() {
    if (!hasInkRef.current || strokesRef.current.length === 0) return;
    const template = await buildTextTemplate(target);
    const result = cloudDistanceScore(prepareCloud(strokesRef.current), prepareCloud(template));
    setScore(result);

    if (result < getDifficultySettings().passScore) {
      onScored?.(result);
      return;
    }

    // Al aprobar: primero el sonido de la letra/palabra, después la felicitación, y
    // recién ahí se avisa al padre (onScored) — si avisáramos antes, este componente
    // se reemplaza enseguida por el de la siguiente repetición y nunca se llega a ver
    // el festejo. Cada llamada a la síntesis de voz cancela la anterior, así que van
    // encadenadas con una pequeña pausa entre una y otra.
    setCelebrating(true);
    playSound(target, audioId);
    window.setTimeout(() => playCelebration(), 900);
    window.setTimeout(() => {
      setCelebrating(false);
      onScored?.(result);
    }, 1900);
  }

  return (
    <div className="tracing-canvas">
      <div className="tracing-canvas__stack" style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}>
        <canvas ref={guideRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="tracing-canvas__layer" />
        <canvas
          ref={inkRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="tracing-canvas__layer tracing-canvas__ink"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {celebrating && (
          <div className="tracing-canvas__celebration-overlay">
            <span className="tracing-canvas__celebration-star">⭐</span>
          </div>
        )}
      </div>
      <div className="tracing-canvas__controls">
        <button type="button" onClick={clearInk} className="tracing-canvas__button tracing-canvas__button--secondary">
          Borrar
        </button>
        <button type="button" onClick={handleCheck} className="tracing-canvas__button">
          Listo
        </button>
        {score !== null && (
          <span className={`tracing-canvas__score ${score >= passScore ? "tracing-canvas__score--good" : ""}`}>
            {score >= passScore ? (
              <>
                <span className="tracing-canvas__celebrate">🎉</span> ¡Muy bien!
              </>
            ) : (
              "Probá de nuevo"
            )}{" "}
            ({score}%)
          </span>
        )}
      </div>
    </div>
  );
}
