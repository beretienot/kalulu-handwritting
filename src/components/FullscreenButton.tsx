import { useEffect, useState } from "react";
import "./FullscreenButton.css";

const SUPPORTS_FULLSCREEN = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Algunos navegadores/dispositivos pueden rechazar el pedido de pantalla completa.
    }
  }

  if (!SUPPORTS_FULLSCREEN) return null;

  return (
    <button
      className="fullscreen-button"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
    >
      {isFullscreen ? "⤡" : "⤢"}
    </button>
  );
}
