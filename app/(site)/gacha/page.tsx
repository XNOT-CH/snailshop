import { permanentRedirect } from "next/navigation";

// หน้า /gacha เดิม (กระดานสุ่มตัวเดี่ยวแบบ machine-less) ถูกเลิกใช้แล้ว
// ทางเข้ากาชาปัจจุบันคือ /gachapons -> เครื่องราย machine (/gacha/[id], /gacha-grid/[id])
// คงไฟล์นี้ไว้เป็น 308 redirect ถาวรเพื่อปิด "ประตูหลัง" และรักษาค่า SEO ของ URL เก่า
export default function GachaPage() {
    permanentRedirect("/gachapons");
}
