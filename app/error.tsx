"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
    error,
    reset,
}: Readonly<{
    error: Error & { digest?: string };
    reset: () => void;
}>) {
    useEffect(() => {
        console.error("[app/error]", error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">เกิดข้อผิดพลาด</h1>
                    <p className="text-muted-foreground text-sm">
                        {error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง"}
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground/60 font-mono">
                            รหัสข้อผิดพลาด: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        ลองใหม่
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/">
                            <Home className="w-4 h-4" />
                            กลับหน้าหลัก
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
