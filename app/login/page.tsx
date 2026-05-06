import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { normalizeCallbackUrl } from "@/lib/authRedirect";

export const metadata: Metadata = buildPageMetadata({
    title: "เข้าสู่ระบบ",
    path: "/login",
    noIndex: true,
});

type LoginPageProps = {
    searchParams?: Promise<{
        callbackUrl?: string | string[];
    }>;
};

export default async function LoginPage({ searchParams }: Readonly<LoginPageProps>) {
    const session = await auth();
    const params = await searchParams;
    const callbackParam = Array.isArray(params?.callbackUrl)
        ? params.callbackUrl[0]
        : params?.callbackUrl;
    const callbackUrl = normalizeCallbackUrl(callbackParam);

    if (session?.user) {
        redirect(callbackUrl);
    }

    const settings = await getSiteSettings();
    const hasTurnstileSiteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    const hasTurnstileSecretKey = Boolean(process.env.TURNSTILE_SECRET_KEY);
    const isE2EAuthTestMode =
        process.env.E2E_AUTH_TEST_MODE === "1" &&
        process.env.NODE_ENV !== "production";
    const turnstileConfigError =
        !isE2EAuthTestMode &&
        (
            hasTurnstileSecretKey !== hasTurnstileSiteKey ||
            (process.env.NODE_ENV === "production" && (!hasTurnstileSiteKey || !hasTurnstileSecretKey))
        )
            ? "ระบบยืนยันความปลอดภัยยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ"
            : null;

    return (
        <LoginForm
            logoUrl={settings?.logoUrl ?? null}
            turnstileConfigError={turnstileConfigError}
        />
    );
}
