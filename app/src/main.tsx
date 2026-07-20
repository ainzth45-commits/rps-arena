import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { GameStoreProvider } from "./state/useGameStore";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameStoreProvider>
      <App />
    </GameStoreProvider>
  </StrictMode>,
);
