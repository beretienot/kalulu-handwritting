export type DifficultyLevel = "inicial" | "intermedio" | "avanzado";

interface DifficultySettings {
  label: string;
  ageHint: string;
  /** Tolerancia en píxeles: qué tan cerca de la letra debe caer el trazo para contar. */
  tolerancePx: number;
  /** Puntaje mínimo (0-100) para aprobar una repetición. */
  passScore: number;
  /** Cuánto penaliza la tinta que quedó lejos de la letra (0-1). */
  strayWeight: number;
}

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultySettings> = {
  inicial: { label: "Inicial", ageHint: "3-5 años", tolerancePx: 17, passScore: 40, strayWeight: 0.35 },
  intermedio: { label: "Intermedio", ageHint: "5-6 años", tolerancePx: 14, passScore: 58, strayWeight: 0.5 },
  avanzado: { label: "Avanzado", ageHint: "6+ años", tolerancePx: 9, passScore: 75, strayWeight: 0.65 },
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
