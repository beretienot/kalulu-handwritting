import { useEffect, useState } from "react";
import type { LetterUnit } from "../content/types";
import { TracingCanvas } from "../canvas/TracingCanvas";
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
  // Ítem elegido a mano tocando su botón en el stepper (ver más abajo): permite
  // practicar cualquier letra/palabra de la hoja fuera de orden (ej. volver a "m" para
  // repetirla más veces), en vez de forzar siempre el siguiente ítem sin completar.
  // Se mantiene hasta que se toca otro botón — no vuelve solo al modo automático.
  const [manualItemIndex, setManualItemIndex] = useState<number | null>(null);

  const flatPassed = passed.flat();
  const nextFlatIndex = flatPassed.findIndex((done) => !done);
  const unlockedFlatIndex = nextFlatIndex === -1 ? flatPassed.length : nextFlatIndex;
  // Un solo canvas activo por vez (el de la repetición que sigue), en vez de uno por
  // cada repetición mostrado a la vez: eso obligaba a hacer scroll para ver la hoja
  // completa. Las demás repeticiones de cada letra/palabra se validan reusando ese
  // mismo canvas (se reinicia entre intento e intento), no viendo varios a la vez.
  const autoItemIndex = Math.min(Math.floor(unlockedFlatIndex / REQUIRED_REPETITIONS), items.length - 1);
  const activeItemIndex = manualItemIndex ?? autoItemIndex;
  // Primera repetición sin aprobar del ítem activo (mismo cálculo tanto para el modo
  // automático como para el manual); si ya están todas aprobadas (se volvió a elegir
  // un ítem ya completo para repasarlo), se arranca de nuevo desde la primera.
  const firstIncompleteRep = passed[activeItemIndex].findIndex((done) => !done);
  const currentRepIndex = firstIncompleteRep === -1 ? 0 : firstIncompleteRep;

  useEffect(() => {
    playSound("Primero calcá la letra con el lápiz. Después escribila de memoria.");
  }, [unit]);

  function handleScored(itemIndex: number, repIndex: number, score: number) {
    if (score < getDifficultySettings().passScore) return;
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

      {/* Un solo ítem a la vista por vez (texto plano, sin canvas): así en pantalla
          nunca hay más de un canvas de calcado — el de la tarjeta activa de abajo. */}
      <div className="writing-page__stepper">
        {items.map((item, i) => {
          const isDone = passed[i].every(Boolean);
          const isActive = i === activeItemIndex && !isDone;
          const status = isDone ? "done" : isActive ? "active" : "pending";
          return (
            <button
              type="button"
              className={`writing-stepper__item writing-stepper__item--${status}`}
              key={i}
              onClick={() => setManualItemIndex(i)}
            >
              {item.text}
            </button>
          );
        })}
      </div>

      {!allDone && (
        <div className="writing-page__sheet">
          <div className="writing-row">
            <div className="writing-row__dots">
              {passed[activeItemIndex].map((done, j) => (
                <span
                  key={j}
                  className={
                    "writing-row__dot" +
                    (done ? " writing-row__dot--done" : "") +
                    (j === currentRepIndex ? " writing-row__dot--current" : "")
                  }
                />
              ))}
            </div>

            <TracingCanvas
              key={`${activeItemIndex}-${currentRepIndex}`}
              target={items[activeItemIndex].text}
              isWord={items[activeItemIndex].isWord}
              phonemeFallback={items[activeItemIndex].phonemeFallback}
              phonemeRecordingKey={items[activeItemIndex].phonemeRecordingKey}
              showGuide={currentRepIndex < REQUIRED_TRACED_REPETITIONS}
              onScored={(score) => handleScored(activeItemIndex, currentRepIndex, score)}
            />
          </div>
        </div>
      )}

      <button className="writing-page__finish" onClick={handleFinish} disabled={!allDone}>
        {allDone ? "Terminar unidad ✅" : `Te faltan ${totalCount - doneCount} trazos`}
      </button>
    </div>
  );
}
