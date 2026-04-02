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

    return <LoginForm logoUrl={settings?.logoUrl ?? null} />;
}
