import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { TurnstileField } from "@/components/auth/TurnstileField";

vi.mock("next/image", () => ({
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
        const { alt = "", ...rest } = props;
        return React.createElement("img", { ...rest, alt });
    },
}));

vi.mock("@/components/TurnstileWidget", () => ({
    TurnstileWidget: ({
        onTokenChange,
        resetSignal,
    }: {
        onTokenChange: (token: string | null) => void;
        resetSignal: number;
    }) => (
        <button
            type="button"
            data-reset-signal={resetSignal}
            onClick={() => onTokenChange("token-123")}
        >
            turnstile-widget
        </button>
    ),
}));

describe("components/auth shared components", () => {
    it("renders the shared auth shell with the same title, subtitle, logo, and content slots", () => {
        const { container } = render(
            <AuthFormShell logoUrl="/logo.png" title="เข้าสู่ระบบ" subtitle="Login">
                <form aria-label="login form">content</form>
            </AuthFormShell>
        );

        expect(screen.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeInTheDocument();
        expect(screen.getByText("Login")).toBeInTheDocument();
        // The logo is decorative (alt="") since the heading names the page.
        expect(container.querySelector('img[src*="logo.png"]')).not.toBeNull();
        expect(screen.getByRole("form", { name: "login form" })).toBeInTheDocument();
    });

    it("renders the fallback icon container when no logo is configured", () => {
        const { container } = render(
            <AuthFormShell logoUrl={null} title="สมัครสมาชิก" subtitle="Register">
                <div>content</div>
            </AuthFormShell>
        );

        expect(screen.getByRole("heading", { name: "สมัครสมาชิก" })).toBeInTheDocument();
        expect(container.querySelector("img")).toBeNull();
    });

    it("renders Turnstile with error copy only when enabled and forwards token changes", () => {
        const onTokenChange = vi.fn();

        render(
            <TurnstileField
                enabled
                error="กรุณายืนยันว่าไม่ใช่บอทก่อนเข้าสู่ระบบ"
                resetSignal={2}
                onTokenChange={onTokenChange}
                verified={false}
            />
        );

        const widget = screen.getByRole("button", { name: "turnstile-widget" });
        expect(widget).toHaveAttribute("data-reset-signal", "2");
        expect(screen.getByText("กรุณายืนยันว่าไม่ใช่บอทก่อนเข้าสู่ระบบ")).toBeInTheDocument();

        fireEvent.click(widget);
        expect(onTokenChange).toHaveBeenCalledWith("token-123");
    });

    it("does not render Turnstile markup when disabled", () => {
        render(
            <TurnstileField
                enabled={false}
                error="hidden error"
                resetSignal={0}
                onTokenChange={vi.fn()}
                verified={false}
            />
        );

        expect(screen.queryByRole("button", { name: "turnstile-widget" })).not.toBeInTheDocument();
        expect(screen.queryByText("hidden error")).not.toBeInTheDocument();
    });

    it("says it is checking until Cloudflare has verified", () => {
        const props = { enabled: true, error: null, resetSignal: 0, onTokenChange: vi.fn() };
        const { rerender } = render(<TurnstileField {...props} verified={false} />);

        expect(screen.getByText("กำลังตรวจสอบ รอแป๊บนึง")).toBeInTheDocument();

        rerender(<TurnstileField {...props} verified />);
        expect(screen.queryByText("กำลังตรวจสอบ รอแป๊บนึง")).not.toBeInTheDocument();
    });
});
