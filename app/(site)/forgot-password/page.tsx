import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = buildPageMetadata({
    title: "ลืมรหัสผ่าน",
    path: "/forgot-password",
    noIndex: true,
});

export default async function ForgotPasswordPage() {
    const settings = await getSiteSettings();

    return <ForgotPasswordForm logoUrl={settings?.logoUrl ?? null} />;
}
