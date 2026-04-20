"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Lock,
    Eye,
    EyeOff,
    Calendar,
    Copy,
    Check,
    User,
    KeyRound,
    Trash2,
    PackageCheck,
    ShieldCheck,
} from "lucide-react";
import { showSuccess, showDeleteConfirm, showError } from "@/lib/swal";
import { themeClasses } from "@/lib/theme";

interface PurchasedItemProps {
    orderId: string;
    title: string;
    image: string;
    date: string;
    secretData: string;
}

function parseSecretData(data: string): { username: string; password: string } | null {
    const separators = [" / ", "/", ":", "|", " | "];
    for (const separator of separators) {
        if (!data.includes(separator)) continue;

        const parts = data.split(separator);
        if (parts.length >= 2) {
            return {
                username: parts[0].trim(),
                password: parts.slice(1).join(separator).trim(),
            };
        }
    }

    return null;
}

export function PurchasedItem({
    orderId,
    title,
    image,
    date,
    secretData,
}: Readonly<PurchasedItemProps>) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<"username" | "password" | "all" | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const parsed = parseSecretData(secretData);

    const handleCopy = async (text: string, field: "username" | "password" | "all") => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        showSuccess("คัดลอกแล้ว");
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleDelete = async () => {
        const confirmed = await showDeleteConfirm(title);
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
            const data = await response.json();

            if (data.success) {
                showSuccess("ลบรายการเรียบร้อยแล้ว");
                router.refresh();
                return;
            }

            showError(data.message || "เกิดข้อผิดพลาด");
        } catch {
            showError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className={`${themeClasses.surface} overflow-hidden rounded-3xl border border-border/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg card-tilt touch-feedback`}>
            <div className="relative aspect-[4/3] border-b border-border/80 bg-muted">
                <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/600x400/f4f4f5/71717a?text=No+Image";
                    }}
                />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                    <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-100">
                        <PackageCheck className="h-3 w-3" />
                        รับแล้ว
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full border-rose-200 bg-white/95 px-2.5 text-rose-600 shadow-sm backdrop-blur hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-400/25 dark:bg-slate-950/70 dark:text-rose-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-100"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        aria-label="ลบรายการนี้ออกจากคลัง"
                        title="ลบรายการนี้ออกจากคลัง"
                    >
                        {isDeleting ? (
                            <Check className="h-4 w-4 animate-pulse" />
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">ลบออก</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <CardHeader className="space-y-3 pb-2">
                <div className="min-w-0">
                    <h3 className="line-clamp-1 text-lg font-semibold text-foreground">{title}</h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {date}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-50 dark:bg-sky-500/15 dark:text-sky-100">
                        <ShieldCheck className="h-3 w-3" />
                        ข้อมูลพร้อมใช้งาน
                    </Badge>
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-700/50 dark:text-slate-200">
                        เปิดดูได้ตลอด
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pb-4">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant={isOpen ? "secondary" : "default"}
                            size="sm"
                            className={[
                                "h-11 w-full gap-2 rounded-2xl font-medium shadow-sm",
                                isOpen
                                    ? "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                            ].join(" ")}
                        >
                            {isOpen ? (
                                <>
                                    <EyeOff className="h-4 w-4" />
                                    ซ่อนข้อมูล
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4" />
                                    ดูข้อมูลลับ
                                </>
                            )}
                        </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-3">
                        <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-3">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="gap-1 rounded-full bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                    <Lock className="h-3 w-3" />
                                    ข้อมูลลับ
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(secretData, "all")}
                                    className="h-8 gap-1 rounded-full"
                                >
                                    {copiedField === "all" ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            คัดลอกแล้ว
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            คัดลอกทั้งหมด
                                        </>
                                    )}
                                </Button>
                            </div>

                            {parsed ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 rounded-xl border bg-background p-2.5">
                                        <User className="h-4 w-4 flex-shrink-0 text-primary" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-muted-foreground">ชื่อผู้ใช้ (Username)</p>
                                            <p className="break-all font-mono text-sm font-medium">{parsed.username}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => handleCopy(parsed.username, "username")}
                                            aria-label="คัดลอกชื่อผู้ใช้"
                                        >
                                            {copiedField === "username" ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-xl border bg-background p-2.5">
                                        <KeyRound className="h-4 w-4 flex-shrink-0 text-primary" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-muted-foreground">รหัสผ่าน (Password)</p>
                                            <p className="break-all font-mono text-sm font-medium">{parsed.password}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => handleCopy(parsed.password, "password")}
                                            aria-label="คัดลอกรหัสผ่าน"
                                        >
                                            {copiedField === "password" ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap break-all rounded-xl border bg-background p-2.5 font-mono text-sm text-foreground">
                                    {secretData}
                                </pre>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
