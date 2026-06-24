export interface DismissablePopup {
    id: string;
    dismissOption: string;
}

// localStorage — survives browser restarts (used by "once" and "hide_1_hour").
export const POPUP_DISMISS_STORAGE_KEY = "popup_dismissed_until";
// sessionStorage — cleared when the tab/browser closes (used by "session").
export const POPUP_SESSION_STORAGE_KEY = "popup_seen_session";
export const POPUP_DISMISS_DURATION_MS = 60 * 60 * 1000;

type SeenRecord = {
    ids: string[];
    // Epoch ms after which the record is stale; null = no expiry.
    expiresAt: number | null;
};

function getDismissOption(popups: DismissablePopup[]) {
    return popups[0]?.dismissOption || "show_always";
}

function sortedIds(popups: DismissablePopup[]) {
    return popups.map((popup) => popup.id).sort((a, b) => a.localeCompare(b));
}

function idsMatch(a: string[], b: string[]) {
    return a.length === b.length && a.every((id, index) => id === b[index]);
}

// Where a given dismiss option persists its "seen" record, or null when the
// option should never be remembered ("show_always" / unknown values).
function getSeenStorage(option: string): { store: Storage; key: string } | null {
    if (typeof globalThis.window === "undefined") return null;
    if (option === "session") return { store: sessionStorage, key: POPUP_SESSION_STORAGE_KEY };
    if (option === "once" || option === "hide_1_hour") return { store: localStorage, key: POPUP_DISMISS_STORAGE_KEY };
    return null;
}

function readSeenRecord(store: Storage, key: string): SeenRecord | null {
    const rawValue = store.getItem(key);
    if (!rawValue) return null;

    try {
        const parsed = JSON.parse(rawValue) as Partial<SeenRecord>;
        if (!Array.isArray(parsed.ids) || parsed.ids.some((id) => typeof id !== "string")) {
            store.removeItem(key);
            return null;
        }
        if (parsed.expiresAt !== null && typeof parsed.expiresAt !== "number") {
            store.removeItem(key);
            return null;
        }

        return { ids: parsed.ids, expiresAt: parsed.expiresAt ?? null };
    } catch {
        store.removeItem(key);
        return null;
    }
}

export function clearPopupDismissal() {
    if (typeof globalThis.window === "undefined") return;
    localStorage.removeItem(POPUP_DISMISS_STORAGE_KEY);
    sessionStorage.removeItem(POPUP_SESSION_STORAGE_KEY);
}

/**
 * Record that the current popup set has been seen, so it isn't shown again for
 * the configured window. No-op for "show_always". Called both when the popup is
 * first displayed (so navigating away doesn't re-trigger it) and on close.
 */
export function markPopupSeen(popups: DismissablePopup[]) {
    if (popups.length === 0) return;

    const target = getSeenStorage(getDismissOption(popups));
    if (!target) return;

    const expiresAt = getDismissOption(popups) === "hide_1_hour"
        ? Date.now() + POPUP_DISMISS_DURATION_MS
        : null;

    const record: SeenRecord = { ids: sortedIds(popups), expiresAt };
    target.store.setItem(target.key, JSON.stringify(record));
}

export function shouldShowPopup(popups: DismissablePopup[]) {
    if (popups.length === 0 || typeof globalThis.window === "undefined") return false;

    const target = getSeenStorage(getDismissOption(popups));
    if (!target) return true; // show_always — always show

    const record = readSeenRecord(target.store, target.key);
    if (!record) return true;

    // Window elapsed (hide_1_hour) — show again and drop the stale record.
    if (record.expiresAt !== null && Date.now() >= record.expiresAt) {
        target.store.removeItem(target.key);
        return true;
    }

    // The active popups differ from the dismissed set (admin changed them) —
    // treat as new and show again.
    if (!idsMatch(record.ids, sortedIds(popups))) {
        target.store.removeItem(target.key);
        return true;
    }

    return false;
}
