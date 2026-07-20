// เทสโหมดดวลนอกรอบ — เช็คว่าไม่แตะสตรีค ไม่เลื่อนตัวชี้ และบันทึก 3 แบบถูกต้อง
import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/c507c42d-8d4e-4771-a216-9f8dff632957/scratchpad";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1180, height: 820 } });
const problems = [];
async function check(label) {
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => ({
    y: document.documentElement.scrollHeight - window.innerHeight,
    x: document.documentElement.scrollWidth - window.innerWidth,
  }));
  if (m.y > 1 || m.x > 1) problems.push(`${label}: overflow x=${m.x} y=${m.y}`);
  console.log(`${m.y > 1 || m.x > 1 ? "❌" : "✅"} ${label}`);
  await page.screenshot({ path: `${S}/off-${label}.png` });
}
const readState = () => page.evaluate(() => JSON.parse(localStorage.getItem("rps-arena/save-v1")));

await page.goto("http://localhost:8902/rps-arena/", { waitUntil: "networkidle" });
await page.getByText("ผู้เล่น", { exact: true }).click();
for (const [c, n] of [["A101","แมวส้ม"],["B202","หัวหน้าทีม"]]) {
  const i = page.locator(".form-row input");
  await i.nth(0).fill(c); await i.nth(1).fill(n);
  await page.getByText("เพิ่มผู้เล่น").click(); await page.waitForTimeout(100);
}
await page.getByText("← กลับ").click();
// ลงสังเวียนทั้งคู่
for (const n of ["แมวส้ม","หัวหน้าทีม"]) {
  await page.getByText("จ่าย 3 เหรียญ เริ่มรอบ").click();
  await page.locator(".player-card").filter({ hasText: n }).first().click();
  await page.getByText("เข้าสู่รอบของฉัน").click();
  await page.locator(".round-action[data-action=moveset]").click();
  await page.getByText("ยืนยันชุดมูฟ").click();
  await page.getByText("เรียบร้อย").click();
  await page.getByText("จบรอบ ส่ง iPad คืนซุป").click();
  await page.waitForTimeout(100);
}
// สร้างสตรีคให้แมวส้มก่อน 1 ครั้ง
await page.getByText("จ่าย 3 เหรียญ เริ่มรอบ").click();
await page.locator(".player-card").filter({ hasText: "แมวส้ม" }).first().click();
await page.getByText("เข้าสู่รอบของฉัน").click();
await page.locator(".round-action[data-action=duel]").click();
await page.locator(".player-card").filter({ hasText: "หัวหน้าทีม" }).first().click();
await page.waitForTimeout(2600);
await page.locator(".move-pick__btn").nth(2).click();       // กระดาษ ชนะ ค้อน
await page.getByText("ยืนยัน — ลุยเลย").click();
await page.waitForTimeout(4200);
await page.getByText("จบรอบ").click();
await page.waitForTimeout(300);

const before = await readState();
const catBefore = before.players.find(p => p.id === "A101");
const bossBefore = before.players.find(p => p.id === "B202");
console.log(`ก่อนดวลนอกรอบ: แมวส้ม streak=${catBefore.streak} score=${catBefore.mainScoreTenths} | หัวหน้าทีม pointer=${bossBefore.pointerIndex}`);

// ดวลนอกรอบ
await page.getByText("ดวลนอกรอบ", { exact: true }).click();
await check("01-pickA");
await page.locator(".player-card").filter({ hasText: "แมวส้ม" }).first().click();
await check("02-pickB");
await page.locator(".player-card").filter({ hasText: "หัวหน้าทีม" }).first().click();
await check("03-moveA");
await page.locator(".move-pick__btn").nth(0).click();       // แมวส้มออกค้อน
await check("04-handoff");
const leak = await page.locator(".panel").textContent();
if (/ค้อน|กรรไกร|กระดาษ/.test(leak)) problems.push("จอส่งเครื่องหลุดมูฟของคนแรก!");
await page.getByText("พร้อมแล้ว").click();
await check("05-moveB");
await page.locator(".move-pick__btn").nth(1).click();       // หัวหน้าทีมออกกรรไกร → แมวส้มชนะ
await check("06-reveal");
await page.locator(".round-action[data-action=save-main]").click();
await page.waitForTimeout(400);
await check("07-back-home");

const after = await readState();
const catAfter = after.players.find(p => p.id === "A101");
const bossAfter = after.players.find(p => p.id === "B202");
console.log(`หลังดวลนอกรอบ: แมวส้ม streak=${catAfter.streak} score=${catAfter.mainScoreTenths} mainDuels=${catAfter.stats.asPlayer.mainDuels} | หัวหน้าทีม pointer=${bossAfter.pointerIndex}`);

if (catAfter.streak !== catBefore.streak) problems.push(`สตรีคเปลี่ยน! ${catBefore.streak} → ${catAfter.streak}`);
if (bossAfter.pointerIndex !== bossBefore.pointerIndex) problems.push(`ตัวชี้ขยับ! ${bossBefore.pointerIndex} → ${bossAfter.pointerIndex}`);
if (catAfter.mainScoreTenths !== catBefore.mainScoreTenths + 20) problems.push(`คะแนนไม่ตรง เรทเบาชนะต้อง +2.0 (ได้ ${catAfter.mainScoreTenths - catBefore.mainScoreTenths} tenths)`);
if (catAfter.stats.asPlayer.mainDuels !== catBefore.stats.asPlayer.mainDuels) problems.push("mainDuels เพิ่ม! ไม่ควรนับ");
if (catAfter.stats.asPlayer.win !== catBefore.stats.asPlayer.win + 1) problems.push("สถิติชนะไม่ถูกบันทึก");

console.log(problems.length ? `\n⚠️ ปัญหา:\n${problems.join("\n")}` : "\n🎉 ดวลนอกรอบทำงานถูกต้องครบทุกข้อ");
await b.close();
