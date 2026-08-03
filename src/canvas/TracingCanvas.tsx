import { useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_HEIGHT_MM,
  CANVAS_WIDTH,
  CANVAS_WIDTH_MM,
  drawGlyph,
  drawRuledBackground,
  ensureFontsLoaded,
} from "./tracingScore";
import { explainMismatch, shapeScoreDetailed, type Point, type Stroke } from "./pointCloudRecognizer";
import { buildLetterTemplates, buildTextTemplate, scoreWordLetters } from "./textTemplate";
import { playCelebration, playLetterSound, playSound } from "../audio/playSound";
import { getDifficultySettings } from "../lib/difficulty";
import "./TracingCanvas.css";

interface TracingCanvasProps {
  target: string;
  /** true = `target` es una palabra (palabraFinal): se dice la palabra y después el fonema de la letra. */
  isWord?: boolean;
  /** Texto de respaldo (letra/sílaba aislada) para aproximar el fonema cuando no hay grabación para `target`. */
  phonemeFallback?: string;
  /** Nombre exacto de la grabación a usar cuando el grafema tiene más de un sonido posible (ver fonemaRecordingKey). */
  phonemeRecordingKey?: string;
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

export function TracingCanvas({
  target,
  isWord = false,
  phonemeFallback,
  phonemeRecordingKey,
  showGuide = true,
  onScored,
}: TracingCanvasProps) {
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
    if (inkCanvas) inkCanvas.getContext("2d")!.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (stroke.length === 0) return;

    // Un toque sin arrastre (el puntito de la "i"/"í") no dispara pointermove, así
    // que no queda tinta dibujada ni trazo registrado si no se maneja aparte.
    if (stroke.length === 1) {
      const canvas = inkRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#1d3557";
        ctx.fill();
      }
      strokesRef.current.push(stroke);
      hasInkRef.current = true;
      return;
    }

    strokesRef.current.push(stroke);
    hasInkRef.current = true;
  }

  async function handleCheck() {
    if (!hasInkRef.current || strokesRef.current.length === 0) return;
    // Las palabras se puntúan letra por letra (ver scoreWordLetters): comparar toda la
    // palabra como una sola nube $P deja pasar letras salteadas o cambiadas por otra
    // parecida, porque el resto de la palabra "explica" la forma general igual y el
    // puntaje global apenas baja. Una letra sola no tiene ese problema (no hay otras
    // letras que la disimulen), así que sigue usando la comparación de nube entera.
    // Solo la letra individual guarda el desglose (`shapeScoreDetailed`, ver
    // `explainMismatch`): en una palabra no hay forma barata de saber CUÁL letra
    // falló ni por qué sin repetir el trabajo de `scoreWordLetters`.
    let result: number;
    let mismatchExplanation: string | null = null;
    if (isWord) {
      result = scoreWordLetters(strokesRef.current, await buildLetterTemplates(target));
      mismatchExplanation = "Alguna letra no salió bien, fijate en el modelo y probá de nuevo.";
    } else {
      const detail = shapeScoreDetailed(strokesRef.current, await buildTextTemplate(target));
      result = detail.score;
      mismatchExplanation = explainMismatch(detail);
    }
    setScore(result);

    if (result < getDifficultySettings().passScore) {
      await playSound(mismatchExplanation);
      onScored?.(result);
      return;
    }

    // Al aprobar: primero el sonido de la letra/palabra, después la felicitación, y
    // recién ahí se avisa al padre (onScored) — si avisáramos antes, este componente
    // se reemplaza enseguida por el de la siguiente repetición y nunca se llega a ver
    // el festejo. Cada sonido se espera hasta que termina antes de arrancar el
    // siguiente (en vez de un setTimeout con una duración adivinada), para que no se
    // superpongan cuando una grabación real dura más o menos que lo estimado.
    setCelebrating(true);
    if (isWord) {
      // Secuencia para palabras: primero el sonido de la letra sola (exagerado, ej. "mmm"
      // — usa la grabación real si existe, ver phonemeRecordingKey), después "como en
      // <palabra>", para que quede "mmm... como en mapa" en vez de decir la palabra y
      // recién después, suelto, el fonema.
      await playLetterSound(phonemeFallback ?? "", undefined, phonemeRecordingKey);
      await playSound(`como en ${target}`);
    } else {
      // Secuencia para letras: fonema de la letra (con fallback si no hay grabación) → felicitación.
      await playLetterSound(target, phonemeFallback, phonemeRecordingKey);
    }
    await playCelebration();
    setCelebrating(false);
    onScored?.(result);
  }

  return (
    <div className="tracing-canvas">
      <div className="tracing-canvas__stack" style={{ width: `${CANVAS_WIDTH_MM}mm`, height: `${CANVAS_HEIGHT_MM}mm` }}>
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
