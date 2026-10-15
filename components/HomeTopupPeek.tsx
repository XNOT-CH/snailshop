"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface HomeTopupPeekProps {
  children: ReactNode;
  className?: string;
}

// Plays the hover pose once the first time the art scrolls into view, so
// visitors see there is something behind the card. It sets data-peek for the
// rise plus a short hold, then clears it and the art eases back. Skipped on
// touch screens (they already show the hover frame) and for reduced motion.
export function HomeTopupPeek({ children, className }: Readonly<HomeTopupPeekProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setPeek(true);
          timer = setTimeout(() => setPeek(false), 2200);
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} data-peek={peek || undefined} className={className}>
      {children}
    </div>
  );
}
