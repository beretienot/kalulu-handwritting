export interface LetterUnit {
  /** Identificador corto, único, usado también como base para nombres de audio (ej: "m") */
  id: string;
  /** Posición en la secuencia del Cuadernillo 1, empezando en 1 */
  order: number;
  /** Formas del grafema tal como aparecen en el título de la página de lectura, ej: ["M", "m"] o ["A", "a", "Á", "á"] */
  grafemas: string[];
  /** Si el fonema todavía no tiene grabación real y usa el fallback de speechSynthesis (que dice el nombre de letra, no el sonido) */
  fonemaEsPlaceholder: boolean;
  /** Texto a pronunciar con TTS como aproximación del fonema cuando no hay grabación real.
   *  Para vocales es la propia vocal; para consonantes una sílaba corta (ej: "ma", "sa") que
   *  empieza con el fonema para que el alumno lo escuche aunque no sea el sonido aislado. */
  fonemaFallback: string;
  /** Nombre exacto (sin ".mp3") de la grabación a usar para el sonido de la letra, para
   *  los casos en que el grafema tiene más de un sonido posible grabado (ej: "y-i" en vez
   *  de "y-L" para la Y vocálica de "hoy"/"soy"). Si no se especifica, se prueba el propio
   *  grafema y la variante "letra-letra" (ver playLetterSound). */
  fonemaRecordingKey?: string;
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
