"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* 404 */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <FileQuestion className="w-8 h-8 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-6xl font-black text-primary/20 tracking-widest">404</p>
                    <h1 className="text-2xl font-bold tracking-tight">ไม่พบหน้านี้</h1>
                    <p className="text-muted-foreground text-sm">
                        ลิงก์ที่คุณเปิดอาจถูกลบ เปลี่ยนชื่อ หรือไม่มีอยู่แล้ว
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild className="gap-2">
                        <Link href="/">
                            <Home className="w-4 h-4" />
                            กลับหน้าหลัก
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        ย้อนกลับ
                    </Button>
                </div>
            </div>
        </div>
    );
}
