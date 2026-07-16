import { segmentIntoPhonemes } from "../audio/phonemes";
import "./HighlightedText.css";

interface HighlightedTextProps {
  text: string;
  activeIndex: number | null;
}

export function HighlightedText({ text, activeIndex }: HighlightedTextProps) {
  return (
    <>
      {segmentIntoPhonemes(text).map((phoneme, i) => (
        <span key={i} className={i === activeIndex ? "highlighted-text__char highlighted-text__char--active" : "highlighted-text__char"}>
          {phoneme}
        </span>
      ))}
    </>
  );
}
