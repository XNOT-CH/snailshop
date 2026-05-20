"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type ProgressiveImageWindowOptions = {
    totalCount: number;
    initialCount?: number;
    overscan?: number;
    initialDelayMs?: number;
    batchSize?: number;
    batchDelayMs?: number;
};

export function useProgressiveImageWindow(
    containerRef: RefObject<HTMLElement | null>,
    {
        totalCount,
        initialCount = 4,
        overscan = 3,
        initialDelayMs = 0,
        batchSize = 2,
        batchDelayMs = 120,
    }: ProgressiveImageWindowOptions,
) {
    const safeInitialCount = Math.min(totalCount, initialCount);
    const safeBatchSize = Math.max(1, batchSize);
    const shouldDelayInitialWindow = initialDelayMs > 0;
    const [targetCount, setTargetCount] = useState(shouldDelayInitialWindow ? 0 : safeInitialCount);
    const [loadedCount, setLoadedCount] = useState(shouldDelayInitialWindow ? 0 : safeInitialCount);

    const requestImageWindow = useCallback((nextCount: number) => {
        const clampedCount = Math.min(totalCount, Math.max(0, nextCount));
        setTargetCount((current) => Math.max(current, clampedCount));
    }, [totalCount]);

    const refreshImageWindow = useCallback(() => {
        const container = containerRef.current;
        if (!container || totalCount === 0) {
            requestImageWindow(safeInitialCount);
            return;
        }

        const firstItem = container.querySelector<HTMLElement>(":scope > *");
        const itemWidth = firstItem ? firstItem.offsetWidth + 16 : 224;
        const visibleEnd = container.scrollLeft + container.clientWidth;
        const visibleItemCount = Math.ceil(visibleEnd / Math.max(itemWidth, 1));
        const nextLoadedCount = Math.min(
            totalCount,
            Math.max(safeInitialCount, visibleItemCount + overscan),
        );

        requestImageWindow(nextLoadedCount);
    }, [containerRef, overscan, requestImageWindow, safeInitialCount, totalCount]);

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            setLoadedCount((current) => Math.min(current, totalCount));
            setTargetCount(shouldDelayInitialWindow ? 0 : safeInitialCount);
        });
        const timeoutId = shouldDelayInitialWindow
            ? window.setTimeout(() => requestImageWindow(safeInitialCount), initialDelayMs)
            : undefined;

        return () => {
            window.cancelAnimationFrame(frameId);
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [initialDelayMs, requestImageWindow, safeInitialCount, shouldDelayInitialWindow, totalCount]);

    useEffect(() => {
        if (loadedCount >= targetCount) return;

        const timeoutId = window.setTimeout(() => {
            setLoadedCount((current) => Math.min(targetCount, current + safeBatchSize));
        }, loadedCount === 0 ? 0 : batchDelayMs);

        return () => window.clearTimeout(timeoutId);
    }, [batchDelayMs, loadedCount, safeBatchSize, targetCount]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener("scroll", refreshImageWindow, { passive: true });
        window.addEventListener("resize", refreshImageWindow);

        return () => {
            container.removeEventListener("scroll", refreshImageWindow);
            window.removeEventListener("resize", refreshImageWindow);
        };
    }, [containerRef, refreshImageWindow]);

    const shouldLoadImage = useCallback(
        (index: number) => index < loadedCount,
        [loadedCount],
    );

    return { loadedCount, refreshImageWindow, shouldLoadImage };
}
