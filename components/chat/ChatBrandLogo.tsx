import { cn } from "@/lib/utils";

interface ChatBrandLogoProps {
    className?: string;
    bubbleClassName?: string;
}

export function ChatBrandLogo({
    className,
    bubbleClassName,
}: Readonly<ChatBrandLogoProps>) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center rounded-[18px] bg-[#1185f7] shadow-lg shadow-blue-500/20",
                className
            )}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 28 28"
                className={cn("h-6 w-6 text-white", bubbleClassName)}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M14 6.5C8.96 6.5 5 9.98 5 14.15C5 16.44 6.18 18.45 8.17 19.8C8.05 21.05 7.49 22.34 6.44 23.31C8.18 23.15 9.92 22.45 11.28 21.35C12.15 21.62 13.06 21.76 14 21.76C19.04 21.76 23 18.29 23 14.15C23 9.98 19.04 6.5 14 6.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}
