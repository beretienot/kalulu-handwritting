import { segmentIntoPhonemes } from "./phonemes";

const fileAvailability = new Map<string, boolean>();
let cachedSpanishVoice: SpeechSynthesisVoice | null = null;

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "es-AR") ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("es")) ??
    null
  );
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedSpanishVoice = pickSpanishVoice();
  };
}

async function audioFileExists(url: string): Promise<boolean> {
  if (fileAvailability.has(url)) return fileAvailability.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD" });
    // El servidor (Vite en dev, o el hosting SPA en prod) puede responder 200 con el
    // index.html para cualquier ruta inexistente en vez de un 404 real, así que un
    // content-type que no sea de audio significa "no existe" aunque res.ok sea true.
    const contentType = res.headers.get("content-type") ?? "";
    const exists = res.ok && contentType.startsWith("audio");
    fileAvailability.set(url, exists);
    return exists;
  } catch {
    fileAvailability.set(url, false);
    return false;
  }
}

function speakWithSynthesis(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-AR";
  utterance.rate = 0.85;
  utterance.volume = 1; // máximo permitido por la Web Speech API
  const voice = cachedSpanishVoice ?? pickSpanishVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/**
 * Reproduce `text`. Si existe un archivo grabado en public/audio/{audioId}.mp3 lo usa;
 * si no, cae a Web Speech API. Para fonemas aislados la síntesis dice el NOMBRE de la
 * letra (ej. "eme"), no el sonido /m/ — ver fonemaEsPlaceholder en los datos de contenido.
 */
export async function playSound(text: string, audioId?: string): Promise<void> {
  if (audioId) {
    const url = `/audio/${audioId}.mp3`;
    if (await audioFileExists(url)) {
      try {
        const audio = new Audio(url);
        audio.volume = 1;
        await audio.play();
        return;
      } catch {
        // Cae a la síntesis de voz si el archivo real falla al reproducirse.
      }
    }
  }
  speakWithSynthesis(text);
}

const CELEBRATION_PHRASES = ["¡Muy bien!", "¡Excelente!", "¡Genial!", "¡Perfecto!", "¡Así se hace!", "¡Bravo!"];

/** Felicita al alumno en voz alta con una frase al azar (ej. al aprobar un trazo). */
export function playCelebration(): void {
  const phrase = CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)];
  speakWithSynthesis(phrase);
}

// No tenemos datos reales de alineación fonema-audio (ni de los archivos grabados ni
// de la síntesis de voz), así que aproximamos el resaltado avanzando fonema por fonema
// (no letra por letra: los dígrafos como "ch", "ll", "rr" cuentan como uno solo) a un
// ritmo fijo mientras se reproduce el sonido.
const HIGHLIGHT_MS_PER_PHONEME = 220;

/**
 * Igual que playSound, pero además va llamando a `onHighlight(phonemeIndex)` con el
 * índice del fonema (ver segmentIntoPhonemes) que "se está pronunciando" en ese
 * momento, y `onEnd()` al terminar. Devuelve una función para cancelar el resaltado
 * (no corta el audio en curso).
 */
export function playSoundWithHighlight(
  text: string,
  audioId: string | undefined,
  onHighlight: (phonemeIndex: number) => void,
  onEnd: () => void
): () => void {
  playSound(text, audioId).catch(() => {});

  const phonemeCount = segmentIntoPhonemes(text).length;
  let index = 0;
  onHighlight(index);
  const intervalId = window.setInterval(() => {
    index += 1;
    if (index >= phonemeCount) {
      window.clearInterval(intervalId);
      onEnd();
      return;
    }
    onHighlight(index);
  }, HIGHLIGHT_MS_PER_PHONEME);

  return () => window.clearInterval(intervalId);
}
