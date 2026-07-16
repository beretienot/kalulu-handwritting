import { useEffect, useState } from "react";
import type { LetterUnit } from "../content/types";
import { TracingCanvas } from "../canvas/TracingCanvas";
import { ModelGlyph } from "../canvas/ModelGlyph";
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
    ...unit.escritura.trazos.map((text) => ({ text, audioId: `fonema-${unit.id}` })),
    ...unit.escritura.palabraFinal.map((text) => ({ text, audioId: undefined as string | undefined })),
  ];
  // Cuántas repeticiones ya aprobó cada renglón; la siguiente se agrega recién cuando la anterior pasa.
  const [passedCounts, setPassedCounts] = useState<number[]>(() => items.map(() => 0));
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    playSound("Primero calcá la letra con el lápiz. Después escribila de memoria.");
  }, [unit]);

  function handleScored(itemIndex: number, score: number) {
    if (score < getDifficultySettings().passScore) return;
    setPassedCounts((prev) => {
      const next = [...prev];
      next[itemIndex] = Math.min(REQUIRED_REPETITIONS, next[itemIndex] + 1);
      return next;
    });
  }

  const doneCount = passedCounts.reduce((a, b) => a + b, 0);
  const totalCount = items.length * REQUIRED_REPETITIONS;
  const allDone = doneCount === totalCount;

  function handleFinish() {
    if (!allDone) return;
    markCompleted(unit.id, "escritura");
    setCelebrating(true);
    playSound(`¡Muy bien! Terminaste la letra ${unit.id}.`);
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

            {Array.from({ length: passedCounts[i] }).map((_, j) => (
              <div className="writing-row__done" key={j}>
                <ModelGlyph text={item.text} alpha={0.4} />
                <span className="writing-row__check">✓</span>
              </div>
            ))}

            {passedCounts[i] < REQUIRED_REPETITIONS && (
              <TracingCanvas
                key={passedCounts[i]}
                target={item.text}
                audioId={item.audioId}
                showGuide={passedCounts[i] < REQUIRED_TRACED_REPETITIONS}
                onScored={(score) => handleScored(i, score)}
              />
            )}
          </div>
        ))}
      </div>

      <button className="writing-page__finish" onClick={handleFinish} disabled={!allDone}>
        {allDone ? "Terminar unidad ✅" : `Te faltan ${totalCount - doneCount} trazos`}
      </button>
    </div>
  );
}
