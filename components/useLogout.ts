"use client";

import { signOut } from "next-auth/react";
import { CART_STORAGE_KEY } from "@/components/providers/CartContext";
import { showError } from "@/lib/swal";

export function useLogout() {
    const clearCartStorage = () => {
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear cart storage during logout:", error);
        }
    };

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

            clearCartStorage();
            globalThis.location.assign("/");
            return;
        } catch {
            try {
                clearCartStorage();
                await signOut({ callbackUrl: "/" });
                return;
            } catch {
                showError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
            }
        }
    };
}
