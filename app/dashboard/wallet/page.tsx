import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CalendarDays, Eye, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { ensureTicketBalanceColumn } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function DashboardWalletPage() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    await ensureTicketBalanceColumn();

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            creditBalance: true,
            pointBalance: true,
            ticketBalance: true,
        },
    });

    if (!user) {
        redirect("/login");
    }

    const balances = [
        {
            title: "เครดิต",
            value: Number(user.creditBalance).toLocaleString(),
            detail: "ใช้ซื้อสินค้าและบริการภายในเว็บ",
            image: "/season-pass-credit.png",
        },
        {
            title: "พอยต์",
            value: Number(user.pointBalance ?? 0).toLocaleString(),
            detail: "แต้มสะสมจากกิจกรรมและรางวัลต่างๆ",
            image: "/season-pass-points.png",
        },
    ] as const;
    const ticketBalance = Number(user.ticketBalance ?? 0);

    return (
        <div className="space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "กระเป๋า" },
                ]}
            />

            <section className="rounded-[28px] border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">กระเป๋าของฉัน</h1>
                    <p className="text-sm leading-6 text-slate-500">
                        รวมยอดคงเหลือของเครดิต พอยต์ และตั๋วสุ่มในบัญชีนี้
                    </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {balances.map((item) => {
                        return (
                            <Card key={item.title} className="rounded-[24px] border border-border/70 shadow-none">
                                <CardContent className="p-5">
                                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="h-full w-full object-contain p-2"
                                        />
                                    </div>
                                    <p className="mt-4 text-sm font-medium text-slate-500">{item.title}</p>
                                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {ticketBalance > 0 ? (
                    <div className="mt-8 space-y-4">
                        <div className="space-y-1">
                            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
                                <Gift className="h-5 w-5 text-blue-600" />
                                ตั๋วสุ่มของฉัน
                            </h2>
                            <p className="text-sm leading-6 text-slate-500">
                                แสดงตั๋วสุ่มที่ถืออยู่ในกระเป๋าแบบการ์ดไอเทมเพื่อดูง่ายขึ้น
                            </p>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                            <Card className="overflow-hidden rounded-[30px] border border-border/70 bg-white shadow-sm">
                                <div className="relative h-[280px] overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_35%),linear-gradient(180deg,#fffdfa_0%,#f8fafc_100%)]">
                                    <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        พร้อมใช้งาน
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center p-8">
                                        <div className="relative h-full w-full max-w-[320px]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src="/season-pass-ticket.png"
                                                alt="Season Pass ticket"
                                                className="h-full w-full object-contain drop-shadow-[0_28px_30px_rgba(15,23,42,0.2)]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">ตั๋วสุ่ม Season Pass</h3>
                                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                            <CalendarDays className="h-4 w-4" />
                                            อัปเดตจากการกดรับรางวัลล่าสุด
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                            จำนวนคงเหลือ {ticketBalance.toLocaleString()}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            รับได้จาก Season Pass
                                        </span>
                                    </div>

                                    <div className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-18px_rgba(37,99,235,0.8)]">
                                        <span className="inline-flex items-center gap-2">
                                            <Eye className="h-4 w-4" />
                                            ตั๋วพร้อมใช้งาน
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-7 text-amber-900">
                    ตั๋วสุ่มที่ได้รับจาก Season Pass จะถูกบันทึกเข้ากระเป๋าอัตโนมัติทันทีเมื่อกดรับของวันนั้น
                </div>
            </section>
        </div>
    );
}
