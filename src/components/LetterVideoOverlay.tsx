import { useEffect, useRef } from "react";
import "./LetterVideoOverlay.css";

interface LetterVideoOverlayProps {
  videoUrl: string;
  onClose: () => void;
}

/** Safari/iOS no soporta la Fullscreen API estándar en un <video>: tiene su propio
 *  mecanismo nativo (webkitEnterFullscreen), sin document.fullscreenElement. */
type IOSVideoElement = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function LetterVideoOverlay({ videoUrl, onClose }: LetterVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current as IOSVideoElement | null;
    if (!video) return;
    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    } else {
      video.requestFullscreen?.().catch(() => {
        // Algunos navegadores/dispositivos pueden rechazar el pedido de pantalla
        // completa (por ejemplo si no viene directo de un gesto del usuario); el
        // video sigue reproduciéndose igual dentro del overlay a pantalla parcial.
      });
    }
    return () => {
      if (document.fullscreenElement === video) document.exitFullscreen().catch(() => {});
    };
  }, [videoUrl]);

  return (
    <div className="letter-video-overlay" onClick={onClose}>
      <video
        ref={videoRef}
        key={videoUrl}
        className="letter-video-overlay__video"
        src={videoUrl}
        autoPlay
        controls
        onClick={(e) => e.stopPropagation()}
        onEnded={onClose}
      />
      <button className="letter-video-overlay__close" onClick={onClose} aria-label="Cerrar video">
        ✕
      </button>
    </div>
  );
}
