import { Alert, AlertDescription } from "@/components/ui/alert";
import { TurnstileWidget } from "@/components/TurnstileWidget";

interface TurnstileFieldProps {
    readonly enabled: boolean;
    readonly error: string | null;
    readonly resetSignal: number;
    readonly onTokenChange: (token: string | null) => void;
}

export function TurnstileField({
    enabled,
    error,
    resetSignal,
    onTokenChange,
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
            {error ? (
                <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : null}
        </div>
    );
}
