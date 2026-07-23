# TASK — เกมที่ 3 (เป่า ยิ้ง ฉุบ! อารีน่า!)

อัปเดต: 2026-07-23 · หลัง deploy v0.3.0

---

## ✅ เสร็จ + deploy แล้ว
| งาน | เวอร์ชัน |
|-----|---------|
| กาชาสุ่มคู่แข่ง (แทน slot — แคปซูลสลับรูป ไม่มี translateX) | v0.3.0 |
| anti-farm (ปั๊มคนเดิม 5+ ชนะครึ่ง, 7+ 25%, คู่แข่งเสียเท่าเดิม) | v0.3.0 |
| Aek (ซุปแมวส้ม ลงเล่นแทนดวลนอกรอบ ไม่ได้คะแนน · ผลฝั่งขวาแมวส้ม) | v0.3.0 |
| TV กระตุก/วินาที (timer sync นาฬิกา TV + dedupe view + 1Hz + ถอด blur + ลด confetti) | v0.3.0 |
| เสียง TV ปรับได้จากตั้งค่า (default 85%) | v0.2.0 |
| move rate นับเฉพาะคู่แข่ง (กันปั่นลวง) | v0.2.0 |
| ธรรมเนียบเกียรติยศ (โพเดียมแชมป์ 1-3 ทุกซีซั่น) | v0.2.0 |
| layout จอ TV (กันมาสคอตโดนบัง + CRM ไม่ทับ) | v0.2.0 |
| slot fix (ก่อนเปลี่ยนกาชา — เผื่ออ้างอิง) | v0.2.0 |

รายงานสาเหตุ TV กระตุก → `รายงาน-TV-กระตุก.md`

---

## 🔴 ค้าง (ยังไม่ทำ)

### TV สตรีมตั้งแต่หน้าเลือก/สุ่มคู่แข่ง
เจ้านายสั่ง: ตอนเข้าหน้าท้าดวล ให้ TV โชว์ตั้งแต่ขั้นตอนแรก (เลือก/สุ่มคู่แข่ง) เพราะไม่มีความลับแล้ว
- ตอนนี้ App.tsx (~บรรทัด 142) phase `roll`/`opponentPick` ส่ง `buildLeaderboard` (อันดับ) ขึ้น TV — ยังไม่ได้โชว์การเลือก/สุ่มคู่แข่ง
- ต้องเพิ่ม TvView kind ใหม่ (เช่น `pickOpponent`/`roll`) + builder (tvView.ts) + render (TvScenes.tsx) + broadcast (App.tsx buildCurrentTvView)
- กาชา (RollScene) center layout ทำไว้เผื่อ TV แล้ว — ต้อง mirror ขึ้น TvScenes

---

## 🟡 ทำแล้ว รอ verify จอจริง (ต้อง 2 เครื่อง / เจ้านายลองเอง)
- **Aek ผลดวลฝั่งขวาแมวส้ม** — logic+test ผ่าน · ยังไม่เปิด flow ดวลนอกรอบเต็มบนจอ (bImage = catSmug ตรงไปตรงมา)
- **TV กระตุก/วินาที/layout** — ต้องเชื่อม iPad↔TV จริง (เดซี่ verify unit test แล้ว: tvMovePickTimer, tvChannel)

---

## 🧪 Seed script (วาง console dev → reload)
```js
const now = Date.now();
const stats = () => ({ asChallenger:{win:0,draw:0,lose:0,mainDuels:0}, asOpponent:{win:0,draw:0,lose:0}, moveCount:{rock:0,scissors:0,paper:0} });
const mk = (id,name,t) => ({ id, name, imageUrl:"", moveSet:["rock","scissors","paper"], pointerIndex:0, mainScoreTenths:t, subScore:0, streak:0, bestStreak:0, stats:stats() });
localStorage.setItem("rps-arena/save-v1", JSON.stringify({
  version:2,
  config:{ startScore:30, coinCost:3, pickedRates:{win:4,draw:1,lose:-3}, randomRates:{win:5,draw:1,lose:-2}, opponentRates:{win:3,draw:1,lose:-2}, offRoundRates:{win:2,draw:1,lose:-1}, streakStepPercent:10, movePickSeconds:30, farmWarnMinDuels:3, tvVolume:0.85 },
  season:{ id:"SS1", number:1, startedAt:now },
  players:[ mk("A001","อลิซ",350), mk("B002","บ๊อบ",340), mk("C003","แคท",330), mk("D004","แดน",320), mk("E005","อีฟ",310), mk("F006","แฟรงค์",300) ],
  duels:[], round:null, records:[], lastSeenAt:{}
}));
```
dev: `cd app && npm run dev` (5173) · verify: `npm run build && npm run test` (154 ผ่าน)

เจ้านายตรวจผ่านหมด → ลบ TASK.md นี้
