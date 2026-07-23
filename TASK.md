# TASK — เกมที่ 3 (เป่า ยิ้ง ฉุบ! อารีน่า!)

อัปเดต: 2026-07-23 · หลัง deploy v0.2.0 · resume จากไฟล์นี้

---

## ✅ เสร็จ + deploy แล้ว (v0.2.0)
| งาน | สรุป | verify |
|-----|------|--------|
| Slot สุ่มคู่แข่งหยุดไม่ตรง | ผูกตัวแปรขนาด + คำนวณ px จากกลางหน้าต่าง + อ่าน CELL จาก DOM + แก้ StrictMode timer bug (setup once + onDoneRef) | ✅ browser: หยุดตรงกรอบ + ไม่ค้าง |
| เสียง TV เบา | สไลเดอร์ในตั้งค่า → ส่ง realtime → master volume จอ TV · default 85% · iPad คง 28% | ✅ browser: สไลเดอร์ 85% + test 144 |
| Layout จอ TV เละ (เดซี่) | leaderboard state, tv-result-score-strip กัน mascot โดนบัง, ปุ่ม CRM ไม่ทับ podium | ✅ build/test (verify จอ TV จริงต้อง 2 เครื่อง) |
| Move rate นับเฉพาะคู่แข่ง (เดซี่) | moveCount นับเฉพาะ opponent ในดวลหลัก (2 จุด) · ตัด challenger + ดวลนอกรอบ (กันปั่นลวง) | ✅ diff + test opponent-only |
| ธรรมเนียบเกียรติยศ (ใหม่) | โพเดียม 2-1-3 แชมป์ 1-3 ทุกซีซั่น · crown+medal+ขั้นสูงต่ำ · เข้าจากตั้งค่า · เกมหลักเท่านั้น | ✅ browser: podium สวยเข้าธีม |

รายงาน TV กระตุก → ไฟล์ `รายงาน-TV-กระตุก.md` (เดซี่ audit 8 สาเหตุ + วิธีแก้)

---

## ⏳ ค้าง (resume ครั้งหน้า)

### 1. Slot → กาชา (ถ้าเจ้านายยังไม่พอใจ slot ที่แก้แล้ว)
เจ้านายเคยสั่งเปลี่ยนเป็นกาชาแบบเกมที่ 1 (`เกมที่1/app/src/features/gacha/GachaFlow.tsx`) — สลับรูปช่องเดียว ไม่มี translateX/ตำแหน่ง → ชัวร์กว่า
**หมายเหตุ**: slot ปัจจุบันแก้แล้ว verify browser ผ่าน (หยุดตรง+ไม่ค้าง) — production เก่ายังไม่มี fix นี้ เจ้านายกลับมาลอง v0.2.0 ก่อนตัดสินว่าต้องเปลี่ยนกาชาไหม · แผน port กาชาละเอียดอยู่ใน git log ของ TASK.md เวอร์ชันก่อน

### 2. TV สตรีมตั้งแต่หน้าเลือก/สุ่มคู่แข่ง (feedback ข้อ 2 เดิม)
เพิ่ม TvView kind ใหม่ + builder (tvView.ts) + render (TvScenes.tsx) + broadcast (App.tsx) ให้ TV โชว์ตั้งแต่ขั้นเลือกคู่แข่ง

### 3. แก้ TV กระตุก (จาก audit — ดู รายงาน-TV-กระตุก.md)
เรียงลำดับ: (1) ตารางอันดับ FLIP + count-up 24 step, (2) ถอด backdrop-filter blur + ลด confetti + เงานิ่ง, (3) timer/เสียง cleanup

### 4. TV animation parity (audit TOPIC A — log เดซี่)
TV ยังไม่ mirror ครบ: ไม่เล่น tick/revealImpact/streakFire, จบซีซั่นไม่ค่อยๆ เผยโพเดียม, timer TV หาร 30 ตายตัว (เปลี่ยนวินาทีจะเพี้ยน)

---

## 📌 หมายเหตุ
- StrictMode (main.tsx) รัน effect 2 รอบใน dev — effect ที่ตั้ง timer ต้อง setup ครั้งเดียว + ref (อย่าใช้ settled-guard + cleanup ล้าง timer)
- verify browser: seed script อยู่ใน git log · dev `cd app && npm run dev` (5173) · `npm run build && npm run test` (144 ผ่าน)
- เจ้านายตรวจผ่านแล้ว → ลบ TASK.md นี้
