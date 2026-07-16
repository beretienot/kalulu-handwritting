// Segmentación aproximada de fonemas para el español: la mayoría de las letras son
// un fonema, pero algunos dígrafos representan un solo sonido y deben resaltarse juntos.
const DIGRAPHS = ["rr", "ll", "ch"];

export function segmentIntoPhonemes(text: string): string[] {
  const segments: string[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const two = lower.slice(i, i + 2);
    const isSilentUGroup = (two === "qu" || two === "gu") && (lower[i + 2] === "e" || lower[i + 2] === "i");
    if (DIGRAPHS.includes(two) || isSilentUGroup) {
      segments.push(text.slice(i, i + 2));
      i += 2;
      continue;
    }
    segments.push(text[i]);
    i += 1;
  }
  return segments;
}
