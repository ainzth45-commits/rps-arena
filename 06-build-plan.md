# 06 — Build Plan: เป่า ยิ้ง ฉุบ! อารีน่า!

> แผนระดับโมดูล · เรียงตามลำดับที่ต้องทำจริง · แต่ละโมดูลบอกไฟล์ ผลลัพธ์ และวิธี verify
> ภาพรวมเฟสดูที่ [`05-roadmap.md`](05-roadmap.md) · กติกาดูที่ [`01-game-design-spec.md`](01-game-design-spec.md)

---

## หลักการที่ยึดตลอดโปรเจกต์

1. **โดเมนต้องเป็นฟังก์ชันบริสุทธิ์** — ตรรกะเกมทั้งหมดแยกจาก React เทสได้โดยไม่ต้อง render
2. **เขียนเทสคู่กับโค้ด** ไม่ใช่ตามหลัง — โดยเฉพาะเรื่องคะแนนกับอันดับที่ผิดแล้วคนทะเลาะกันจริง
3. **ไฟล์เล็ก โฟกัสเดียว** — ไฟล์ไหนโตเกิน ~300 บรรทัดคือสัญญาณว่าทำหลายหน้าที่
4. **คะแนนเก็บเป็นจำนวนเต็มหน่วย 0.1** (`mainScoreTenths`) กัน float เพี้ยน
5. **ทุกหน้าฟิตจอ 1180×820 ไม่ต้องเลื่อน** — วัดจริงด้วย Playwright ก่อนบอกว่าเสร็จ

---

## P1 — โครงโปรเจกต์ + เครื่องยนต์เกม

### M1.1 ตั้งโปรเจกต์
- `npm create vite` (react-ts) · vitest · ESLint
- `git init` + `.gitignore` + GitHub repo (public) + Actions deploy → GitHub Pages
- `vite.config.ts` base = `/rps-arena/` ตอน build
- PWA manifest (ไอคอนใส่ทีหลังตอน P7)

**verify:** `npm run build` ผ่าน · push แล้ว Actions เขียว · เปิดลิงก์ได้

### M1.2 `domain/types.ts`
ชนิดข้อมูลทั้งหมดตาม spec §14

### M1.3 `domain/rpsEngine.ts`
```ts
resolveDuel(playerMove, challengerMove): DuelOutcome
nextPointer(index): 0|1|2
moveAtPointer(moveSet, pointerIndex): Move
randomMove(rng): Move
```
**เทส:** 9 คู่ครบทุกกรณี · ตัวชี้วนลูป 3→1 · `randomMove` กระจายทั้ง 3 ค่า (ฉีด rng ปลอม)

### M1.4 `domain/scoreEngine.ts`
```ts
streakMultiplier(streak): number          // 1 + (n-1)*0.1
playerDeltaTenths(outcome, wasRandom, streakAfter, config): number
challengerDeltaTenths(outcome, config): number
applyDelta(currentTenths, deltaTenths): number   // clamp พื้นที่ 0
```
**เทส (สำคัญที่สุดในโปรเจกต์):**
- ตารางคะแนนครบทุกบทบาท × ทุกผล
- ตัวคูณสตรีค 1→10 ตรงตาม spec §8.2 เป๊ะ (4.4 · 4.8 · 5.6 · 7.6 · 5.5 · 9.5)
- **ตัวคูณไม่ใช้กับเสมอและแพ้**
- **พื้นที่ 0**: อยู่ 2.0 แล้วแพ้ −3 → ได้ 0 ไม่ใช่ −1
- **ไม่มีค่าทศนิยมเพี้ยน** — ทดสอบว่าผลลัพธ์เป็นจำนวนเต็มหน่วย 0.1 เสมอ

### M1.5 `domain/rankingEngine.ts`
```ts
rankPlayers(players): RankedPlayer[]      // 4 ชั้น + อันดับร่วมแบบกีฬา
moveRateFor(player): { move, percent, count }[]
visibleMoveRates(rankedPlayer): ...       // อันดับ 1 = 3 มูฟ · 2,3 = มูฟสูงสุด
```
**เทส:** เรียงถูกทีละชั้น · อันดับ 1 ร่วม 2 คน → คนถัดไปเป็นอันดับ 3 · เท่ากันหมด = อันดับร่วม · **ออกมูฟ 0 ครั้ง ต้องไม่เป็น NaN** · มูฟสูงสุดเท่ากันหลายอันแสดงทั้งหมด

---

## P2 — สเตต + ผู้เล่น

### M2.1 `state/gameState.ts` + `state/storage.ts`
- โครงเซฟ + โหลด/บันทึก localStorage + `saveError` แจ้งเตือนเมื่อเซฟไม่ได้
- migration รองรับเซฟรุ่นเก่า (ตั้งแต่วันแรกเลย จะได้ไม่ต้องมาปวดหัวทีหลัง)

**เทส:** เซฟ/โหลดครบ · JSON พังต้องไม่ทำแอปล้ม · localStorage ใช้ไม่ได้ต้องเล่นต่อได้

### M2.2 `state/actions.ts`
action ทั้งหมด: เริ่มรอบ · ตั้ง/ปรับชุดมูฟ · ดวล · จบรอบ · ดวลนอกรอบ · จบซีซั่น
**เทส:** edge case ทั้ง 13 ข้อใน spec §16

### M2.3 ลงทะเบียนผู้เล่น — **ยกจากเกมที่ 1 มาปรับ**
`features/players/` + `playerImage.ts` (ย่อรูป 500px, EXIF, กล้อง/ไฟล์/ลิงก์)

---

## P3 — วงจรหลัก (ก้อนใหญ่ที่สุด)

| โมดูล | ไฟล์ | หมายเหตุ |
|---|---|---|
| M3.1 เชลล์ + เราเตอร์ | `App.tsx`, `AppRouter.tsx` | phase-based เหมือนเกมที่ 1 |
| M3.2 หน้าแรก + dock | `features/home/` | |
| M3.3 เลือกผู้เล่นจ่ายเหรียญ | `features/round/PlayerPickScene.tsx` | บอกว่าใครลงสังเวียนแล้ว |
| M3.4 📬 ระหว่างที่คุณไม่อยู่ | `features/round/AwayRecapScene.tsx` | + ป้ายเตือนโดนไล่เก็บ |
| M3.5 เมนูรอบ | `features/round/RoundMenuScene.tsx` | โชว์ว่าใช้สิทธิ์อะไรไปแล้ว |
| M3.6 ตั้ง/ปรับชุดมูฟ | `features/moveset/` | จบด้วยจอทึบ "ส่งคืนซุป" |
| M3.7 เลือกผู้ท้าชิง | `features/duel/ChallengerPickScene.tsx` | ไม่มีตัวเอง · เห็นอันดับ ไม่เห็นคะแนน · ปุ่มสุ่ม |
| M3.8 หน้า VS | `features/duel/VersusScene.tsx` | ช็อตปลุกใจ |
| M3.9 เลือกมูฟ 30 วิ | `features/duel/MovePickScene.tsx` | หมดเวลาสุ่มให้ |
| M3.10 ฉากเป่ายิ้งฉุบ | `features/duel/ShootScene.tsx` | **ช็อตลุ้นที่สุดของเกม** นับ 1-2-3 |
| M3.11 ผลการดวล | `features/duel/DuelResultScene.tsx` | ผล + คะแนน + สตรีค |

**verify:** เล่นครบวงจรจริงในเบราว์เซอร์ · คะแนนตรงกับที่คำนวณมือ · ตัวชี้เดินถูก

---

## P4 — อันดับ + ประวัติ
- `features/ranking/` — ตาราง + กดดูเรตมูฟท็อป 3
- `features/history/` — แยกแท็บผู้เล่น/ผู้ท้าชิง

## P5 — ดวลนอกรอบ
`features/offround/` — ผลัดเลือกมูฟ + จอปิดทับ + บันทึก 3 ทาง
**เทส:** "ไม่บันทึก" ต้องไม่เปลี่ยนอะไรเลย · ไม่แตะสตรีค · ไม่เลื่อนตัวชี้

## P6 — ซีซั่น
`features/season/` — จบซีซั่น · ประกาศแชมป์ · record ถาวร · เปิดซีซั่นใหม่ (ล้างชุดมูฟ)
**เทส:** เปิดซีซั่นใหม่แล้วคะแนนกลับ 30 · ชุดมูฟถูกล้าง · record เก่ายังอ่านได้

## P7 — อาร์ต + เสียง
- Codex ส่ง asset → `data/assets.ts` + preload + cache-bust
- **ป้ายไทยประกอบเองด้วย ImageMagick + Kanit**
- PWA icon สำหรับ home screen iPad

## P8 — สอนเล่น
`features/tutorial/` — เน้น: ตัวชี้ชุดมูฟ · ทำไมต้องจ่ายเหรียญเปลี่ยนเซต · ภาษีของแชมป์

## P9 — ขัดเงา + ส่งมอบ
1. ไล่วัดทุกหน้าด้วย Playwright 1180×820 → `overflow = 0`
2. **ส่งโค้ดให้ Codex รีวิว** → แก้ตามที่เจอ
3. เทสครบ + deploy + เจ้านายเทส iPad จริง

---

## ลำดับที่ลงมือจริง

```
M1.1 → M1.2 → M1.3 → M1.4 → M1.5   (เครื่องยนต์ + เทส — ทำได้เลยไม่ต้องรอธีม)
     → M2.1 → M2.2 → M2.3           (สเตต + ผู้เล่น)
     → P3 ทั้งก้อน                   (วงจรหลัก)
     → P4 → P5 → P6                  (อันดับ · นอกรอบ · ซีซั่น)
     → P7 (รอธีม approve) → P8 → P9
```

**ตอนนี้เริ่มที่ M1.1 ได้ทันที** — ธีมยังไม่เคาะก็ไม่บล็อก เพราะ P1–P6 ไม่มีงานภาพ
