"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Lock, Eye, EyeOff, Calendar, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface PurchasedItemProps {
    title: string;
    image: string;
    date: string;
    secretData: string;
}

export function PurchasedItem({
    title,
    image,
    date,
    secretData,
}: PurchasedItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(secretData);
        setCopied(true);
        toast.success("คัดลอกข้อมูลแล้ว!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="overflow-hidden">
            {/* Image */}
            <div className="relative aspect-[4/3] bg-muted">
                <Image
                    src={image}
                    alt={title}
                    fill
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
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary" className="gap-1">
                                    <Lock className="h-3 w-3" />
                                    ข้อมูลลับ
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-8 gap-1"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            คัดลอกแล้ว
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            คัดลอก
                                        </>
                                    )}
                                </Button>
                            </div>
                            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono break-all">
                                {secretData}
                            </pre>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}
