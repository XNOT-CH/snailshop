import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";

export const metadata: Metadata = buildPageMetadata({
    title: "สมัครสมาชิก",
    path: "/register",
    noIndex: true,
});

export default async function RegisterPage() {
    const settings = await getSiteSettings();

    return <RegisterForm logoUrl={settings?.logoUrl ?? null} />;
}
