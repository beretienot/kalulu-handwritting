import { useState } from "react";
import { letterUnits } from "../content/letterUnits";
import { isCompleted } from "../lib/progress";
import { DIFFICULTY_LEVELS, type DifficultyLevel, getDifficultyLevel, setDifficultyLevel } from "../lib/difficulty";
import "./Home.css";

interface HomeProps {
  onSelectUnit: (unitId: string) => void;
}

export function Home({ onSelectUnit }: HomeProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => getDifficultyLevel());

  function handleDifficultyChange(level: DifficultyLevel) {
    setDifficultyLevel(level);
    setDifficulty(level);
  }

  return (
    <div className="home">
      <h1 className="home__title">Kalulu</h1>
      <p className="home__subtitle">Elegí una letra para empezar</p>

      <div className="home__difficulty">
        <span className="home__difficulty-label">Exigencia del trazado:</span>
        <div className="home__difficulty-options">
          {(Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[]).map((level) => (
            <button
              key={level}
              className={`home__difficulty-option ${difficulty === level ? "home__difficulty-option--active" : ""}`}
              onClick={() => handleDifficultyChange(level)}
            >
              {DIFFICULTY_LEVELS[level].label}
              <small>{DIFFICULTY_LEVELS[level].ageHint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="home__grid">
        {letterUnits.map((unit) => {
          const lecturaOk = isCompleted(unit.id, "lectura");
          const escrituraOk = isCompleted(unit.id, "escritura");
          return (
            <button key={unit.id} className="home__unit" onClick={() => onSelectUnit(unit.id)}>
              <span className="home__unit-glyph">{unit.grafemas[0]}{unit.grafemas[1] ?? ""}</span>
              <span className="home__unit-status">
                {lecturaOk ? "📖" : "⚪"} {escrituraOk ? "✏️" : "⚪"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
