import type { Metadata } from "next";
import { db } from "@/lib/db";
import { LoginForm } from "./LoginForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "เข้าสู่ระบบ",
    path: "/login",
    noIndex: true,
});

export default async function LoginPage() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { logoUrl: true },
    });

    return <LoginForm logoUrl={settings?.logoUrl ?? null} />;
}
