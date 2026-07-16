const STORAGE_KEY = "kalulu-progress";

export type ExerciseKey = "lectura" | "escritura";

interface ProgressState {
  [unitId: string]: {
    lectura?: boolean;
    escritura?: boolean;
  };
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressState) : {};
  } catch {
    return {};
  }
}

function save(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function markCompleted(unitId: string, exercise: ExerciseKey) {
  const state = load();
  state[unitId] = { ...state[unitId], [exercise]: true };
  save(state);
}

export function isCompleted(unitId: string, exercise: ExerciseKey): boolean {
  return Boolean(load()[unitId]?.[exercise]);
}

export function isUnitDone(unitId: string): boolean {
  const unit = load()[unitId];
  return Boolean(unit?.lectura && unit?.escritura);
}
