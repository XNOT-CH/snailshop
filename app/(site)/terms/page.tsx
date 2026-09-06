import type { Metadata } from "next";
import { PolicyDocument } from "@/components/PolicyDocument";
import { buildPageMetadata } from "@/lib/seo";
import { getRegistrationPolicies } from "@/lib/getRegistrationPolicies";

// DB-backed content: an admin edit must show up without a redeploy, so this
// page is never captured into the static build (same as /help).
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "ข้อกำหนดการใช้งาน",
    description: "เงื่อนไขการใช้งานเว็บไซต์และบริการ",
    path: "/terms",
});

export default async function TermsPage() {
    const policies = await getRegistrationPolicies();
    return <PolicyDocument variant="terms" items={policies.tos} />;
}
