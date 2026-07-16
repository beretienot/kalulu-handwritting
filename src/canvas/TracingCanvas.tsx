import { useEffect, useRef, useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawGlyph, drawRuledBackground, ensureFontsLoaded, scoreTracing } from "./tracingScore";
import { playSound } from "../audio/playSound";
import { getDifficultySettings } from "../lib/difficulty";
import "./TracingCanvas.css";

interface TracingCanvasProps {
  target: string;
  audioId?: string;
  /** false = renglón "sin calcar": no se muestra la letra guía, solo el renglón en blanco. */
  showGuide?: boolean;
  onScored?: (score: number) => void;
}

function pointFromEvent(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) {
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
  const [score, setScore] = useState<number | null>(null);
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
    const { x, y } = pointFromEvent(canvas, e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d3557";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = pointFromEvent(canvas, e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = 4 + pressure * 14;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  async function handleCheck() {
    const inkCanvas = inkRef.current;
    if (!inkCanvas || !hasInkRef.current) return;
    const result = await scoreTracing(target, inkCanvas);
    setScore(result);
    onScored?.(result);
    if (result >= getDifficultySettings().passScore) {
      playSound(target, audioId);
    }
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
            {score >= passScore ? "¡Muy bien!" : "Probá de nuevo"} ({score}%)
          </span>
        )}
      </div>
    </div>
  );
}
