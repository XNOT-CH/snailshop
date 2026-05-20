import type { CSSProperties } from "react";

export type EmailStyle = CSSProperties;

export const emailMain: EmailStyle = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

export const emailContainer: EmailStyle = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

export const emailNarrowContainer: EmailStyle = {
    ...emailContainer,
    maxWidth: "560px",
};

export const emailHeading: EmailStyle = {
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
    padding: "0 48px",
    margin: "40px 0 0",
};

export const emailTransactionalHeading: EmailStyle = {
    ...emailHeading,
    color: "#1f2937",
};

export const emailReceiptHeading: EmailStyle = {
    ...emailHeading,
    margin: "30px 0 15px",
};

export const emailText: EmailStyle = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "26px",
    padding: "0 48px",
    margin: "24px 0 40px",
};

export const emailTransactionalText: EmailStyle = {
    ...emailText,
    color: "#374151",
    margin: "20px 0 0",
};

export const emailReceiptText: EmailStyle = {
    ...emailText,
    margin: "10px 0",
};

export const emailMutedText: EmailStyle = {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "24px",
    padding: "0 48px",
    margin: "20px 0 0",
};

export const emailPrimaryButton: EmailStyle = {
    backgroundColor: "#2563eb",
    borderRadius: "10px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "600",
    margin: "28px 48px 0",
    padding: "14px 24px",
    textDecoration: "none",
};

export const emailBreakAllLink: EmailStyle = {
    color: "#2563eb",
    display: "block",
    fontSize: "13px",
    lineHeight: "22px",
    padding: "0 48px",
    wordBreak: "break-all" as const,
};
