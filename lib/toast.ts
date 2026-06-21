export type ToastKind = "success" | "error" | "warning" | "info";

export type ToastPayload = {
    id: number;
    kind: ToastKind;
    title: string;
    duration: number;
};

type ToastListener = (toast: ToastPayload) => void;

const listeners = new Set<ToastListener>();
let nextToastId = 1;

export function emitToast(kind: ToastKind, title: string, duration = 3200): boolean {
    if (listeners.size === 0) {
        return false;
    }

    const toast = {
        id: nextToastId++,
        kind,
        title,
        duration,
    };

    queueMicrotask(() => {
        listeners.forEach((listener) => listener(toast));
    });

    return true;
}

export function subscribeToToasts(listener: ToastListener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
