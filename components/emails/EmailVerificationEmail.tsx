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
        <EmailLayout preview={`ยืนยันอีเมลสำหรับ ${siteName}`} containerStyle={emailNarrowContainer}>
            <Heading style={emailTransactionalHeading}>{`ยืนยันอีเมล / ${siteName}`}</Heading>
            <Text style={emailTransactionalText}>{`สวัสดี ${greetingName}`}</Text>
            <Text style={emailTransactionalText}>
                กรุณากดปุ่มด้านล่างเพื่อยืนยันว่าอีเมลนี้เป็นของคุณ ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง
            </Text>
            <Button href={verificationUrl} style={emailPrimaryButton}>
                ยืนยันอีเมล
            </Button>
            <Text style={emailMutedText}>
                หากปุ่มใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:
            </Text>
            <Link href={verificationUrl} style={emailBreakAllLink}>
                {verificationUrl}
            </Link>
            <Text style={emailMutedText}>
                หากคุณไม่ได้เป็นผู้ขอ สามารถละเว้นอีเมลฉบับนี้ได้
            </Text>
        </EmailLayout>
    );
};

export default EmailVerificationEmail;
