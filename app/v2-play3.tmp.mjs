import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
const txt = async () => (await p.evaluate(() => document.body.innerText)).replace(/\n+/g," | ").slice(0,300);
const shot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${S}/v2-${n}.png` });
  const m = await p.evaluate(() => ({y: document.documentElement.scrollHeight - window.innerHeight}));
  console.log(`${m.y>1?"❌":"✅"} ${n}`); };

await p.goto("http://localhost:8903/", { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await p.locator("button").first().click();
await p.waitForTimeout(2000);
await p.getByText("ผู้เล่น", { exact: false }).first().click();
for (const n of ["แมวส้ม","หัวหน้าทีม"]) {
  await p.locator("input").nth(0).fill(n);
  await p.getByRole("button", { name: /เพิ่ม/ }).first().click();
  await p.waitForTimeout(180);
}
// ตั้งชุดมูฟให้ทั้งคู่
for (const n of ["แมวส้ม","หัวหน้าทีม"]) {
  await p.getByText("เปิดรอบ", { exact: false }).first().click();
  await p.getByRole("button", { name: new RegExp(n) }).first().click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: "ยืนยันชุดมูฟ" }).click();
  await p.waitForTimeout(400);
  console.log(`ตั้งมูฟ ${n} แล้ว:`, (await txt()).slice(150, 300));
  const close = p.getByRole("button", { name: /คนถัดไปถือเครื่องแล้ว/ }).first();
  if (await close.count()) { await close.click(); await p.waitForTimeout(300); }
}
await shot("07-after-setup");
// ดวลจริง
await p.getByText("เปิดรอบ", { exact: false }).first().click();
await p.getByRole("button", { name: /แมวส้ม/ }).first().click();
await p.waitForTimeout(400);
await shot("08-round-menu");
console.log("เมนูรอบ:", await txt());
console.log(errs.length ? `JS error: ${errs.slice(0,2).join(" | ")}` : "ไม่มี JS error");
await b.close();
