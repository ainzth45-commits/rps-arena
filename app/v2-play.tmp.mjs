import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 300);

await p.goto("http://localhost:8903/", { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await p.locator("button").first().click();
await p.waitForTimeout(2200);

// เพิ่มผู้เล่น 2 คน
await p.getByText("ผู้เล่น", { exact: false }).first().click();
await p.waitForTimeout(300);
const inputs = p.locator("input");
console.log("จำนวน input ในหน้าผู้เล่น:", await inputs.count());
for (const [code, name] of [["A101","แมวส้ม"],["B202","หัวหน้าทีม"]]) {
  const n = await inputs.count();
  await inputs.nth(0).fill(code);
  if (n > 1) await inputs.nth(1).fill(name);
  await p.getByRole("button", { name: /เพิ่ม/ }).first().click();
  await p.waitForTimeout(250);
}
await p.screenshot({ path: `${S}/v2-04-players-added.png` });
console.log("หลังเพิ่มผู้เล่น:", await txt());
console.log(errs.length ? `JS error: ${errs.slice(0,2).join(" | ")}` : "ไม่มี JS error");
await b.close();
