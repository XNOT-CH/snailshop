import {
    Heading,
    Text,
} from "@react-email/components";
import { EmailLayout } from "@/components/emails/EmailLayout";
import { emailHeading, emailText } from "@/components/emails/emailStyles";

interface NotificationEmailProps {
    title: string;
    message: string;
}

export const NotificationEmail = ({
    title,
    message,
}: Readonly<NotificationEmailProps>) => {
    return (
        <EmailLayout preview={title}>
            <Heading style={emailHeading}>{title}</Heading>
            <Text style={emailText}>{message}</Text>
        </EmailLayout>
    );
};

export default NotificationEmail;
