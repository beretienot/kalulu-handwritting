import { useState } from "react";
import { letterUnits } from "./content/letterUnits";
import { Home } from "./pages/Home";
import { ReadingPage } from "./pages/ReadingPage";
import { StrokeOrderPage } from "./pages/StrokeOrderPage";
import { WritingPage } from "./pages/WritingPage";
import { FullscreenButton } from "./components/FullscreenButton";

type View = { screen: "home" } | { screen: "lectura" | "trazado" | "escritura"; unitId: string };

function App() {
  const [view, setView] = useState<View>({ screen: "home" });

  let screen;
  if (view.screen === "lectura") {
    const unit = letterUnits.find((u) => u.id === view.unitId);
    screen = unit ? (
      <ReadingPage
        unit={unit}
        onBack={() => setView({ screen: "home" })}
        onContinue={() => setView({ screen: "trazado", unitId: unit.id })}
      />
    ) : null;
  } else if (view.screen === "trazado") {
    const unit = letterUnits.find((u) => u.id === view.unitId);
    screen = unit ? (
      <StrokeOrderPage
        unit={unit}
        onBack={() => setView({ screen: "lectura", unitId: unit.id })}
        onContinue={() => setView({ screen: "escritura", unitId: unit.id })}
      />
    ) : null;
  } else if (view.screen === "escritura") {
    const unit = letterUnits.find((u) => u.id === view.unitId);
    screen = unit ? (
      <WritingPage
        unit={unit}
        onBack={() => setView({ screen: "lectura", unitId: unit.id })}
        onFinish={() => setView({ screen: "home" })}
      />
    ) : null;
  } else {
    screen = <Home onSelectUnit={(unitId) => setView({ screen: "lectura", unitId })} />;
  }

  return (
    <>
      {screen}
      <FullscreenButton />
    </>
  );
}

export default App;
