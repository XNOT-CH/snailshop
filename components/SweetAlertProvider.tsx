"use client";

import React from "react";
import "sweetalert2/dist/sweetalert2.min.css";

export function SweetAlertProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    return <>{children}</>;
}
