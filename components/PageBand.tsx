import type { ReactNode } from "react";

// Few tinted zones, each fading one way only: a glow under the page top that
// settles into the base, plain base for the content, and one closing zone that
// deepens toward a straight bottom edge. Bands that faded in and out on both
// ends read as separate puffs of haze down the page.
const PAGE_BAND_BACKGROUNDS = {
  plain: "linear-gradient(var(--page-base), var(--page-base))",
  // First band under the hero or page top: a soft glow that settles into the base.
  lead: "linear-gradient(var(--page-glow), var(--page-base))",
  // A section set apart from the rest: base deepening into the band, ending on a hard edge.
  close: "linear-gradient(var(--page-base), var(--page-band))",
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
