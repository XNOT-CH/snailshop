export interface DismissablePopup {
    id: string;
    dismissOption: string;
}

export const POPUP_DISMISS_STORAGE_KEY = "popup_dismissed_until";
export const POPUP_DISMISS_DURATION_MS = 60 * 60 * 1000;

interface PopupDismissState {
    dismissUntil: number;
    popupIds: string[];
}

function readDismissState(): PopupDismissState | null {
    if (typeof globalThis.window === "undefined") return null;

    const rawValue = localStorage.getItem(POPUP_DISMISS_STORAGE_KEY);
    if (!rawValue) return null;

    try {
        const parsed = JSON.parse(rawValue) as Partial<PopupDismissState>;
        if (
            typeof parsed.dismissUntil !== "number" ||
            !Array.isArray(parsed.popupIds) ||
            parsed.popupIds.some((id) => typeof id !== "string")
        ) {
            localStorage.removeItem(POPUP_DISMISS_STORAGE_KEY);
            return null;
        }

        return {
            dismissUntil: parsed.dismissUntil,
            popupIds: parsed.popupIds,
        };
    } catch {
        const legacyDismissUntil = Number.parseInt(rawValue, 10);
        if (Number.isNaN(legacyDismissUntil)) {
            localStorage.removeItem(POPUP_DISMISS_STORAGE_KEY);
            return null;
        }

        return {
            dismissUntil: legacyDismissUntil,
            popupIds: [],
        };
    }
}

export function clearPopupDismissal() {
    if (typeof globalThis.window === "undefined") return;
    localStorage.removeItem(POPUP_DISMISS_STORAGE_KEY);
}

export function savePopupDismissal(popups: DismissablePopup[]) {
    if (typeof globalThis.window === "undefined") return;

    localStorage.setItem(POPUP_DISMISS_STORAGE_KEY, JSON.stringify({
        dismissUntil: Date.now() + POPUP_DISMISS_DURATION_MS,
        popupIds: popups.map((popup) => popup.id),
    }));
}

export function shouldShowPopup(popups: DismissablePopup[]) {
    if (popups.length === 0 || typeof globalThis.window === "undefined") return false;

    const dismissOption = popups[0]?.dismissOption || "show_always";
    if (dismissOption !== "hide_1_hour") {
        clearPopupDismissal();
        return true;
    }

    const dismissState = readDismissState();
    if (!dismissState) return true;

    if (Date.now() >= dismissState.dismissUntil) {
        clearPopupDismissal();
        return true;
    }

    const activePopupIds = popups.map((popup) => popup.id).sort((a, b) => a.localeCompare(b));
    const dismissedPopupIds = [...dismissState.popupIds].sort((a, b) => a.localeCompare(b));

    if (
        dismissedPopupIds.length === activePopupIds.length &&
        dismissedPopupIds.every((id, index) => id === activePopupIds[index])
    ) {
        return false;
    }

    clearPopupDismissal();
    return true;
}
