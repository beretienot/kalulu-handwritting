import { useState } from "react";
import { letterUnits } from "./content/letterUnits";
import { Home } from "./pages/Home";
import { ReadingPage } from "./pages/ReadingPage";
import { WritingPage } from "./pages/WritingPage";

type View = { screen: "home" } | { screen: "lectura" | "escritura"; unitId: string };

function App() {
  const [view, setView] = useState<View>({ screen: "home" });

  if (view.screen === "lectura") {
    const unit = letterUnits.find((u) => u.id === view.unitId);
    if (!unit) return null;
    return (
      <ReadingPage
        unit={unit}
        onBack={() => setView({ screen: "home" })}
        onContinue={() => setView({ screen: "escritura", unitId: unit.id })}
      />
    );
  }

  if (view.screen === "escritura") {
    const unit = letterUnits.find((u) => u.id === view.unitId);
    if (!unit) return null;
    return (
      <WritingPage
        unit={unit}
        onBack={() => setView({ screen: "lectura", unitId: unit.id })}
        onFinish={() => setView({ screen: "home" })}
      />
    );
  }

  return <Home onSelectUnit={(unitId) => setView({ screen: "lectura", unitId })} />;
}

export default App;
