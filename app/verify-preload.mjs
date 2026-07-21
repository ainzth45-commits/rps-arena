// พิสูจน์ว่าหน้าโหลดรูปทำงานจริงบนเน็ตช้า — หน่วงรูปทุกใบ 250ms แล้วดูว่า
// แตะโลโก้ → เห็นหน้าโหลด → เปอร์เซ็นต์เดินขึ้น → ครบ 100% แล้วเข้าหน้าแรกเอง
import { chromium } from "playwright";

const URL = "http://localhost:8902/rps-arena/";
const SHOTS = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/9b4a90e4-e6e3-4e22-8587-9d05e7196b36/scratchpad";
const problems = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, bypassCSP: true });
// เน็ตช้า: หน่วงไฟล์รูปทุกใบ
await context.route(/\.(webp|png|jpg)(\?.*)?$/i, async (route) => {
  await new Promise((r) => setTimeout(r, 250));
  await route.continue();
});
const page = await context.newPage();

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".boot__logo-btn", { timeout: 30000 });
await page.waitForTimeout(300);
await page.locator(".boot__logo-btn").click({ force: true, timeout: 30000 });
await page.waitForTimeout(400);

const hasLoading = await page.locator(".boot-load__track").count();
console.log(`หน้าโหลดขึ้นหลังแตะโลโก้: ${hasLoading > 0 ? "✅" : "❌"}`);
if (hasLoading === 0) problems.push("แตะโลโก้บนเน็ตช้าแล้วไม่ขึ้นหน้าโหลด");
await page.screenshot({ path: `${SHOTS}/g3-00b-loading.png` });

const first = await page.locator(".boot-load__label").innerText();
await page.waitForTimeout(1500);
const second = await page.locator(".boot-load__label").innerText().catch(() => "(เข้าเกมแล้ว)");
console.log(`ความคืบหน้า: "${first}" → "${second}"`);
if (first === second) problems.push("เปอร์เซ็นต์ไม่ขยับ");

// ต้องเข้าหน้าแรกได้เองโดยไม่ต้องแตะซ้ำ
await page.waitForSelector(".dock", { timeout: 60000 });
console.log("เข้าหน้าแรกอัตโนมัติหลังโหลดครบ ✅");
await page.screenshot({ path: `${SHOTS}/g3-00c-after-loading.png` });

console.log(problems.length === 0 ? "\n🎉 หน้าโหลดรูปทำงานถูกต้อง" : `\n⚠️ พบปัญหา:\n${problems.join("\n")}`);
await browser.close();
