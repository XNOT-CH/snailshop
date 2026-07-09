"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { getThumbImageUrl, shouldBypassImageOptimization } from "@/lib/imageUrl";

type ThumbImageProps = Omit<ImageProps, "src" | "onError"> & {
    src: string;
    /** Called when both the thumb and the full image fail to load. */
    onFinalError?: () => void;
};

/**
 * Renders the 640px thumb variant of a managed upload and falls back to the
 * full image for uploads that predate thumbnails (or when the thumb is
 * missing). Non-upload URLs pass through unchanged.
 */
export function ThumbImage({ src, alt, onFinalError, ...props }: Readonly<ThumbImageProps>) {
    const [activeSrc, setActiveSrc] = useState(() => getThumbImageUrl(src) ?? src);
    const [prevSrc, setPrevSrc] = useState(src);

    if (prevSrc !== src) {
        setPrevSrc(src);
        setActiveSrc(getThumbImageUrl(src) ?? src);
    }

    return (
        <Image
            {...props}
            src={activeSrc}
            alt={alt}
            unoptimized={shouldBypassImageOptimization(activeSrc)}
            onError={() => {
                if (activeSrc !== src) {
                    setActiveSrc(src);
                } else {
                    onFinalError?.();
                }
            }}
        />
    );
}
