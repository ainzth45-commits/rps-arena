// เดินทั้ง flow ของเกมที่ 3 บนจอ iPad Air 5 landscape แล้ววัด overflow ทุกหน้า
import { chromium } from "playwright";

const URL = "http://localhost:8902/rps-arena/";
const SHOTS = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/c507c42d-8d4e-4771-a216-9f8dff632957/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const problems = [];

async function check(label) {
  await page.waitForTimeout(350);
  const m = await page.evaluate(() => ({
    scrollX: document.documentElement.scrollWidth - window.innerWidth,
    scrollY: document.documentElement.scrollHeight - window.innerHeight,
    frameH: document.querySelector(".app-frame")?.getBoundingClientRect().height ?? 0,
    vh: window.innerHeight,
  }));
  const bad = m.scrollY > 1 || m.scrollX > 1;
  if (bad) problems.push(`${label}: overflow x=${m.scrollX} y=${m.scrollY}`);
  console.log(`${bad ? "❌" : "✅"} ${label} — overflow x=${m.scrollX} y=${m.scrollY} · frame=${Math.round(m.frameH)}/${m.vh}`);
  await page.screenshot({ path: `${SHOTS}/g3-${label}.png` });
}

await page.goto(URL, { waitUntil: "networkidle" });
await check("00-boot");
await page.locator(".boot__logo-btn").click({ force: true });
await page.waitForTimeout(300);
await check("01-home-empty");

// ลงทะเบียนผู้เล่น 4 คน
await page.locator(".chip-btn", { hasText: "ผู้เล่น" }).first().click();
await check("02-players");
const codes = [["A101", "แมวส้ม"], ["B202", "หัวหน้าทีม"], ["C303", "น้องใหม่"], ["D404", "เซลส์เทพ"]];
for (const [code, name] of codes) {
  const inputs = page.locator(".form-row input");
  await inputs.nth(0).fill(code);
  await inputs.nth(1).fill(name);
  await page.getByText("เพิ่มผู้เล่น").click();
  await page.waitForTimeout(120);
}
await check("03-players-filled");
await page.getByText("← กลับ").click();
await check("04-home");

// เริ่มรอบ: ทุกคนต้องตั้งชุดมูฟก่อน
for (const [, name] of codes) {
  await page.getByText("เริ่มรอบ").click();
  await page.locator(".player-card").filter({ hasText: name }).first().click();
  await page.getByText("เข้าสู่รอบของฉัน").click();
  await page.locator(".round-action[data-action=moveset]").click();
  await page.getByText("ยืนยันชุดมูฟ").click();
  await page.getByText("เรียบร้อย").click();
  await page.getByText("จบรอบ ส่ง iPad คืนซุป").click();
  await page.waitForTimeout(120);
}
await check("05-all-armed");

// รอบจริง: ดวล
await page.getByText("เริ่มรอบ").click();
await page.locator(".player-card").filter({ hasText: "แมวส้ม" }).first().click();
await check("06-away-recap");
await page.getByText("เข้าสู่รอบของฉัน").click();
await check("07-round-menu");
await page.locator(".round-action[data-action=duel]").click();
await check("08-challenger-pick");
await page.locator(".player-card").filter({ hasText: "หัวหน้าทีม" }).first().click();
await page.waitForTimeout(600);
await check("09-versus");
await page.waitForTimeout(1900);
await check("10-move-pick");
await page.locator(".move-pick__btn").first().click();
await page.getByText("ยืนยัน — ลุยเลย").click();
await page.waitForTimeout(700);
await check("11-shoot");
await page.waitForTimeout(3200);
await check("12-duel-result");
await page.getByText("ดูอันดับ").click();
await check("13-ranking");
await page.locator(".rank-row--tappable").first().click();
await check("14-ranking-rates");
await page.getByText("← กลับ").click();
await page.getByText("จบรอบ").click();
await check("15-home-after");

// รอบที่ 2 — เช็คว่าจอ "ระหว่างที่คุณไม่อยู่" มีรายการจริง
await page.getByText("เริ่มรอบ").click();
await page.locator(".player-card").filter({ hasText: "หัวหน้าทีม" }).first().click();
await check("16-recap-with-entries");
const recapRows = await page.locator(".recap-row").count();
console.log(`\nรายการในจอ "ระหว่างที่คุณไม่อยู่" = ${recapRows} แถว (ต้อง >= 1)`);
if (recapRows < 1) problems.push("จอ recap ไม่มีรายการทั้งที่เพิ่งโดนท้า");

console.log(problems.length === 0 ? "\n🎉 ทุกหน้าฟิตจอ ไม่มี overflow" : `\n⚠️ พบปัญหา ${problems.length} จุด:\n${problems.join("\n")}`);
await browser.close();
