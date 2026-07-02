"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

interface RevealOnScrollProps {
    children: ReactNode;
    index?: number;
    className?: string;
}

const emptySubscribe = () => () => {};

export function RevealOnScroll({ children, index = 0, className }: Readonly<RevealOnScrollProps>) {
    const prefersReduced = useReducedMotion();

    // Only honor the reduced-motion preference after hydration so the first
    // client render matches the server (useReducedMotion is false during SSR).
    const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

    const reduce = hydrated && prefersReduced;

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -120px 0px" }}
            transition={
                reduce
                    ? { duration: 0 }
                    : { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.07 }
            }
        >
            {children}
        </motion.div>
    );
}
