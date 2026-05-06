import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Text,
} from "@react-email/components";
import * as React from "react";

interface EmailVerificationEmailProps {
    siteName: string;
    verificationUrl: string;
    recipientName?: string | null;
}

export const EmailVerificationEmail = ({
    siteName,
    verificationUrl,
    recipientName,
}: Readonly<EmailVerificationEmailProps>) => {
    const greetingName = recipientName?.trim() || "ผู้ใช้งาน";

    return (
        <Html>
            <Head />
            <Preview>{`ยืนยันอีเมลสำหรับ ${siteName}`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>{`ยืนยันอีเมล / ${siteName}`}</Heading>
                    <Text style={text}>{`สวัสดี ${greetingName}`}</Text>
                    <Text style={text}>
                        กรุณากดปุ่มด้านล่างเพื่อยืนยันว่าอีเมลนี้เป็นของคุณ ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง
                    </Text>
                    <Button href={verificationUrl} style={button}>
                        ยืนยันอีเมล
                    </Button>
                    <Text style={muted}>
                        หากปุ่มใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
                    </Text>
                    <Link href={verificationUrl} style={link}>
                        {verificationUrl}
                    </Link>
                    <Text style={muted}>
                        หากคุณไม่ได้เป็นผู้ขอ สามารถละเว้นอีเมลฉบับนี้ได้
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default EmailVerificationEmail;

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    maxWidth: "560px",
};

const h1 = {
    color: "#1f2937",
    fontSize: "24px",
    fontWeight: "bold",
    padding: "0 48px",
    margin: "40px 0 0",
};

const text = {
    color: "#374151",
    fontSize: "16px",
    lineHeight: "26px",
    padding: "0 48px",
    margin: "20px 0 0",
};

const muted = {
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "24px",
    padding: "0 48px",
    margin: "20px 0 0",
};

const button = {
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

const link = {
    color: "#2563eb",
    display: "block",
    fontSize: "13px",
    lineHeight: "22px",
    padding: "0 48px",
    wordBreak: "break-all" as const,
};
