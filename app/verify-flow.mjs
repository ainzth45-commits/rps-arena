// เดินทั้ง flow ของเกมที่ 3 บนจอ iPad Air 5 landscape แล้ววัด overflow ทุกหน้า
import { chromium } from "playwright";

const URL = "http://localhost:8902/rps-arena/";
const SHOTS = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";

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

// นับ oscillator ที่เกมสร้าง — ใช้พิสูจน์ว่าเสียงถูกเล่นจริง (headless ไม่ได้ยินเสียง)
await page.addInitScript(() => {
  window.__oscCount = 0;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  const original = Ctor.prototype.createOscillator;
  Ctor.prototype.createOscillator = function patched() {
    window.__oscCount += 1;
    return original.apply(this, arguments);
  };
});

await page.goto(URL, { waitUntil: "networkidle" });
await check("00-boot");
await page.locator(".boot__logo-btn").click({ force: true });
await page.waitForTimeout(300);
await check("01-home-empty");

// ลงทะเบียนผู้เล่น 4 คน
await page.locator(".dock-btn[data-dock=players]").click();
await check("02-players");
const codes = [["A101", "แมวส้ม"], ["B202", "หัวหน้าทีม"], ["C303", "น้องใหม่"], ["D404", "เซลส์เทพ"]];
for (const [code, name] of codes) {
  const inputs = page.locator(".player-form__grid input");
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
  if (name === "แมวส้ม") await check("04b-moveset");
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
await page.waitForTimeout(400);
await check("09-move-pick");
await page.locator(".move-pick__btn").first().click();
await page.getByText("ยืนยัน — ลุยเลย").click();

// ฉากปะทะ 5 วิ — เช็คทั้ง 3 ช่วง (พุ่งเข้า → กระแทก+ข้อมูล → พร้อม!) แล้วกดข้าม
await page.waitForTimeout(200);
await check("10a-versus-in");
await page.waitForTimeout(1200);
await check("10b-versus-info");
const h2h = await page.locator(".versus3__h2h").innerText();
console.log(`\nแถบสถิติเจอกันในฉาก VS = "${h2h}"`);
if (!h2h.trim()) problems.push("ฉาก VS ไม่มีแถบสถิติเจอกัน");
await page.waitForTimeout(1300);
await check("10c-versus-ready");
if (await page.locator(".versus3__go").count() === 0) problems.push("ฉาก VS ไม่ขึ้นป้าย 'พร้อม!'");
// แตะข้าม (ถ้ายังทันก่อนฉากหมดเวลาเอง)
if (await page.locator(".versus3__skip").count() > 0) await page.locator(".versus3__skip").click();
await page.waitForTimeout(400);
await check("11-shoot");
await page.waitForTimeout(1450); // ให้นับ เป่า-ยิ้ง-ฉุบ ครบแล้วเปิดมูฟ (ประกายปะทะ)
await check("11b-shoot-reveal");
await page.waitForTimeout(1400);
await check("12-duel-result");
const oscCount = await page.evaluate(() => window.__oscCount ?? 0);
console.log(`\nเสียงที่เล่นไปแล้วถึงจอผลดวล = ${oscCount} เสียง (ต้อง > 0)`);
if (oscCount === 0) problems.push("เล่นถึงจอผลดวลแล้วแต่ไม่มีเสียงเลย");
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

// ปิดซีซั่น — เช็คฉากโพเดียม + กระดาษฉลองตอนประกาศแชมป์
await page.getByText("เข้าสู่รอบของฉัน").click();
await page.getByText("จบรอบ ส่ง iPad คืนซุป").click();
await page.locator(".dock-btn[data-dock=settings]").click();
await check("17-settings");
await page.getByText("จบซีซั่นนี้").click();
await page.getByText("ยืนยัน จบซีซั่น").click();
await check("18-season-end-suspense");
await page.waitForTimeout(3600); // รอเผยครบ 3 อันดับ
await check("19-season-end-champion");
const confettiBits = await page.locator(".confetti__bit").count();
console.log(`\nกระดาษฉลองตอนประกาศแชมป์ = ${confettiBits} ชิ้น (ต้อง > 0)`);
if (confettiBits === 0) problems.push("ประกาศแชมป์แล้วแต่ไม่มีกระดาษฉลอง");

// หน้าบันทึกซีซั่นเก่า (เพิ่งมีซีซั่นที่จบไป 1 ซีซั่น)
await page.getByText("กลับหน้าแรก").click();
await page.locator(".dock-btn[data-dock=settings]").click();
await page.getByText("บันทึกซีซั่นเก่า").click();
await check("20-season-records");
const recordRows = await page.locator(".records__item").count();
const detailRows = await page.locator(".records__detail .reveal-row").count();
console.log(`\nบันทึกซีซั่นเก่า = ${recordRows} ซีซั่น · ตารางอันดับ ${detailRows} แถว (ต้อง > 0 ทั้งคู่)`);
if (recordRows < 1) problems.push("หน้าบันทึกซีซั่นเก่าไม่มีรายการซีซั่น");
if (detailRows < 1) problems.push("หน้าบันทึกซีซั่นเก่าไม่มีตารางอันดับ");

// หน้าปรับค่าเกม — กดเพิ่มเวลาเลือกมูฟแล้วต้องบันทึกจริง
await page.getByText("← กลับ").click();
await page.getByText("ปรับค่าเกม").click();
await check("21-game-config");
const timerStepper = page.locator(".config__row").filter({ hasText: "เวลาเลือกมูฟ" }).locator(".stepper__btn").last();
await timerStepper.click();
await page.waitForTimeout(200);
const seconds = await page.locator(".config__row").filter({ hasText: "เวลาเลือกมูฟ" }).locator(".stepper__value").innerText();
console.log(`\nเวลาเลือกมูฟหลังกดเพิ่ม 1 = "${seconds.replace(/\n/g, " ")}" (ต้องเป็น 31)`);
if (!seconds.startsWith("31")) problems.push(`ปรับเวลาเลือกมูฟไม่ทำงาน (ได้ ${seconds})`);
await check("21b-game-config-changed");

// ปุ่มปิดเสียงในตั้งค่า
await page.getByText("← กลับ").click();
await page.getByText("🔇 ปิดเสียง").click();
await page.waitForTimeout(150);
const mutedFlag = await page.evaluate(() => localStorage.getItem("rps-arena/muted"));
const beforeMuteOsc = await page.evaluate(() => window.__oscCount ?? 0);
await page.getByText("กลับ", { exact: true }).click();
await page.waitForTimeout(200);
const afterMuteOsc = await page.evaluate(() => window.__oscCount ?? 0);
console.log(`\nปิดเสียงแล้ว: flag=${mutedFlag} · เสียงเพิ่มหลังปิด = ${afterMuteOsc - beforeMuteOsc} (ต้อง 0)`);
if (mutedFlag !== "1") problems.push("กดปิดเสียงแล้วไม่ได้บันทึกค่า");
if (afterMuteOsc !== beforeMuteOsc) problems.push("ปิดเสียงแล้วยังมีเสียงเล่นอยู่");

console.log(problems.length === 0 ? "\n🎉 ทุกหน้าฟิตจอ ไม่มี overflow" : `\n⚠️ พบปัญหา ${problems.length} จุด:\n${problems.join("\n")}`);
await browser.close();
