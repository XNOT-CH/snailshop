import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
} from "@react-email/components";
import * as React from "react";

interface NotificationEmailProps {
    title: string;
    message: string;
}

export const NotificationEmail = ({
    title,
    message,
}: Readonly<NotificationEmailProps>) => {
    return (
        <Html>
            <Head />
            <Preview>{title}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>{title}</Heading>
                    <Text style={text}>{message}</Text>
                </Container>
            </Body>
        </Html>
    );
};

export default NotificationEmail;

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
};

const h1 = {
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
    padding: "0 48px",
    margin: "40px 0 0",
};

const text = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "26px",
    padding: "0 48px",
    margin: "24px 0 40px",
};
