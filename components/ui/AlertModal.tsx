"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description: string;
    variant?: "success" | "error" | "warning" | "info";
    buttonText?: string;
}

const variantConfig = {
    success: {
        icon: CheckCircle,
        iconBg: "bg-green-100",
        iconColor: "text-green-600",
        buttonClass: "bg-green-600 hover:bg-green-700",
    },
    error: {
        icon: XCircle,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        buttonClass: "bg-red-600 hover:bg-red-700",
    },
    warning: {
        icon: AlertTriangle,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        buttonClass: "bg-blue-600 hover:bg-blue-700",
    },
    info: {
        icon: Info,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        buttonClass: "bg-blue-600 hover:bg-blue-700",
    },
};

export function AlertModal({
    isOpen,
    onClose,
    title,
    description,
    variant = "info",
    buttonText = "ตกลง",
}: AlertModalProps) {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-sm bg-white border-slate-200 shadow-2xl rounded-2xl p-8">
                <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
                    {/* Circle Icon */}
                    <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg}`}
                    >
                        <Icon className={`h-8 w-8 ${config.iconColor}`} strokeWidth={2.5} />
                    </div>

                    {/* Hidden title for accessibility */}
                    <AlertDialogTitle className="sr-only">
                        {title || (variant === "success" ? "สำเร็จ" : variant === "error" ? "ข้อผิดพลาด" : variant === "warning" ? "คำเตือน" : "แจ้งเตือน")}
                    </AlertDialogTitle>

                    {/* Message */}
                    <AlertDialogDescription className="text-center text-lg font-medium text-slate-800">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="justify-center pt-4">
                    <AlertDialogAction
                        onClick={onClose}
                        className={`px-8 py-2 text-sm font-medium text-white rounded-xl ${config.buttonClass}`}
                    >
                        {buttonText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
