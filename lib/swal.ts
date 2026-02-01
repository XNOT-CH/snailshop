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
        showCancelButton: true,
        confirmButtonColor: "#3b82f6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
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
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบเลย",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
    });
    return result.isConfirmed;
};

// Success alert with action
export const showSuccessAlert = (title: string, text?: string) => {
    return Swal.fire({
        icon: "success",
        title,
        text,
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
    });
};

// Error alert
export const showErrorAlert = (title: string, text?: string) => {
    return Swal.fire({
        icon: "error",
        title,
        text,
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "ตกลง",
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
