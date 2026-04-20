import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementPopup from "@/components/AnnouncementPopup";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

const popupPayload = [
  {
    id: "popup-1",
    title: "Promo popup",
    imageUrl: "/uploads/popups/promo.webp",
    linkUrl: "http://127.0.0.1:3000",
    dismissOption: "hide_1_hour",
  },
];

async function flushPopupCycle(delayMs = 0) {
  await act(async () => {
    await Promise.resolve();
    if (delayMs > 0) {
      vi.advanceTimersByTime(delayMs);
    }
    await Promise.resolve();
  });
}

describe("AnnouncementPopup timing dismissal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(popupPayload),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("stays hidden until the dismiss duration expires, then shows again after refresh", async () => {
    const firstRender = render(<AnnouncementPopup />);

    await flushPopupCycle();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/popups");

    await flushPopupCycle(500);

    const closeButton = screen.getByRole("button", { name: "ปิด" });
    fireEvent.click(closeButton);

    const dismissedUntil = localStorage.getItem("popup_dismissed_until");
    expect(dismissedUntil).not.toBeNull();
    expect(Number(dismissedUntil)).toBe(Date.now() + 60 * 60 * 1000);

    firstRender.unmount();
    vi.clearAllMocks();
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(popupPayload),
    });

    const secondRender = render(<AnnouncementPopup />);

    await flushPopupCycle(600);

    expect(screen.queryByRole("button", { name: "ปิด" })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-04-11T13:00:01.000Z"));

    secondRender.unmount();
    vi.clearAllMocks();
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(popupPayload),
    });

    render(<AnnouncementPopup />);

    await flushPopupCycle();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/popups");

    await flushPopupCycle(500);

    expect(screen.getByRole("button", { name: "ปิด" })).toBeInTheDocument();
    expect(localStorage.getItem("popup_dismissed_until")).toBeNull();
  }, 10000);
});
