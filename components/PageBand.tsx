import type { ReactNode } from "react";

// The tinted band fades in and out of the base instead of meeting it at a hard
// edge, so the alternation reads without drawing a line across the page.
const PAGE_BAND_BACKGROUNDS = {
  raised: "linear-gradient(var(--page-base), var(--page-base))",
  plain: "linear-gradient(var(--page-base), var(--page-band) 120px, var(--page-band) calc(100% - 120px), var(--page-base))",
  // First band under the hero or page top: a soft glow that settles into the base.
  lead: "linear-gradient(var(--page-glow), var(--page-base))",
};

// A full-width band in one of the page tones. The background is painted past the
// content column as an outset border-image, so it spans the screen without
// widening the page, and unlike a spread shadow it can carry a gradient.
export function PageBand({
  id,
  tone,
  className = "",
  children,
}: Readonly<{ id?: string; tone: keyof typeof PAGE_BAND_BACKGROUNDS; className?: string; children: ReactNode }>) {
  return (
    <div
      id={id}
      className={`py-14 lg:py-16 ${className}`}
      style={{ borderImage: `${PAGE_BAND_BACKGROUNDS[tone]} fill 0 / 0 / 0 100vmax` }}
    >
      {children}
    </div>
  );
}
