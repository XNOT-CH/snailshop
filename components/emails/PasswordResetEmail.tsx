import {
    Button,
    Heading,
    Link,
    Text,
} from "@react-email/components";
import { EmailLayout } from "@/components/emails/EmailLayout";
import {
    emailBreakAllLink,
    emailMutedText,
    emailNarrowContainer,
    emailPrimaryButton,
    emailTransactionalHeading,
    emailTransactionalText,
} from "@/components/emails/emailStyles";

interface PasswordResetEmailProps {
    siteName: string;
    resetUrl: string;
    recipientName?: string | null;
}

export const PasswordResetEmail = ({
    siteName,
    resetUrl,
    recipientName,
}: Readonly<PasswordResetEmailProps>) => {
    const greetingName = recipientName?.trim() || "ผู้ใช้งาน";

    return (
        <EmailLayout preview={`รีเซ็ตรหัสผ่านสำหรับ ${siteName}`} containerStyle={emailNarrowContainer}>
            <Heading style={emailTransactionalHeading}>{`รีเซ็ตรหัสผ่าน / ${siteName}`}</Heading>
            <Text style={emailTransactionalText}>{`สวัสดี ${greetingName}`}</Text>
            <Text style={emailTransactionalText}>
                เราได้รับคำขอให้รีเซ็ตรหัสผ่านของบัญชีคุณ หากคุณเป็นผู้ทำรายการนี้ ให้กดปุ่มด้านล่างภายใน 30 นาที
            </Text>
            <Button href={resetUrl} style={emailPrimaryButton}>
                ตั้งรหัสผ่านใหม่
            </Button>
            <Text style={emailMutedText}>
                หากปุ่มใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
            </Text>
            <Link href={resetUrl} style={emailBreakAllLink}>
                {resetUrl}
            </Link>
            <Text style={emailMutedText}>
                หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน สามารถละเว้นอีเมลฉบับนี้ได้ทันที
            </Text>
        </EmailLayout>
    );
};

export default PasswordResetEmail;
