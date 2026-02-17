import Swal from "sweetalert2";

// Custom SweetAlert Toast (สำหรับแจ้งเตือนเล็กๆ)
const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
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
            popup: "rounded-2xl",
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
        title: "ยืนยันการลบ?",
        html: `คุณต้องการลบ <strong>"${itemName}"</strong> ใช่หรือไม่?<br><small class="text-red-500">การกระทำนี้ไม่สามารถยกเลิกได้</small>`,
        icon: "warning",
        width: "min(92vw, 32rem)",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบเลย",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
        customClass: {
            popup: "rounded-2xl",
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
        icon: "success",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-2xl",
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
        title: "ยืนยันการซื้อ?",
        html: `คุณต้องการซื้อ ${params.productName ? `<strong>${params.productName}</strong> ` : ""}ในราคา <strong>${params.priceText}</strong> ใช่หรือไม่?${params.extraHtml ? `<br>${params.extraHtml}` : ""}`,
        icon: "question",
        width: "min(92vw, 36rem)",
        showCancelButton: true,
        confirmButtonColor: params.confirmButtonColor || "#3b82f6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: params.confirmText || "ซื้อเลย",
        cancelButtonText: params.cancelText || "ยกเลิก",
        reverseButtons: true,
        customClass: {
            popup: "rounded-2xl",
            actions: "flex flex-row gap-2 w-full",
            confirmButton: "flex-1 rounded-xl px-6 py-2",
            cancelButton: "flex-1 rounded-xl px-6 py-2",
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
}) => {
    return Swal.fire({
        icon: "success",
        title: params.title || "ซื้อสำเร็จ",
        text: params.text,
        html:
            params.html ||
            (params.productName
                ? `ซื้อ <strong>${params.productName}</strong> เรียบร้อยแล้ว<br><small>ดูข้อมูลบัญชีได้ที่ประวัติการสั่งซื้อ</small>`
                : undefined),
        width: "min(92vw, 36rem)",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: params.confirmText || "ตกลง",
        customClass: {
            popup: "rounded-2xl",
            actions: "w-full",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

// Purchase success popup (centered modal with green button)
export const showPurchaseSuccess = (title: string, text?: string) => {
    return Swal.fire({
        icon: "success",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#22c55e",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-2xl",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

// Error alert
export const showErrorAlert = (title: string, text?: string) => {
    return Swal.fire({
        icon: "error",
        title,
        text,
        width: "min(92vw, 32rem)",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
        customClass: {
            popup: "rounded-2xl",
            confirmButton: "w-full sm:w-auto rounded-xl px-8 py-2",
        },
    });
};

// Loading
export const showLoading = (title = "กำลังดำเนินการ...") => {
    Swal.fire({
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

export default Swal;
