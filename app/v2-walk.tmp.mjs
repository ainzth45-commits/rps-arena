import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
const problems = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", e => errors.push(String(e)));
p.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

async function shot(label) {
  await p.waitForTimeout(300);
  const m = await p.evaluate(() => ({
    y: document.documentElement.scrollHeight - window.innerHeight,
    x: document.documentElement.scrollWidth - window.innerWidth,
  }));
  const bad = m.y > 1 || m.x > 1;
  if (bad) problems.push(`${label}: overflow x=${m.x} y=${m.y}`);
  console.log(`${bad ? "❌" : "✅"} ${label}${bad ? ` (x=${m.x} y=${m.y})` : ""}`);
  await p.screenshot({ path: `${S}/v2-${label}.png` });
}

await p.goto("http://localhost:8903/", { waitUntil: "networkidle" });
await shot("01-boot");
const bodyText = await p.evaluate(() => document.body.innerText.slice(0, 400));
console.log("--- ข้อความหน้าแรก ---\n" + bodyText + "\n---");
await b.close();
console.log(errors.length ? `\n⚠️ error ในหน้า: ${errors.slice(0,3).join(" | ")}` : "\nไม่มี error ในคอนโซล");
