import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getRegistrationPolicies } from "@/lib/getRegistrationPolicies";

export const metadata: Metadata = buildPageMetadata({
    title: "สมัครสมาชิก",
    path: "/register",
    noIndex: true,
});

export default async function RegisterPage() {
    const [settings, policies] = await Promise.all([getSiteSettings(), getRegistrationPolicies()]);
    const hasTurnstile = Boolean(
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY
    );

    return (
        <RegisterForm
            logoUrl={settings?.logoUrl ?? null}
            hasTurnstile={hasTurnstile}
            policies={policies}
        />
    );
}
