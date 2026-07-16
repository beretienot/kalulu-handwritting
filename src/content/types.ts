export interface LetterUnit {
  /** Identificador corto, único, usado también como base para nombres de audio (ej: "m") */
  id: string;
  /** Posición en la secuencia del Cuadernillo 1, empezando en 1 */
  order: number;
  /** Formas del grafema tal como aparecen en el título de la página de lectura, ej: ["M", "m"] o ["A", "a", "Á", "á"] */
  grafemas: string[];
  /** Si el fonema todavía no tiene grabación real y usa el fallback de speechSynthesis (que dice el nombre de letra, no el sonido) */
  fonemaEsPlaceholder: boolean;
  lectura: {
    /** Grilla de sílabas/letras para discriminación visual, tal como aparece en el cuadernillo (filas de tokens) */
    grid: string[][];
    /** Lista de palabras de lectura (puede estar vacía en la primera unidad) */
    palabras: string[];
    /** Oraciones que solo usan letras ya enseñadas hasta esta unidad */
    oraciones: string[];
  };
  escritura: {
    /** Formas a calcar, en el orden del cuadernillo (normalmente coincide con `grafemas`) */
    trazos: string[];
    /** Palabra(s)/sílaba(s) a calcar al final de la página de escritura (puede estar vacío) */
    palabraFinal: string[];
  };
}
