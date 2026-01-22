"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        // Clear session via server-side API (HTTP-only cookie)
        await fetch("/api/session", { method: "DELETE" });

        // Also call logout API for any additional server-side cleanup
        await fetch("/api/logout", { method: "POST" });

        // Redirect to home
        router.push("/");
        router.refresh();
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
        </Button>
    );
}
