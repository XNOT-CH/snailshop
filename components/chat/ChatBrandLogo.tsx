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
                "inline-flex items-center justify-center overflow-hidden rounded-[18px]",
                className
            )}
            aria-hidden="true"
        >
            <Image
                src="/chat-snail.png"
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
            />
        </span>
    );
}
