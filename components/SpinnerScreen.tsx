import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type SpinnerScreenProps = Readonly<{
    /** ข้อความใต้ spinner เช่น "กำลังโหลด..." */
    label?: string;
    /** true = เต็มหน้าจอแบบ fixed overlay, false = เต็มพื้นที่ container (ค่าเริ่มต้น) */
    fullScreen?: boolean;
    className?: string;
}>;

/**
 * Spinner กึ่งกลางจอสำหรับหน้าที่ต้องรอโหลดนานหน่อย
 * ใช้ได้ทั้งใน loading.tsx ของ route หรือ render แบบมีเงื่อนไขในหน้า client
 */
export function SpinnerScreen({
    label = "กำลังโหลด...",
    fullScreen = false,
    className,
}: SpinnerScreenProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex flex-col items-center justify-center gap-3 text-muted-foreground",
                fullScreen
                    ? "fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm"
                    : "min-h-[50vh] w-full",
                className
            )}
        >
            <Spinner className="size-8 text-primary" />
            {label ? <p className="text-sm font-medium">{label}</p> : null}
        </div>
    );
}
