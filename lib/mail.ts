import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async ({
    to,
    subject,
    react,
}: {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
}) => {
    try {
        if (!resend) {
            console.warn("[mail] RESEND_API_KEY is not configured. Email send skipped.");
            return { success: false, error: "RESEND_API_KEY is not configured" };
        }

        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev", // Resend default test address
            to,
            subject,
            react,
        });

        if (error) {
            console.error("Failed to send email:", error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
};
