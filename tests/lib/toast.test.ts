import { describe, expect, it, vi } from "vitest";
import { emitToast, subscribeToToasts } from "@/lib/toast";

describe("lib/toast", () => {
    it("returns false when no toast provider is subscribed", () => {
        expect(emitToast("info", "No provider")).toBe(false);
    });

    it("notifies subscribed toast listeners after the current render tick", async () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToToasts(listener);

        expect(emitToast("success", "Saved")).toBe(true);
        expect(listener).not.toHaveBeenCalled();

        await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            kind: "success",
            title: "Saved",
            duration: 3200,
        })));

        unsubscribe();
    });

    it("does not notify a listener that unsubscribes before delivery", async () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToToasts(listener);

        expect(emitToast("success", "Saved")).toBe(true);
        unsubscribe();

        await new Promise((resolve) => queueMicrotask(resolve));
        expect(listener).not.toHaveBeenCalled();
    });

    it("stops notifying unsubscribed listeners", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToToasts(listener);
        unsubscribe();

        expect(emitToast("error", "Hidden")).toBe(false);
        expect(listener).not.toHaveBeenCalled();
    });

    it("uses the default toast duration", async () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToToasts(listener);

        emitToast("warning", "Careful");

        await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            kind: "warning",
            title: "Careful",
            duration: 3200,
        })));

        unsubscribe();
    });
});
