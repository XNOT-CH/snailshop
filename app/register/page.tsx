import type { Metadata } from "next";
import { db } from "@/lib/db";
import { RegisterForm } from "./RegisterForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "สมัครสมาชิก",
    path: "/register",
    noIndex: true,
});

export default async function RegisterPage() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { logoUrl: true },
    });

    return <RegisterForm logoUrl={settings?.logoUrl ?? null} />;
}
