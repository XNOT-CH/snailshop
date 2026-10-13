import Image from "next/image";
import { cn } from "@/lib/utils";

// The "SNAILSHOP" lettering from the brand logo, used where the site name used
// to be set as text. Navy art, so dark mode flattens it to white.
export function BrandWordmark({ alt, className }: Readonly<{ alt: string; className?: string }>) {
    return (
        <Image
            src="/brand/snailshop-wordmark.png"
            alt={alt}
            width={1026}
            height={120}
            className={cn("w-auto dark:brightness-0 dark:invert", className)}
        />
    );
}
