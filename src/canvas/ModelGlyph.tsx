import { useEffect, useRef } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawGlyph, drawRuledBackground, ensureFontsLoaded } from "./tracingScore";
import "./ModelGlyph.css";

interface ModelGlyphProps {
  text: string;
  /** Opacidad del glifo: 1 = modelo de referencia (negro sólido), más bajo = copia ya calcada. */
  alpha?: number;
}

export function ModelGlyph({ text, alpha = 1 }: ModelGlyphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      drawRuledBackground(ctx);
      drawGlyph(ctx, text, { alpha, clear: false });
    }
    let cancelled = false;
    draw();
    ensureFontsLoaded().then(() => {
      if (!cancelled) draw();
    });
    return () => {
      cancelled = true;
    };
  }, [text, alpha]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="model-glyph" />;
}
