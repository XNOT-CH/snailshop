import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TurnstileWidget } from "@/components/TurnstileWidget";

interface TurnstileFieldProps {
    readonly enabled: boolean;
    readonly error: string | null;
    readonly resetSignal: number;
    readonly onTokenChange: (token: string | null) => void;
    /** True once Cloudflare has handed back a token; until then the form waits. */
    readonly verified: boolean;
}

export function TurnstileField({
    enabled,
    error,
    resetSignal,
    onTokenChange,
    verified,
}: TurnstileFieldProps) {
    if (!enabled) {
        return null;
    }

    return (
        <div className="space-y-2">
            <TurnstileWidget
                onTokenChange={onTokenChange}
                resetSignal={resetSignal}
            />
            {!verified && !error ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    กำลังตรวจสอบ รอแป๊บนึง
                </p>
            ) : null}
            {error ? (
                <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
}
