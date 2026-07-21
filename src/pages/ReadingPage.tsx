import { useEffect, useMemo, useRef, useState } from "react";
import type { LetterUnit } from "../content/types";
import { playSound, playSoundWithHighlight } from "../audio/playSound";
import { HighlightedText } from "../components/HighlightedText";
import { markCompleted } from "../lib/progress";
import "./ReadingPage.css";

interface ReadingPageProps {
  unit: LetterUnit;
  onBack: () => void;
  onContinue: () => void;
}

export function ReadingPage({ unit, onBack, onContinue }: ReadingPageProps) {
  const [playing, setPlaying] = useState<{ key: string; index: number } | null>(null);
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const totalCount = useMemo(
    () =>
      unit.grafemas.length +
      unit.lectura.grid.reduce((sum, row) => sum + row.length, 0) +
      unit.lectura.palabras.length +
      unit.lectura.oraciones.length,
    [unit]
  );

  useEffect(() => {
    setPressed(new Set());
    playSound("Tocá cada botón para escuchar cómo suena.");
  }, [unit]);

  function handlePlay(key: string, text: string, fallbackText?: string, recordingKey?: string) {
    stopRef.current?.();
    setPlaying({ key, index: 0 });
    setPressed((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    stopRef.current = playSoundWithHighlight(
      text,
      (index) => setPlaying({ key, index }),
      () => setPlaying(null),
      fallbackText,
      recordingKey
    );
  }

  function activeIndex(key: string): number | null {
    return playing?.key === key ? playing.index : null;
  }

  function pressedClass(key: string): string {
    return pressed.has(key) ? " reading-page__item--pressed" : "";
  }

  function handleContinue() {
    markCompleted(unit.id, "lectura");
    onContinue();
  }

  return (
    <div className="reading-page">
      <button className="reading-page__back" onClick={onBack}>
        ← Volver
      </button>
      <p className="reading-page__hint">
        Tocá para escuchar cómo suena ({pressed.size}/{totalCount})
      </p>

      <div className="reading-page__title">
        {unit.grafemas.map((g, i) => {
          const key = `g-${i}`;
          return (
            <button
              key={i}
              className={`reading-page__glyph${pressedClass(key)}`}
              onClick={() => handlePlay(key, g, unit.fonemaFallback, unit.fonemaRecordingKey)}
            >
              <HighlightedText text={g} activeIndex={activeIndex(key)} />
            </button>
          );
        })}
      </div>

      <div className="reading-page__grid">
        {unit.lectura.grid.map((row, i) => (
          <div className="reading-page__row" key={i}>
            {row.map((cell, j) => {
              const key = `cell-${i}-${j}`;
              return (
                <button key={j} className={`reading-page__cell${pressedClass(key)}`} onClick={() => handlePlay(key, cell)}>
                  <HighlightedText text={cell} activeIndex={activeIndex(key)} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {unit.lectura.palabras.length > 0 && (
        <div className="reading-page__section">
          <h2>Palabras</h2>
          <div className="reading-page__words">
            {unit.lectura.palabras.map((word, i) => {
              const key = `word-${i}`;
              return (
                <button key={i} className={`reading-page__word${pressedClass(key)}`} onClick={() => handlePlay(key, word)}>
                  <HighlightedText text={word} activeIndex={activeIndex(key)} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {unit.lectura.oraciones.length > 0 && (
        <div className="reading-page__section">
          <h2>Oraciones</h2>
          <div className="reading-page__sentences">
            {unit.lectura.oraciones.map((sentence, i) => {
              const key = `sentence-${i}`;
              return (
                <button
                  key={i}
                  className={`reading-page__sentence${pressedClass(key)}`}
                  onClick={() => handlePlay(key, sentence)}
                >
                  <HighlightedText text={sentence} activeIndex={activeIndex(key)} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button className="reading-page__continue" onClick={handleContinue}>
        Continuar a escritura ✏️
      </button>
    </div>
  );
}
