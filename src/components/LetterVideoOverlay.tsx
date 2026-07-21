import "./LetterVideoOverlay.css";

interface LetterVideoOverlayProps {
  videoUrl: string;
  onClose: () => void;
}

export function LetterVideoOverlay({ videoUrl, onClose }: LetterVideoOverlayProps) {
  return (
    <div className="letter-video-overlay" onClick={onClose}>
      <video
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
