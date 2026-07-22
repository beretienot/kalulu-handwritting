import { useEffect, useRef, useState } from "react";
import type { LetterUnit } from "../content/types";
import { TracingCanvas } from "../canvas/TracingCanvas";
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

// Cuántos intentos fallidos seguidos de la misma repetición se toleran antes de mandar
// a practicar el trazo: no interrumpe apenas falla una vez, deja un par de reintentos
// libres primero.
const FAILS_BEFORE_PRACTICE = 3;

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
  // Cuántas veces seguidas falló la repetición activa (se resetea al pasar o al mandar
  // a practicar) — con estado alcanzaría, pero un ref evita depender del closure de
  // handleScored quedando desactualizado entre llamadas seguidas.
  const consecutiveFailsRef = useRef(0);

  const flatPassed = passed.flat();
  const nextFlatIndex = flatPassed.findIndex((done) => !done);
  const unlockedFlatIndex = nextFlatIndex === -1 ? flatPassed.length : nextFlatIndex;
  // Un solo canvas activo por vez (el de la repetición que sigue), en vez de uno por
  // cada repetición mostrado a la vez: eso obligaba a hacer scroll para ver la hoja
  // completa. Las demás repeticiones de cada letra/palabra se validan reusando ese
  // mismo canvas (se reinicia entre intento e intento), no viendo varios a la vez.
  const activeItemIndex = Math.min(Math.floor(unlockedFlatIndex / REQUIRED_REPETITIONS), items.length - 1);
  const currentRepIndex = unlockedFlatIndex % REQUIRED_REPETITIONS;

  useEffect(() => {
    playSound("Primero calcá la letra con el lápiz. Después escribila de memoria.");
  }, [unit]);

  async function handleScored(itemIndex: number, repIndex: number, score: number) {
    if (score < getDifficultySettings().passScore) {
      const item = items[itemIndex];
      if (!item.isWord) {
        consecutiveFailsRef.current += 1;
        // Recién al tercer fallo seguido manda a practicar — antes deja reintentar
        // libremente en el mismo canvas (la palabra ya no tiene una letra puntual a la
        // que mandar, así que ahí siempre deja reintentar sin este límite).
        if (consecutiveFailsRef.current >= FAILS_BEFORE_PRACTICE) {
          consecutiveFailsRef.current = 0;
          // Antes de mandarla a practicar, avisa que no salió y por qué (recordarle
          // que siga el orden de trazo aprendido) — así no es un salto de pantalla
          // sorpresivo.
          await playSound("Todavía no. Recordá seguir el orden de los trazos que aprendiste.");
          setPracticingChar(item.text);
        }
      }
      return;
    }
    consecutiveFailsRef.current = 0;
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

      {/* Un solo ítem a la vista por vez (texto plano, sin canvas): así en pantalla
          nunca hay más de un canvas de calcado — el de la tarjeta activa de abajo. */}
      <div className="writing-page__stepper">
        {items.map((item, i) => {
          const isDone = passed[i].every(Boolean);
          const isActive = i === activeItemIndex && !isDone;
          const status = isDone ? "done" : isActive ? "active" : "locked";
          return (
            <span className={`writing-stepper__item writing-stepper__item--${status}`} key={i}>
              {isDone ? "✓" : item.text}
            </span>
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
