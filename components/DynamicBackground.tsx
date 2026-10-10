import Image from "next/image";

interface DynamicBackgroundProps {
    backgroundImage?: string | null;
    backgroundBlur?: boolean | null;
}

export function DynamicBackground({
    backgroundImage,
    backgroundBlur,
}: Readonly<DynamicBackgroundProps>) {
    const isBlur = backgroundBlur ?? true;

    if (!backgroundImage) {
        return <div className="pointer-events-none fixed inset-0 -z-10 bg-background sm:hidden" aria-hidden="true" />;
    }

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            {/* Background Image */}
            <Image
                src={backgroundImage}
                alt=""
                fill
                sizes="100vw"
                quality={70}
                loading="lazy"
                fetchPriority="low"
                className={`pointer-events-none object-cover object-center ${isBlur ? "scale-[1.02] opacity-75" : ""}`}
                aria-hidden="true"
            />
            {/* Overlay: heavier when blurred, lighter when clear */}
            <div
                className={`pointer-events-none absolute inset-0 ${
                    isBlur
                        ? "bg-background/70 dark:bg-background/82"
                        : "bg-background/36 dark:bg-background/56"
                }`}
            />
        </div>
    );
}

