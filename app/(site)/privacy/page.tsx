import type { Metadata } from "next";
import { PolicyDocument } from "@/components/PolicyDocument";
import { buildPageMetadata } from "@/lib/seo";
import { getRegistrationPolicies } from "@/lib/getRegistrationPolicies";

// DB-backed content: an admin edit must show up without a redeploy, so this
// page is never captured into the static build (same as /help).
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "นโยบายความเป็นส่วนตัว",
    description: "นโยบายการเก็บและใช้ข้อมูลส่วนบุคคลของผู้ใช้",
    path: "/privacy",
});

export default async function PrivacyPage() {
    const policies = await getRegistrationPolicies();
    return <PolicyDocument variant="privacy" items={policies.pp} />;
}
