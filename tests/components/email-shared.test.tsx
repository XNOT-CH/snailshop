import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "@/components/emails/EmailLayout";
import EmailVerificationEmail from "@/components/emails/EmailVerificationEmail";
import NotificationEmail from "@/components/emails/NotificationEmail";
import PasswordResetEmail from "@/components/emails/PasswordResetEmail";
import PurchaseReceiptEmail from "@/components/emails/PurchaseReceiptEmail";
import {
    emailContainer,
    emailMain,
    emailNarrowContainer,
    emailPrimaryButton,
    emailTransactionalText,
} from "@/components/emails/emailStyles";

describe("components/emails shared layout/styles", () => {
    it("keeps shared email style constants compatible with the previous template values", () => {
        expect(emailMain).toMatchObject({
            backgroundColor: "#f6f9fc",
            fontFamily: expect.stringContaining("Segoe UI"),
        });
        expect(emailContainer).toMatchObject({
            backgroundColor: "#ffffff",
            margin: "0 auto",
            padding: "20px 0 48px",
            marginBottom: "64px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        });
        expect(emailNarrowContainer).toMatchObject({
            ...emailContainer,
            maxWidth: "560px",
        });
        expect(emailTransactionalText).toMatchObject({
            color: "#374151",
            margin: "20px 0 0",
        });
        expect(emailPrimaryButton).toMatchObject({
            backgroundColor: "#2563eb",
            margin: "28px 48px 0",
        });
    });

    it("renders the shared layout with preview, body, container, and children", () => {
        render(
            <EmailLayout preview="Preview text">
                <Heading>Shared title</Heading>
                <Text>Shared message</Text>
            </EmailLayout>
        );

        expect(screen.getByText("Preview text")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Shared title" })).toBeInTheDocument();
        expect(screen.getByText("Shared message")).toBeInTheDocument();
    });

    it("renders verification and password reset content without changing links or copy", () => {
        render(
            <>
                <EmailVerificationEmail
                    siteName="SNAILSHOP"
                    verificationUrl="https://example.com/verify"
                    recipientName="Alice"
                />
                <PasswordResetEmail
                    siteName="SNAILSHOP"
                    resetUrl="https://example.com/reset"
                    recipientName="Bob"
                />
            </>
        );

        expect(screen.getByRole("heading", { name: "ยืนยันอีเมล / SNAILSHOP" })).toBeInTheDocument();
        expect(screen.getByText("สวัสดี Alice")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://example.com/verify" })).toHaveAttribute("href", "https://example.com/verify");
        expect(screen.getByRole("heading", { name: "รีเซ็ตรหัสผ่าน / SNAILSHOP" })).toBeInTheDocument();
        expect(screen.getByText("สวัสดี Bob")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://example.com/reset" })).toHaveAttribute("href", "https://example.com/reset");
    });

    it("renders notification and purchase receipt content with existing props", () => {
        render(
            <>
                <NotificationEmail title="แจ้งเตือน" message="มีข้อความใหม่" />
                <PurchaseReceiptEmail
                    siteName="SNAILSHOP"
                    userName="Alice"
                    orderCount={1}
                    totalTHB={100}
                    totalPoints={0}
                    items={[{ productName: "Game Key", price: 100, currency: "THB" }]}
                />
            </>
        );

        expect(screen.getByRole("heading", { name: "แจ้งเตือน" })).toBeInTheDocument();
        expect(screen.getByText("มีข้อความใหม่")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "ใบเสร็จรับเงิน / SNAILSHOP" })).toBeInTheDocument();
        expect(screen.getByText("สวัสดีคุณ Alice,")).toBeInTheDocument();
        expect(screen.getByText("Game Key")).toBeInTheDocument();
    });
});
