// ค่าที่แนะนำต้องไม่เกิน maxDimension ที่เซิร์ฟเวอร์ย่อจริง (ดู app/api/upload/route.ts
// และ route อัปโหลดเฉพาะทางของแต่ละหมวด) มิฉะนั้นรูปจะถูกย่อลงหลังอัปโหลด:
//   • อัปโหลดทั่วไป (ไม่ส่ง preset) = 1080px  • preset "banner" = 1920px
//   • ตู้กาชา/รางวัล/season-pass = 1080px
export const IMAGE_UPLOAD_RECOMMENDATIONS = {
    bannerCarousel: "แนะนำขนาด 1920x480px",
    newsCover: "แนะนำขนาด 1080x608px",
    popupSquare: "แนะนำขนาด 1080x1080px",
    productSquare: "แนะนำขนาด 1080x1080px",
    logoSquare: "แนะนำขนาด 512x512px",
    socialShare: "แนะนำขนาด 1200x630px",
    backgroundWide: "แนะนำขนาด 1920x1080px",
    gachaMachineBanner: "แนะนำขนาด 1080x270px",
    rewardSquare: "แนะนำขนาด 800x800px",
} as const;
