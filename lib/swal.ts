import Swal from "sweetalert2";

const modalDefaults = {
    scrollbarPadding: false,
    heightAuto: false,
} as const;

// Custom SweetAlert Toast (สำหรับแจ้งเตือนเล็ก ๆ)
const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

// Toast functions
export const showSuccess = (message: string) => {
    Toast.fire({
        icon: "success",
        title: message,
    });
};

export const showError = (message: string) => {
    Toast.fire({
        icon: "error",
        title: message,
    });
};

export const showWarning = (message: string) => {
    Toast.fire({
        icon: "warning",
        title: message,
    });
};

export const showInfo = (message: string) => {
    Toast.fire({
        icon: "info",
        title: message,
    });
};

// Confirm dialog
export const showConfirm = async (
    title: string,
    text: string,
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก"
): Promise<boolean> => {
    const result = await Swal.fire({
        ...modalDefaults,
        title,
        text,
        icon: "warning",
        width: "min(92vw, 32rem)",
        showCancelButton: true,
        confirmButtonColor: "#3b82f6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            actions: "flex flex-col sm:flex-row gap-2 w-full",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
            cancelButton: "w-full sm:w-auto rounded-xl px-6 py-2",
        },
    });
    return result.isConfirmed;
};

// Delete confirm (red theme)
export const showDeleteConfirm = async (
    itemName: string
): Promise<boolean> => {
    const result = await Swal.fire({
        ...modalDefaults,
        title: "ยืนยันการลบ?",
        html: `คุณต้องการลบ <strong>"${itemName}"</strong> ใช่หรือไม่?`,
        icon: "warning",
        width: "min(92vw, 32rem)",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบเลย",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            actions: "flex flex-col sm:flex-row gap-2 w-full",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
            cancelButton: "w-full sm:w-auto rounded-xl px-6 py-2",
        },
    });
    return result.isConfirmed;
};

// Success alert with action
export const showSuccessAlert = (title: string, text?: string) => {
    return Swal.fire({
        ...modalDefaults,
        icon: "success",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

export const showPurchaseConfirm = async (params: {
    productName?: string;
    priceText: string;
    extraHtml?: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonColor?: string;
}): Promise<boolean> => {
    const result = await Swal.fire({
        ...modalDefaults,
        title: "ยืนยันการสั่งซื้อ",
        html: `
            <div class="text-center space-y-6">
                <div class="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                        <path d="M3 6h18"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                </div>

                <div class="max-w-sm mx-auto bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <p class="text-sm text-gray-500 mb-1">รายการสั่งซื้อ</p>
                    ${params.productName ? `<p class="font-bold text-gray-900 text-base">${params.productName}</p>` : ""}
                    <div class="font-semibold text-blue-500 text-xl mt-2">
                        ${params.priceText}
                    </div>
                    ${params.extraHtml ? `<div class="mt-3 text-sm text-gray-500 border-t border-gray-200 pt-3">${params.extraHtml}</div>` : ""}
                </div>
            </div>
        `,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonColor: params.confirmButtonColor || "#3b82f6", // blue-500
        cancelButtonColor: "#e5e7eb", // gray-200
        confirmButtonText: params.confirmText || "ยืนยันการสั่งซื้อ",
        cancelButtonText: params.cancelText || "ยกเลิก",
        reverseButtons: true,
        customClass: {
            icon: "hidden",
            title: "hidden",
            htmlContainer: "!my-0",
            popup: "rounded-3xl !px-6 sm:!px-8 !py-8",
            actions: "grid grid-cols-2 gap-4 w-full mt-4",
            confirmButton: "!rounded-xl !py-2.5 !px-6 font-semibold text-white shadow-md hover:bg-blue-600 transition-all",
            cancelButton: "!rounded-xl !py-2.5 !px-6 font-semibold !text-gray-600 hover:bg-gray-300 transition-all",
        },
    });

    return result.isConfirmed;
};

export const showPurchaseSuccessModal = (params: {
    productName?: string;
    title?: string;
    text?: string;
    html?: string;
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
}) => {
    return Swal.fire({
        ...modalDefaults,
        icon: "success",
        title: params.title || "ซื้อสำเร็จ",
        text: params.text,
        html:
            params.html ||
            (params.productName
                ? `ซื้อ <strong>${params.productName}</strong> เรียบร้อยแล้ว<br><small>ดูข้อมูลสินค้าได้ที่หน้าคลังสินค้า</small>`
                : undefined),
        width: "min(92vw, 36rem)",
        showCancelButton: params.showCancelButton ?? false,
        confirmButtonColor: "#3b82f6",
        confirmButtonText: params.confirmText || "ตกลง",
        cancelButtonText: params.cancelText || "อยู่หน้านี้",
        reverseButtons: true,
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            title: "!text-3xl !font-bold",
            htmlContainer: "!text-lg",
            actions: "flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2 !text-base",
            cancelButton: "w-full sm:w-auto rounded-xl px-8 py-2 !text-base",
        },
    });
};

// Purchase success popup (centered modal with green button)
export const showPurchaseSuccess = (title: string, text?: string) => {
    return Swal.fire({
        ...modalDefaults,
        icon: "success",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#22c55e",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

// Error alert
export const showErrorAlert = (title: string, text?: string) => {
    return Swal.fire({
        ...modalDefaults,
        icon: "error",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

// Loading
export const showLoading = (title = "กำลังดำเนินการ...") => {
    Swal.fire({
        ...modalDefaults,
        title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        },
    });
};

export const hideLoading = () => {
    Swal.close();
};

export const showPinPrompt = async (actionLabel = "ยืนยันรายการ"): Promise<string | null> => {
    const result = await Swal.fire({
        ...modalDefaults,
        title: actionLabel,
        html: `
            <div class="space-y-3 text-left">
                <p class="text-sm text-slate-500">กรุณากรอก PIN 6 หลักเพื่อดำเนินการต่อ</p>
                <input
                    id="swal-pin-input"
                    inputmode="numeric"
                    maxlength="6"
                    autocomplete="one-time-code"
                    class="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-blue-500"
                    placeholder="000000"
                />
            </div>
        `,
        width: "min(92vw, 28rem)",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
        focusConfirm: false,
        customClass: {
            popup: "rounded-3xl !p-6 sm:!p-8",
            actions: "flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
            cancelButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
        didOpen: () => {
            const input = document.getElementById("swal-pin-input") as HTMLInputElement | null;
            input?.focus();
            input?.addEventListener("input", () => {
                input.value = input.value.replace(/\D/g, "").slice(0, 6);
            });
        },
        preConfirm: () => {
            const input = document.getElementById("swal-pin-input") as HTMLInputElement | null;
            const value = input?.value?.trim() ?? "";
            if (!/^\d{6}$/.test(value)) {
                Swal.showValidationMessage("กรุณากรอก PIN 6 หลัก");
                return null;
            }
            return value;
        },
    });

    return result.isConfirmed ? result.value : null;
};

export default Swal;


