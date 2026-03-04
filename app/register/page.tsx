// Server Component — fetch logo จาก DB โดยตรง ไม่ต้อง client-side fetch
import { db } from "@/lib/db";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { logoUrl: true },
    });

    return <RegisterForm logoUrl={settings?.logoUrl ?? null} />;
}
