import { useEffect, useState } from "react";
import type { LetterUnit } from "../content/types";
import { TracingCanvas } from "../canvas/TracingCanvas";
import { ModelGlyph } from "../canvas/ModelGlyph";
import { StrokeOrderPage } from "./StrokeOrderPage";
import { REQUIRED_REPETITIONS, REQUIRED_TRACED_REPETITIONS } from "../canvas/tracingScore";
import { getDifficultySettings } from "../lib/difficulty";
import { playSound } from "../audio/playSound";
import { markCompleted } from "../lib/progress";
import "./WritingPage.css";

interface WritingPageProps {
  unit: LetterUnit;
  onBack: () => void;
  onFinish: () => void;
}

export function WritingPage({ unit, onBack, onFinish }: WritingPageProps) {
  const items = [
    ...unit.escritura.trazos.map((text) => ({
      text,
      isWord: false,
      phonemeFallback: unit.fonemaFallback,
      phonemeRecordingKey: unit.fonemaRecordingKey,
    })),
    ...unit.escritura.palabraFinal.map((text) => ({
      text,
      isWord: true,
      phonemeFallback: unit.fonemaFallback,
      phonemeRecordingKey: unit.fonemaRecordingKey,
    })),
  ];
  // La hoja es fija: todos los renglones y repeticiones están visibles desde el
  // principio (como una página impresa), pero solo el canvas que sigue en el orden de
  // lectura (renglón por renglón, repetición por repetición) está habilitado; el
  // resto se ve pero no se puede tocar hasta que le toque el turno.
  const [passed, setPassed] = useState<boolean[][]>(() => items.map(() => Array(REQUIRED_REPETITIONS).fill(false)));
  const [celebrating, setCelebrating] = useState(false);
  // Si falla el reconocimiento de una letra suelta (no una palabra: ahí no hay una
  // sola letra a la que mandar), se manda a practicar esa letra en "seguí el camino
  // con el dedo" antes de dejarla reintentar — mantiene este componente montado (no es
  // una navegación de App.tsx) para no perder el progreso de `passed` ya hecho.
  const [practicingChar, setPracticingChar] = useState<string | null>(null);

  const flatPassed = passed.flat();
  const nextFlatIndex = flatPassed.findIndex((done) => !done);
  const unlockedFlatIndex = nextFlatIndex === -1 ? flatPassed.length : nextFlatIndex;

  useEffect(() => {
    playSound("Primero calcá la letra con el lápiz. Después escribila de memoria.");
  }, [unit]);

  async function handleScored(itemIndex: number, repIndex: number, score: number) {
    if (score < getDifficultySettings().passScore) {
      const item = items[itemIndex];
      // Antes de mandarla a practicar, avisa que no salió y por qué (recordarle que
      // siga el orden de trazo aprendido) — así no es un salto de pantalla sorpresivo.
      if (!item.isWord) {
        await playSound("Todavía no. Recordá seguir el orden de los trazos que aprendiste.");
        setPracticingChar(item.text);
      }
      return;
    }
    setPassed((prev) => {
      const next = prev.map((row) => [...row]);
      next[itemIndex][repIndex] = true;
      return next;
    });
  }

  const doneCount = passed.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const totalCount = items.length * REQUIRED_REPETITIONS;
  const allDone = doneCount === totalCount;

  function handleFinish() {
    if (!allDone) return;
    markCompleted(unit.id, "escritura");
    setCelebrating(true);
    playSound(`¡Muy bien! Terminaste la letra ${unit.id}.`);
  }

  if (practicingChar) {
    return (
      <StrokeOrderPage
        unit={unit}
        chars={[practicingChar]}
        onBack={() => setPracticingChar(null)}
        onContinue={() => setPracticingChar(null)}
      />
    );
  }

  if (celebrating) {
    return (
      <div className="writing-page__celebration">
        <div className="writing-page__celebration-emoji">🎉🐇🎉</div>
        <h1>¡Muy bien!</h1>
        <p>Terminaste la letra {unit.grafemas[0]}{unit.grafemas[1] ?? ""}</p>
        <button className="writing-page__finish" onClick={onFinish}>
          Seguir ➡️
        </button>
      </div>
    );
  }

  return (
    <div className="writing-page">
      <button className="writing-page__back" onClick={onBack}>
        ← Volver
      </button>
      <p className="writing-page__hint">
        Primero calcá, después escribí de memoria ({doneCount}/{totalCount})
      </p>

      <div className="writing-page__sheet">
        {items.map((item, i) => (
          <div className="writing-row" key={i}>
            <ModelGlyph text={item.text} />

            {Array.from({ length: REQUIRED_REPETITIONS }).map((_, j) => {
              if (passed[i][j]) {
                return (
                  <div className="writing-row__done" key={j}>
                    <ModelGlyph text={item.text} alpha={0.4} />
                    <span className="writing-row__check">✓</span>
                  </div>
                );
              }
              const flatIndex = i * REQUIRED_REPETITIONS + j;
              if (flatIndex > unlockedFlatIndex) {
                return (
                  <div className="writing-row__locked" key={j}>
                    <ModelGlyph text={item.text} alpha={0.15} />
                    <span className="writing-row__lock">🔒</span>
                  </div>
                );
              }
              return (
                <TracingCanvas
                  key={j}
                  target={item.text}
                  isWord={item.isWord}
                  phonemeFallback={item.phonemeFallback}
                  phonemeRecordingKey={item.phonemeRecordingKey}
                  showGuide={j < REQUIRED_TRACED_REPETITIONS}
                  onScored={(score) => handleScored(i, j, score)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <button className="writing-page__finish" onClick={handleFinish} disabled={!allDone}>
        {allDone ? "Terminar unidad ✅" : `Te faltan ${totalCount - doneCount} trazos`}
      </button>
    </div>
  );
}
