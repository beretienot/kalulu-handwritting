export type DifficultyLevel = "inicial" | "intermedio" | "avanzado";

interface DifficultySettings {
  label: string;
  ageHint: string;
  /** Puntaje mínimo (0-100) de similitud de forma ($P) para aprobar una repetición. */
  passScore: number;
}

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultySettings> = {
  inicial: { label: "Inicial", ageHint: "3-5 años", passScore: 55 },
  intermedio: { label: "Intermedio", ageHint: "5-6 años", passScore: 68 },
  avanzado: { label: "Avanzado", ageHint: "6+ años", passScore: 78 },
};

const STORAGE_KEY = "kalulu-difficulty";
const DEFAULT_LEVEL: DifficultyLevel = "intermedio";

export function getDifficultyLevel(): DifficultyLevel {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "inicial" || stored === "intermedio" || stored === "avanzado") return stored;
  return DEFAULT_LEVEL;
}

export function setDifficultyLevel(level: DifficultyLevel): void {
  localStorage.setItem(STORAGE_KEY, level);
}

export function getDifficultySettings(): DifficultySettings {
  return DIFFICULTY_LEVELS[getDifficultyLevel()];
}
