"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useLogout } from "@/components/useLogout";

export function LogoutButton() {
    const logout = useLogout();
    const [isPending, setIsPending] = useState(false);

    const handleLogout = async () => {
        if (isPending) return;
        setIsPending(true);
        try {
            await logout();
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
        </Button>
    );
}
