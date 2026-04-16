type TurnstileVerificationResult = {
    success: boolean;
    message?: string;
};

type TurnstileResponse = {
    success: boolean;
    "error-codes"?: string[];
};

export async function verifyTurnstileToken(
    token: string | undefined,
    ipAddress?: string
): Promise<TurnstileVerificationResult> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
        return { success: true };
    }

    if (!token) {
        return {
            success: false,
            message: "กรุณายืนยันว่าไม่ใช่บอทก่อนดำเนินการ",
        };
    }

    const body = new URLSearchParams({
        secret: secretKey,
        response: token,
    });

    if (ipAddress && ipAddress !== "unknown") {
        body.set("remoteip", ipAddress);
    }

    try {
        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body,
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return {
                success: false,
                message: "ไม่สามารถตรวจสอบความปลอดภัยได้ กรุณาลองใหม่",
            };
        }

        const result = (await response.json()) as TurnstileResponse;

        if (result.success) {
            return { success: true };
        }

        return {
            success: false,
            message: "การยืนยันความปลอดภัยไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        };
    } catch {
        return {
            success: false,
            message: "ไม่สามารถเชื่อมต่อระบบยืนยันความปลอดภัยได้ กรุณาลองใหม่",
        };
    }
}
