// "á" -> "a", "é" -> "e", etc. Los fonemas de vocales acentuadas están grabados como
// "á-a" (la tilde solo marca dónde cae el golpe de voz, el sonido es el mismo).
export function stripAccent(letter: string): string {
  return letter.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Claves candidatas, en orden de preferencia, para buscar la grabación/video de una
 * letra aislada: la clave explícita del contenido (`recordingKey`, para grafemas con
 * más de un sonido posible, ej. "y-i" en vez de "y-L" — ver fonemaRecordingKey), la
 * letra misma (ej. "a"), y la variante "letra-letra" sin acento (ej. "m-m", o "á-a"
 * para la tilde) — así están nombrados los archivos de los fonemas que no se pueden
 * aislar en un solo clip corto. Se usa igual para audio (playSound.ts) y video
 * (findLetterVideo.ts): ambos comparten el mismo nombre de archivo por letra.
 */
export function letterFonemaKeys(letter: string, recordingKey?: string): string[] {
  const l = letter.toLowerCase();
  const keys = [l, `${l}-${stripAccent(l)}`];
  if (recordingKey) keys.unshift(recordingKey);
  return keys;
}
