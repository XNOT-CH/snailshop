"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Lock, Eye, EyeOff, Calendar, Copy, Check, User, KeyRound } from "lucide-react";
import { showSuccess } from "@/lib/swal";

interface PurchasedItemProps {
    title: string;
    image: string;
    date: string;
    secretData: string;
}

// Parse secret data to extract username and password
function parseSecretData(data: string): { username: string; password: string } | null {
    // Try common formats: "username / password", "username:password", "username|password"
    const separators = [' / ', '/', ':', '|', ' | '];

    for (const sep of separators) {
        if (data.includes(sep)) {
            const parts = data.split(sep);
            if (parts.length >= 2) {
                return {
                    username: parts[0].trim(),
                    password: parts.slice(1).join(sep).trim(),
                };
            }
        }
    }

    return null;
}

export function PurchasedItem({
    title,
    image,
    date,
    secretData,
}: PurchasedItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<"username" | "password" | "all" | null>(null);

    const parsed = parseSecretData(secretData);

    const handleCopy = async (text: string, field: "username" | "password" | "all") => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        showSuccess("คัดลอกแล้ว!");
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <Card className="overflow-hidden card-tilt touch-feedback">
            {/* Image */}
            <div className="relative aspect-[4/3] bg-muted">
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
            </div>

            <CardHeader className="pb-2">
                <h3 className="font-semibold text-foreground line-clamp-1">
                    {title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {date}
                </div>
            </CardHeader>

            <CardContent className="pb-3">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
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
                        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="gap-1">
                                    <Lock className="h-3 w-3" />
                                    ข้อมูลลับ
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(secretData, "all")}
                                    className="h-8 gap-1"
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
                                // Show parsed username and password format
                                <div className="space-y-2">
                                    {/* Username */}
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-background border">
                                        <User className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">ชื่อผู้ใช้ (Username)</p>
                                            <p className="text-sm font-mono font-medium break-all">
                                                {parsed.username}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => handleCopy(parsed.username, "username")}
                                        >
                                            {copiedField === "username" ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Password */}
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-background border">
                                        <KeyRound className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">รหัสผ่าน (Password)</p>
                                            <p className="text-sm font-mono font-medium break-all">
                                                {parsed.password}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 flex-shrink-0"
                                            onClick={() => handleCopy(parsed.password, "password")}
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
                                // Show raw data if not parseable
                                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono break-all p-2 bg-background rounded-md border">
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
