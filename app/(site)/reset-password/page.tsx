import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = buildPageMetadata({
    title: "ตั้งรหัสผ่านใหม่",
    path: "/reset-password",
    noIndex: true,
});

export default async function ResetPasswordPage() {
    const settings = await getSiteSettings();

    return <ResetPasswordForm logoUrl={settings?.logoUrl ?? null} />;
}
