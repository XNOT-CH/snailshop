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
        return <div className="pointer-events-none fixed inset-0 -z-10 bg-[#eaf2fb] dark:bg-[#08111c] sm:hidden" aria-hidden="true" />;
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
                        ? "bg-gradient-to-b from-[#f5f9ff]/74 via-[#edf4fb]/68 to-[#e8f0fa]/62 dark:from-[#101a2c]/86 dark:via-[#0c1727]/80 dark:to-[#09111c]/76"
                        : "bg-gradient-to-b from-[#f5f9ff]/42 via-[#edf4fb]/36 to-[#e8f0fa]/30 dark:from-[#101a2c]/62 dark:via-[#0c1727]/54 dark:to-[#09111c]/48"
                }`}
            />
        </div>
    );
}

