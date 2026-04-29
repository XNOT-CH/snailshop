import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";

export const metadata: Metadata = buildPageMetadata({
    title: "เข้าสู่ระบบ",
    path: "/login",
    noIndex: true,
});

export default async function LoginPage() {
    const settings = await getSiteSettings();
    const hasTurnstileSiteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    const hasTurnstileSecretKey = Boolean(process.env.TURNSTILE_SECRET_KEY);
    const turnstileConfigError =
        hasTurnstileSecretKey && !hasTurnstileSiteKey
            ? "ระบบยืนยันความปลอดภัยยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ"
            : null;

    return (
        <LoginForm
            logoUrl={settings?.logoUrl ?? null}
            turnstileConfigError={turnstileConfigError}
        />
    );
}
