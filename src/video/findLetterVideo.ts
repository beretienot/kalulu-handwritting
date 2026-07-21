import { letterFonemaKeys } from "../audio/fonemaKey";

// Videos de demostración por letra, mismo esquema de nombre de archivo que las
// grabaciones de audio en src/audio/fonemas (ver playSound.ts): el nombre exacto (sin
// extensión) es la clave por la que se busca.
const videoModules = import.meta.glob<string>("./*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});
const videoUrlByKey = new Map<string, string>(
  Object.entries(videoModules).map(([path, url]) => [path.slice("./".length, -".mp4".length).toLowerCase(), url])
);

/** Video de demostración para la letra `letter` (o su fonemaRecordingKey), si existe. */
export function findLetterVideoUrl(letter: string, recordingKey?: string): string | undefined {
  for (const key of letterFonemaKeys(letter, recordingKey)) {
    const url = videoUrlByKey.get(key);
    if (url) return url;
  }
  return undefined;
}
