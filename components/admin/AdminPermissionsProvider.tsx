"use client";

import { createContext, useContext } from "react";

const AdminPermissionsContext = createContext<string[]>([]);

export function AdminPermissionsProvider({
    permissions,
    children,
}: Readonly<{
    permissions: string[];
    children: React.ReactNode;
}>) {
    return (
        <AdminPermissionsContext.Provider value={permissions}>
            {children}
        </AdminPermissionsContext.Provider>
    );
}

export function useAdminPermissions() {
    return useContext(AdminPermissionsContext);
}
