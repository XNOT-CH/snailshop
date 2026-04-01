"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function useLogout() {
    const router = useRouter();

    return async function logout() {
        await signOut({ redirect: false });
        router.replace("/");
        router.refresh();
    };
}
