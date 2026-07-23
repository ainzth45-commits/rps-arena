import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { TvDisplayApp } from "./tv/TvDisplayApp";
import { GameStoreProvider } from "./state/useGameStore";
import "./styles/global.css";

// ?tv (หรือ #tv) = จอ display สำหรับ TV · ไม่มี ?tv = เกมปกติบน iPad
// จอ TV ไม่ต้องใช้ game store — รับ TvView จากเน็ตมาเรนเดอร์อย่างเดียว
const params = new URLSearchParams(window.location.search);
const isTv = params.has("tv") || window.location.hash.replace("#", "") === "tv";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isTv ? (
      <TvDisplayApp />
    ) : (
      <GameStoreProvider>
        <App />
      </GameStoreProvider>
    )}
  </StrictMode>,
);
