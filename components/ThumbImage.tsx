"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { getThumbImageUrl } from "@/lib/imageUrl";

type ThumbImageProps = Omit<ImageProps, "src" | "onError"> & {
    src: string;
    /** Called when both the thumb and the full image fail to load. */
    onFinalError?: () => void;
    /** Pulses a grey box in the image's place until it has loaded (fill images only). */
    skeleton?: boolean;
};

/**
 * Renders the 640px thumb variant of a managed upload and falls back to the
 * full image for uploads that predate thumbnails (or when the thumb is
 * missing). Non-upload URLs pass through unchanged.
 */
export function ThumbImage({ src, alt, onFinalError, skeleton = false, ...props }: Readonly<ThumbImageProps>) {
    const [activeSrc, setActiveSrc] = useState(() => getThumbImageUrl(src) ?? src);
    const [prevSrc, setPrevSrc] = useState(src);
    const [loaded, setLoaded] = useState(false);

    if (prevSrc !== src) {
        setPrevSrc(src);
        setActiveSrc(getThumbImageUrl(src) ?? src);
        setLoaded(false);
    }

    return (
        <>
            {skeleton && !loaded ? <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-muted" /> : null}
            <Image
                {...props}
                src={activeSrc}
                alt={alt}
                onLoad={(event) => {
                    setLoaded(true);
                    props.onLoad?.(event);
                }}
                onError={() => {
                    if (activeSrc !== src) {
                        setActiveSrc(src);
                    } else {
                        setLoaded(true);
                        onFinalError?.();
                    }
                }}
            />
        </>
    );
}
