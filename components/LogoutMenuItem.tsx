"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/components/useLogout";

export function LogoutMenuItem() {
    const logout = useLogout();
    const [isPending, setIsPending] = useState(false);

    return (
        <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer gap-2"
            onSelect={async (e) => {
                e.preventDefault();
                if (isPending) return;
                setIsPending(true);
                try {
                    await logout();
                } finally {
                    setIsPending(false);
                }
            }}
            disabled={isPending}
        >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
        </DropdownMenuItem>
    );
}
