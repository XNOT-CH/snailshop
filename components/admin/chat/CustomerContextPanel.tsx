"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleDollarSign, Loader2, ShoppingBag, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatTimestamp } from "@/components/chat/ChatTimestamp";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ChatCustomerContext } from "@/components/admin/chat/types";

interface CustomerContextPanelProps {
    conversationId: string | null;
    className?: string;
}

const THB_FORMATTER = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatBaht(value: string) {
    const amount = Number(value);

    return Number.isFinite(amount) ? `฿${THB_FORMATTER.format(amount)}` : `฿${value}`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
    COMPLETED: "สำเร็จ",
    PENDING: "รอดำเนินการ",
    CANCELLED: "ยกเลิก",
};

const TOPUP_STATUS_LABELS: Record<string, string> = {
    APPROVED: "อนุมัติ",
    PENDING: "รอตรวจสอบ",
    REJECTED: "ปฏิเสธ",
};

function getStatusBadgeClassName(status: string) {
    switch (status) {
        case "COMPLETED":
        case "APPROVED": {
            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200";
        }
        case "PENDING": {
            return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200";
        }
        default: {
            return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200";
        }
    }
}

export function CustomerContextPanel({ conversationId, className }: Readonly<CustomerContextPanelProps>) {
    const [context, setContext] = useState<ChatCustomerContext | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!conversationId) {
            setContext(null);
            return;
        }

        let cancelled = false;

        (async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/admin/chat/conversations/${conversationId}/context`, {
                    cache: "no-store",
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "โหลดข้อมูลลูกค้าไม่สำเร็จ");
                }

                if (!cancelled) {
                    setContext(data.context as ChatCustomerContext);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    if (!conversationId) {
        return (
            <div className={cn("flex items-center justify-center p-6 text-center text-sm text-muted-foreground", className)}>
                เลือกบทสนทนาเพื่อดูข้อมูลลูกค้า
            </div>
        );
    }

    if (isLoading && !context) {
        return (
            <div className={cn("flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground", className)}>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูลลูกค้า
            </div>
        );
    }

    if (error && !context) {
        return (
            <div className={cn("flex items-center justify-center p-6 text-center text-sm text-destructive", className)}>
                {error}
            </div>
        );
    }

    if (!context) {
        return null;
    }

    const { user, recentOrders, recentTopups } = context;

    return (
        <ScrollArea className={cn("h-full", className)}>
            <div className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage src={user.image ?? undefined} alt={user.username} />
                        <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                            {user.name || user.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                </div>

                {user.bannedAt ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200">
                        บัญชีนี้ถูกระงับ{user.banReason ? ` — ${user.banReason}` : ""}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Wallet className="h-3.5 w-3.5" />
                            เครดิตคงเหลือ
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">{formatBaht(user.creditBalance)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            ยอดเติมสะสม
                        </p>
                        <p className="mt-1 text-sm font-bold text-foreground">{formatBaht(user.totalTopup)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="text-[11px] text-muted-foreground">แต้มสะสม</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{user.pointBalance.toLocaleString("th-TH")}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-muted/40 p-3">
                        <p className="text-[11px] text-muted-foreground">สมัครสมาชิกเมื่อ</p>
                        <ChatTimestamp value={user.createdAt} className="mt-1 block text-xs font-medium text-foreground" />
                    </div>
                </div>

                <Separator />

                <section>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        ออเดอร์ล่าสุด
                    </p>
                    {recentOrders.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                            ยังไม่มีออเดอร์
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="rounded-xl border border-border bg-card px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-xs font-medium text-foreground">
                                            {order.productName ?? "ไม่ระบุสินค้า"}
                                        </p>
                                        <span className="shrink-0 text-xs font-semibold text-foreground">
                                            {formatBaht(order.totalPrice)}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", getStatusBadgeClassName(order.status))}>
                                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                        </Badge>
                                        <ChatTimestamp value={order.purchasedAt} className="text-[10px] text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" />
                        เติมเงินล่าสุด
                    </p>
                    {recentTopups.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                            ยังไม่มีรายการเติมเงิน
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {recentTopups.map((topup) => (
                                <div key={topup.id} className="rounded-xl border border-border bg-card px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-foreground">{formatBaht(topup.amount)}</span>
                                        <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px]", getStatusBadgeClassName(topup.status))}>
                                            {TOPUP_STATUS_LABELS[topup.status] ?? topup.status}
                                        </Badge>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            {topup.paymentMethod === "truewallet" ? "TrueWallet" : topup.paymentMethod === "bank" ? "โอนธนาคาร" : "ไม่ระบุช่องทาง"}
                                        </span>
                                        <ChatTimestamp value={topup.createdAt} className="text-[10px] text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <Link
                    href="/admin/users"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-primary transition hover:bg-muted"
                >
                    ดูโปรไฟล์เต็ม
                    <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </ScrollArea>
    );
}
