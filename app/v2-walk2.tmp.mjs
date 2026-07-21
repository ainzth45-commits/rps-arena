import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
const problems = [];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
const errs = [];
p.on("pageerror", e => errs.push(String(e)));

async function shot(label) {
  await p.waitForTimeout(350);
  const m = await p.evaluate(() => ({ y: document.documentElement.scrollHeight - window.innerHeight, x: document.documentElement.scrollWidth - window.innerWidth }));
  const bad = m.y > 1 || m.x > 1;
  if (bad) problems.push(`${label}: overflow x=${m.x} y=${m.y}`);
  console.log(`${bad ? "❌" : "✅"} ${label}`);
  await p.screenshot({ path: `${S}/v2-${label}.png` });
}
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 260);

await p.goto("http://localhost:8903/", { waitUntil: "networkidle" });
await p.locator("button").first().click();
await p.waitForTimeout(2500);
await shot("02-home");
console.log("หน้าหลัก:", await txt());

// ลองหาปุ่มผู้เล่น
for (const label of ["ผู้เล่น", "จัดการผู้เล่น", "รายชื่อ"]) {
  const el = p.getByText(label, { exact: false }).first();
  if (await el.count()) { await el.click(); break; }
}
await shot("03-players");
console.log("หน้าผู้เล่น:", await txt());
console.log(problems.length ? `\n⚠️ ${problems.join("\n")}` : "\nไม่มี overflow");
console.log(errs.length ? `JS error: ${errs.slice(0,2).join(" | ")}` : "ไม่มี JS error");
await b.close();
