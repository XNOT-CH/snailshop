const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

function isEnvFlagEnabled(value: string | undefined) {
    if (!value) {
        return false;
    }

    return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

function parseRetryAfterSeconds(value: string | undefined) {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 60;
    }

    return parsed;
}

export type MaintenanceScope = "gacha" | "purchase" | "topup";

export function getMaintenanceState(scope: MaintenanceScope) {
    const upperScope = scope.toUpperCase();
    const enabled =
        isEnvFlagEnabled(process.env.MAINTENANCE_MODE)
        || isEnvFlagEnabled(process.env[`MAINTENANCE_MODE_${upperScope}`]);

    return {
        enabled,
        message:
            process.env[`MAINTENANCE_MESSAGE_${upperScope}`]
            || process.env.MAINTENANCE_MESSAGE
            || "ระบบกำลังปิดปรับปรุงชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง",
        retryAfterSeconds: parseRetryAfterSeconds(process.env.MAINTENANCE_RETRY_AFTER_SECONDS),
    };
}
