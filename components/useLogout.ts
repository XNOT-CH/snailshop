"use client";

import { signOut } from "next-auth/react";
import { showError } from "@/lib/swal";

export function useLogout() {
    return async function logout() {
        try {
            const response = await fetch("/api/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Logout API failed");
            }

            globalThis.location.assign("/");
            return;
        } catch {
            try {
                await signOut({ callbackUrl: "/" });
                return;
            } catch {
                showError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
            }
        }
    };
}
