// ค่าเชื่อม Supabase — publishable key ออกแบบมาให้เปิดเผยในเว็บได้ (repo public ปลอดภัย)
// ใช้แค่ Realtime broadcast (ไม่มีตาราง) จึงไม่มีข้อมูลให้ดึงผ่าน key นี้
// service_role key ห้ามอยู่ในไฟล์นี้เด็ดขาด
export const SUPABASE_URL = "https://bxvztblxpyhsrvwvqsik.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3bb160qgOqW-4h5c4PhanQ_1qEPliv3";

/** prefix ของ channel — ห้อง = `arena-<รหัส4หลัก>` */
export const ROOM_PREFIX = "arena-";
