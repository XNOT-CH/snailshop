// Thai labels for the audit log page. These live outside the page component so
// tests/lib/auditLabels.test.ts can compare them against the `resource:` values
// the codebase actually writes, instead of scraping a "use client" module.

/**
 * Keys are the exact `resource` strings passed to createAuditLog/auditFromRequest.
 * Every value written anywhere in app/ or lib/ needs an entry here, or the page
 * falls back to showing the raw English identifier on a Thai screen.
 */
export const RESOURCE_LABELS: Record<string, string> = {
    AnnouncementPopup: "ป๊อปอัป",
    AuditLog: "Audit Log",
    ChatConversation: "แชต",
    ChatQuickReply: "ข้อความสำเร็จรูป",
    CurrencySettings: "ตั้งค่าสกุลเงิน",
    DailyQuest: "ภารกิจรายวัน",
    Export: "ส่งออกข้อมูล",
    FooterLink: "ลิงก์ท้ายเว็บ",
    FooterWidgetSettings: "ตั้งค่าเมนูลัดท้ายเว็บ",
    HelpArticle: "บทความช่วยเหลือ",
    NavItem: "เมนูนำทาง",
    NewsArticle: "ข่าวสาร",
    Order: "รายการสั่งซื้อ",
    PasswordReset: "รีเซ็ตรหัสผ่าน",
    Product: "สินค้า",
    PromoCode: "โค้ดส่วนลด",
    PromoUsage: "การใช้โค้ดส่วนลด",
    Role: "ยศ",
    SeasonPassPlan: "แพ็กเกจ Season Pass",
    SeasonPassReward: "รางวัล Season Pass",
    SeasonPassSubscription: "การสมัคร Season Pass",
    Settings: "ตั้งค่า",
    TopupRequest: "เติมเงิน",
    User: "ผู้ใช้",
    UserAddressProfile: "ที่อยู่ผู้ใช้",
    season_pass_claim: "รับรางวัล Season Pass",
    season_pass_subscription: "สมัคร Season Pass",
};

/**
 * Labels for the keys that appear inside AuditLog.details. Anything missing here
 * falls back to the raw key, so this only has to cover what is worth translating.
 */
export const DETAIL_LABELS: Record<string, string> = {
    changed: "ฟิลด์ที่แก้",
    column: "คอลัมน์",
    dayNumber: "วันที่",
    deletedCount: "จำนวนที่ลบ",
    deletedData: "ข้อมูลที่ถูกลบ",
    deletedProducts: "สินค้าที่ถูกลบ",
    href: "ลิงก์",
    ids: "รายการที่เลือก",
    label: "ข้อความ",
    mode: "รูปแบบการลบ",
    operation: "การกระทำ",
    reason: "เหตุผล",
    rewardType: "ประเภทรางวัล",
    subscriptionId: "รหัสการสมัคร",
};
