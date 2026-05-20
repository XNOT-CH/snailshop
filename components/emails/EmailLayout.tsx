import {
    Body,
    Container,
    Head,
    Html,
    Preview,
} from "@react-email/components";
import type { ReactNode } from "react";
import {
    emailContainer,
    emailMain,
    type EmailStyle,
} from "@/components/emails/emailStyles";

interface EmailLayoutProps {
    readonly preview: string;
    readonly children: ReactNode;
    readonly bodyStyle?: EmailStyle;
    readonly containerStyle?: EmailStyle;
}

export function EmailLayout({
    preview,
    children,
    bodyStyle = emailMain,
    containerStyle = emailContainer,
}: EmailLayoutProps) {
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    {children}
                </Container>
            </Body>
        </Html>
    );
}
