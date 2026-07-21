import { segmentIntoPhonemes } from "./phonemes";
import { letterFonemaKeys } from "./fonemaKey";

// Grabaciones reales de letras/sílabas/palabras. El nombre de cada archivo es el texto
// exacto (en minúscula) que pronuncia, ej. "fonemas/sa.mp3" dice el sonido /sa/. Se
// buscan por texto en vez de por un id para poder reutilizarlas en cualquier lugar
// donde aparezca ese mismo texto (grafemas, grilla de lectura, palabras).
const fonemaModules = import.meta.glob<string>("./fonemas/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});
const fonemaUrlByText = new Map<string, string>(
  Object.entries(fonemaModules).map(([path, url]) => [path.slice("./fonemas/".length, -".mp3".length), url])
);

function findRecording(text: string): string | undefined {
  return fonemaUrlByText.get(text.toLowerCase());
}

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

// Resuelve cuando el audio termina de sonar (no cuando arranca), para poder encadenar
// sonidos esperando el anterior en vez de adivinar su duración con un setTimeout.
function playRecording(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.volume = 1;
    audio.addEventListener("ended", () => resolve(true));
    audio.addEventListener("error", () => resolve(false));
    audio.play().catch(() => resolve(false));
  });
}

// Igual que playRecording: resuelve cuando la síntesis termina de hablar, no al iniciarla.
function speakWithSynthesis(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    utterance.rate = 0.85;
    utterance.volume = 1; // máximo permitido por la Web Speech API
    const voice = cachedSpanishVoice ?? pickSpanishVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/** Pronuncia `text` con Web Speech API (grilla de lectura, palabras, oraciones, instrucciones). */
export async function playSound(text: string): Promise<void> {
  await speakWithSynthesis(text);
}

/**
 * Sonido de una letra aislada: busca primero `recordingKey` (para grafemas con más de
 * un sonido posible grabado, ej. "y-i" en vez de "y-L" — ver fonemaRecordingKey en el
 * contenido), después una grabación real para `text` (el grafema, ej. "a.mp3"), después
 * la variante "letra-letra" sin acento (ej. "m-m.mp3", o "á-a.mp3" para la tilde, como
 * están grabados los fonemas que no se pueden aislar en un solo archivo corto), después
 * para `fallbackText` (si vino), y si ninguna existe cae a Web Speech API. La síntesis
 * de fonemas aislados dice el NOMBRE de la letra (ej. "eme"), no el sonido /m/, por eso
 * habla `fallbackText` en vez de `text` como último recurso: `fallbackText` debe ser
 * una aproximación pronunciable del sonido (ver fonemaFallback en el contenido).
 * Devuelve una promesa que resuelve cuando el sonido termina de reproducirse.
 */
export async function playLetterSound(text: string, fallbackText?: string, recordingKey?: string): Promise<void> {
  const recordingUrl =
    letterFonemaKeys(text, recordingKey)
      .map(findRecording)
      .find((url) => url !== undefined) ?? (fallbackText ? findRecording(fallbackText) : undefined);
  if (recordingUrl && (await playRecording(recordingUrl))) return;
  await speakWithSynthesis(fallbackText ?? text);
}

const CELEBRATION_PHRASES = ["¡Muy bien!", "¡Excelente!", "¡Genial!", "¡Perfecto!", "¡Así se hace!", "¡Bravo!"];

/** Felicita al alumno en voz alta con una frase al azar (ej. al aprobar un trazo). */
export async function playCelebration(): Promise<void> {
  const phrase = CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)];
  await speakWithSynthesis(phrase);
}

// No tenemos datos reales de alineación fonema-audio (ni de los archivos grabados ni
// de la síntesis de voz), así que aproximamos el resaltado avanzando fonema por fonema
// (no letra por letra: los dígrafos como "ch", "ll", "rr" cuentan como uno solo) a un
// ritmo fijo mientras se reproduce el sonido.
const HIGHLIGHT_MS_PER_PHONEME = 220;

/**
 * Igual que playSound (o playLetterSound si viene `fallbackText`, para el botón de
 * letra aislada), pero además va llamando a `onHighlight(phonemeIndex)` con el índice
 * del fonema (ver segmentIntoPhonemes) que "se está pronunciando" en ese momento, y
 * `onEnd()` al terminar. Devuelve una función para cancelar el resaltado (no corta el
 * audio en curso). El resaltado siempre se basa en `text` (lo que se muestra en
 * pantalla), aunque la síntesis hable `fallbackText` en su lugar.
 */
export function playSoundWithHighlight(
  text: string,
  onHighlight: (phonemeIndex: number) => void,
  onEnd: () => void,
  fallbackText?: string,
  recordingKey?: string
): () => void {
  (fallbackText !== undefined ? playLetterSound(text, fallbackText, recordingKey) : playSound(text)).catch(() => {});

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
