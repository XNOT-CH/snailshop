"use client";

import { useState } from "react";
import { SpinnerScreen } from "@/components/SpinnerScreen";

export default function TestLoadingPage() {
    const [showOverlay, setShowOverlay] = useState(false);

    return (
        <div className="py-8 space-y-8">
            <h1 className="text-2xl font-bold">ตัวอย่าง SpinnerScreen</h1>

            {/* แบบ inline เต็มพื้นที่ container */}
            <section className="space-y-2">
                <h2 className="text-sm text-muted-foreground">แบบ inline (อยู่ในพื้นที่)</h2>
                <div className="rounded-2xl border bg-card">
                    <SpinnerScreen label="กำลังโหลดข้อมูล..." />
                </div>
            </section>

            {/* แบบ overlay เต็มจอ */}
            <section className="space-y-2">
                <h2 className="text-sm text-muted-foreground">แบบ overlay เต็มจอ</h2>
                <button
                    onClick={() => {
                        setShowOverlay(true);
                        setTimeout(() => setShowOverlay(false), 2500);
                    }}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                    แสดง overlay 2.5 วินาที
                </button>
            </section>

            {showOverlay && <SpinnerScreen fullScreen label="กำลังบันทึก..." />}
        </div>
    );
}
