// ย่อรูปผู้เล่นก่อนเก็บลง localStorage — รูปดิบจากกล้อง iPad ใหญ่หลายเมกะไบต์ เก็บตรงๆ โควตาแตกแน่
// (บทเรียนเกมที่ 1: ต้องย่อ + ใส่ imageOrientation กัน EXIF ทำรูปตะแคง)

const MAX_SIDE = 500;
const JPEG_QUALITY = 0.82;

export class ImageTooLargeError extends Error {}

/**
 * แปลงไฟล์รูป (จากกล้องหรือคลังภาพ) เป็น data URL ที่ย่อแล้ว
 * ครอบเป็นจัตุรัสกลางภาพ เพราะการ์ดผู้เล่นเป็นจัตุรัส
 */
export async function fileToSquareDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์นี้ไม่ใช่รูปภาพ");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const out = Math.min(MAX_SIDE, side);

    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์นี้วาดรูปไม่ได้");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);

    // webp เล็กกว่ามาก แต่เบราว์เซอร์เก่าอาจไม่รองรับ → ถอยไป jpeg
    const webp = canvas.toDataURL("image/webp", JPEG_QUALITY);
    const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    // กันเซฟบวมจนโควตาแตก — 500px ปกติได้ราว 40-80KB
    if (dataUrl.length > 400_000) throw new ImageTooLargeError("รูปใหญ่เกินไป ลองถ่ายใหม่หรือเลือกรูปอื่นนะคะ");
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

/** ลิงก์รูปที่รับได้ — http/https เท่านั้น (กัน javascript: และสตริงยาวผิดปกติ) */
export function normalizeImageUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 2000) return "";
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : "";
}
