import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";

export const dynamic = "force-dynamic";

export default async function DashboardWalletPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    const [user, currencySettings] = await Promise.all([
        db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                creditBalance: true,
                pointBalance: true,
                ticketBalance: true,
            },
        }),
        getCurrencySettings(),
    ]);

    if (!user) {
        redirect("/login");
    }

    // One card per balance, each with the next step it leads to where there is one.
    const balances = [
        {
            title: "เครดิต",
            value: `฿${Number(user.creditBalance).toLocaleString()}`,
            detail: "ใช้ซื้อสินค้าและบริการภายในเว็บ",
            image: "/season-pass-credit-icon.webp",
            action: { href: "/dashboard/topup", label: "เติมเงิน" },
        },
        {
            title: currencySettings.name,
            value: formatCurrencyAmount(Number(user.pointBalance ?? 0), "POINT", currencySettings),
            detail: "แต้มสะสมจากกิจกรรมและรางวัลต่างๆ",
            image: "/season-pass-points-icon.webp",
            action: null,
        },
        {
            title: "ตั๋วสุ่ม",
            value: `${Number(user.ticketBalance ?? 0).toLocaleString()} ใบ`,
            detail: "ตั๋วสุ่มที่ได้รับจาก Season Pass จะถูกบันทึกเข้ากระเป๋าอัตโนมัติทันทีเมื่อกดรับของวันนั้น",
            image: "/season-pass-ticket-card.webp",
            action: { href: "/dashboard/season-pass", label: "ดู Season Pass" },
        },
    ];

    return (
        <div className="dashboard-wallet-page space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "กระเป๋า" },
                ]}
            />

            <div>
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">
                    กระเป๋าของฉัน
                </h1>
                <p className="mt-2 text-muted-foreground">
                    รวมยอดคงเหลือของเครดิต {currencySettings.name} และตั๋วสุ่มในบัญชีนี้
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {balances.map((item) => (
                    <section
                        key={item.title}
                        className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors duration-300 ease-out hover:border-primary/40 sm:p-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/5">
                                <Image
                                    src={item.image}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-contain p-1.5"
                                />
                            </div>
                            <h2 className="font-semibold text-foreground">{item.title}</h2>
                        </div>
                        <p className="mt-5 text-3xl font-bold tracking-tight text-[var(--page-heading)] sm:text-4xl">
                            {item.value}
                        </p>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                        {item.action ? (
                            <Link
                                href={item.action.href}
                                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary/10 px-5 text-sm font-semibold text-primary transition-colors duration-300 ease-out hover:bg-primary hover:text-primary-foreground"
                            >
                                {item.action.label}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        ) : null}
                    </section>
                ))}
            </div>
        </div>
    );
}
