// เทสโหมดดวลนอกรอบ — เช็คว่าไม่แตะสตรีค ไม่เลื่อนตัวชี้ และบันทึก 3 แบบถูกต้อง
import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
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
await page.locator(".boot__logo-btn").click({ force: true });
await page.waitForTimeout(300);
await page.locator(".dock-btn[data-dock=players]").click();
for (const [c, n] of [["A101","แมวส้ม"],["B202","หัวหน้าทีม"]]) {
  const i=page.locator(".player-form__grid input");
  await i.nth(0).fill(c); await i.nth(1).fill(n);
  await page.getByText("เพิ่มผู้เล่น").click(); await page.waitForTimeout(100);
}
await page.getByText("← กลับ").click();
// ลงสังเวียนทั้งคู่
for (const n of ["แมวส้ม","หัวหน้าทีม"]) {
  await page.getByText("เริ่มรอบ").click();
  await page.locator(".player-card").filter({ hasText: n }).first().click();
  await page.getByText("เข้าสู่รอบของฉัน").click();
  await page.locator(".round-action[data-action=moveset]").click();
  await page.getByText("ยืนยันชุดมูฟ").click();
  await page.getByText("เรียบร้อย").click();
  await page.getByText("จบรอบ ส่ง iPad คืนซุป").click();
  await page.waitForTimeout(100);
}
// สร้างสตรีคให้แมวส้มก่อน 1 ครั้ง
await page.getByText("เริ่มรอบ").click();
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
await page.locator(".dock-btn[data-dock=offround]").click();
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

// ดวลนอกรอบต้องมีฉากปะทะ + เป่ายิ้งฉุบเหมือนดวลจริง
await page.waitForTimeout(900);
const hasVersus = await page.locator(".versus3__stage").count();
console.log(`ฉากปะทะในดวลนอกรอบ: ${hasVersus > 0 ? "ขึ้นแล้ว ✅" : "ไม่ขึ้น ❌"}`);
if (hasVersus === 0) problems.push("ดวลนอกรอบไม่มีฉากปะทะ");
await check("05b-offround-versus");
if (await page.locator(".versus3__skip").count() > 0) await page.locator(".versus3__skip").click();

await page.waitForSelector(".shoot2", { timeout: 10000 });
await page.waitForTimeout(2100); // ให้นับ เป่า-ยิ้ง-ฉุบ ครบแล้วเปิดมูฟ
const hasHands = await page.locator(".shoot2__hand").count();
console.log(`ฉากเป่ายิ้งฉุบเปิดมูฟ 2 ฝั่ง: ${hasHands} มือ (ต้อง 2)`);
if (hasHands !== 2) problems.push(`เปิดมูฟไม่ครบ 2 ฝั่ง (ได้ ${hasHands})`);
await check("05c-offround-shoot");

await page.waitForSelector(".round-action[data-action=save-main]", { timeout: 10000 });
await check("06-reveal");
await page.locator(".round-action[data-action=save-main]").click();
await page.waitForTimeout(400);
await check("07-back-home");

const after = await readState();
const catAfter = after.players.find(p => p.id === "A101");
const bossAfter = after.players.find(p => p.id === "B202");
console.log(`หลังดวลนอกรอบ: แมวส้ม streak=${catAfter.streak} score=${catAfter.mainScoreTenths} mainDuels=${catAfter.stats.asChallenger.mainDuels} | หัวหน้าทีม pointer=${bossAfter.pointerIndex}`);

if (catAfter.streak !== catBefore.streak) problems.push(`สตรีคเปลี่ยน! ${catBefore.streak} → ${catAfter.streak}`);
if (bossAfter.pointerIndex !== bossBefore.pointerIndex) problems.push(`ตัวชี้ขยับ! ${bossBefore.pointerIndex} → ${bossAfter.pointerIndex}`);
if (catAfter.mainScoreTenths !== catBefore.mainScoreTenths + 20) problems.push(`คะแนนไม่ตรง เรทเบาชนะต้อง +2.0 (ได้ ${catAfter.mainScoreTenths - catBefore.mainScoreTenths} tenths)`);
if (catAfter.stats.asChallenger.mainDuels !== catBefore.stats.asChallenger.mainDuels) problems.push("mainDuels เพิ่ม! ไม่ควรนับ");
if (catAfter.stats.asChallenger.win !== catBefore.stats.asChallenger.win + 1) problems.push("สถิติชนะไม่ถูกบันทึก");

console.log(problems.length ? `\n⚠️ ปัญหา:\n${problems.join("\n")}` : "\n🎉 ดวลนอกรอบทำงานถูกต้องครบทุกข้อ");
await b.close();
