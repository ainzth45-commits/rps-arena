import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base ต้องเป็น /rps-arena/ ตอน build เพื่อ deploy GitHub Pages
// แต่ตอน dev ใช้ / ปกติ (บทเรียนเกมที่ 1: vite preview ใช้ base "/" ไม่ตรง build → เทส local ให้ใช้ npm run dev)
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/rps-arena/" : "/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
  },
}));
