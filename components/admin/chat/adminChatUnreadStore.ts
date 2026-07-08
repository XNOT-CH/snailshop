"use client";

// Module-level singleton store for the admin chat unread count, shared by the
// sidebar badge, tab-title updater, and notification effects. A single poller
// runs no matter how many components subscribe (the sidebar renders twice:
// desktop aside + mobile sheet).

export interface AdminChatUnreadState {
    totalUnread: number;
    unreadConversations: number;
    loaded: boolean;
}

const POLL_INTERVAL_MS = 15_000;
const NOTIFY_PREF_STORAGE_KEY = "admin-chat-notify";

let state: AdminChatUnreadState = { totalUnread: 0, unreadConversations: 0, loaded: false };
const listeners = new Set<() => void>();
let subscriberCount = 0;
let pollTimer: number | null = null;
let isFetching = false;

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

async function poll() {
    if (isFetching || document.visibilityState !== "visible") {
        return;
    }

    isFetching = true;

    try {
        const response = await fetch("/api/admin/chat/unread-count", { cache: "no-store" });

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        const totalUnread = Number(data.totalUnread ?? 0);
        const unreadConversations = Number(data.unreadConversations ?? 0);

        if (!state.loaded || state.totalUnread !== totalUnread || state.unreadConversations !== unreadConversations) {
            state = { totalUnread, unreadConversations, loaded: true };
            emit();
        }
    } catch {
        // Silent: the poll retries on the next tick.
    } finally {
        isFetching = false;
    }
}

function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
        void poll();
    }
}

function start() {
    void poll();
    pollTimer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
}

function stop() {
    if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
    }

    document.removeEventListener("visibilitychange", handleVisibilityChange);
}

export function subscribeAdminChatUnread(listener: () => void) {
    listeners.add(listener);
    subscriberCount += 1;

    if (subscriberCount === 1) {
        start();
    }

    return () => {
        listeners.delete(listener);
        subscriberCount -= 1;

        if (subscriberCount === 0) {
            stop();
        }
    };
}

export function getAdminChatUnreadSnapshot() {
    return state;
}

export function getAdminChatUnreadServerSnapshot(): AdminChatUnreadState {
    return { totalUnread: 0, unreadConversations: 0, loaded: false };
}

export function refreshAdminChatUnreadNow() {
    void poll();
}

export function isChatNotifyEnabled() {
    try {
        return window.localStorage.getItem(NOTIFY_PREF_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

export function setChatNotifyEnabled(enabled: boolean) {
    try {
        window.localStorage.setItem(NOTIFY_PREF_STORAGE_KEY, enabled ? "1" : "0");
    } catch {
        // Ignore storage failures (private mode etc.).
    }
}

/** Short two-tone ping via WebAudio so no sound asset is needed. */
export function playChatPing() {
    try {
        const AudioContextCtor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextCtor) {
            return;
        }

        const context = new AudioContextCtor();
        const gain = context.createGain();

        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
        gain.connect(context.destination);

        const playTone = (frequency: number, startAt: number) => {
            const oscillator = context.createOscillator();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, context.currentTime + startAt);
            oscillator.connect(gain);
            oscillator.start(context.currentTime + startAt);
            oscillator.stop(context.currentTime + startAt + 0.18);
        };

        playTone(880, 0);
        playTone(1174.66, 0.14);

        window.setTimeout(() => void context.close(), 600);
    } catch {
        // Audio is best-effort only.
    }
}
