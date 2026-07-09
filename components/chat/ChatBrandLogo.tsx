import Image from "next/image";
import { cn } from "@/lib/utils";

interface ChatBrandLogoProps {
    className?: string;
}

export function ChatBrandLogo({
    className,
}: Readonly<ChatBrandLogoProps>) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center overflow-hidden rounded-2xl",
                className
            )}
            aria-hidden="true"
        >
            <Image
                src="/chat-snail-icon.webp"
                alt=""
                width={96}
                height={96}
                sizes="96px"
                className="h-full w-full object-contain"
            />
        </span>
    );
}
