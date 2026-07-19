import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WelcomeSeenMarker } from "@/components/WelcomeSeenMarker";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getOptimizedUploadSrc } from "@/lib/imageUrl";
import { resolveSiteName } from "@/lib/seo";
import { WELCOME_SEEN_COOKIE } from "@/lib/welcomeCookie";
import { normalizeWelcomeStripImages } from "@/lib/welcomeStrip";

export const metadata: Metadata = {
  title: "Welcome",
  description: "หน้าแนะนำร้านแบบเต็มหน้าจอ",
  // Override the layout-wide default canonical ("/") — this splash must not
  // present itself as the homepage.
  alternates: {
    canonical: "/welcome",
  },
  // A first-visit splash must never be indexed — before this, Google indexed
  // it as the homepage because "/" used to redirect cookie-less visitors here.
  robots: {
    index: false,
    follow: true,
  },
};

type WelcomePageProps = {
  searchParams?: Promise<{
    preview?: string;
  }>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const isPreview = params?.preview === "1";

  if (!isPreview && cookieStore.has(WELCOME_SEEN_COOKIE)) {
    redirect("/");
  }

  const settings = await getSiteSettings();
  const siteName = resolveSiteName(settings?.heroTitle || "Snail Shop");
  const heroDescriptionLines = [
    "แหล่งรวมไอดีเกมและกาชาพรีเมียม ที่ SnailShop",
    "เราเน้นระบบที่ใช้งานง่ายและปลอดภัย เพื่อให้คุณช้อปได้รวดเร็วและมั่นใจ 100%",
  ];
  const welcomeStripImages = normalizeWelcomeStripImages(settings?.welcomeStripImagesJson).filter(
    (imageUrl) => imageUrl !== "",
  );
  // The marquee loops by shifting the track exactly one set width, so each set
  // must be wider than any viewport or a blank seam shows on wide screens.
  const marqueeMinIconsPerSet = 32;
  const marqueeImages =
    welcomeStripImages.length > 0
      ? Array.from(
          { length: Math.ceil(marqueeMinIconsPerSet / welcomeStripImages.length) },
          () => welcomeStripImages,
        ).flat()
      : [];

  return (
    <section className="snail-welcome-page relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden text-white">
      {!isPreview && <WelcomeSeenMarker />}
      <div className="snail-welcome-bg absolute inset-0" aria-hidden="true" />
      <div className="snail-welcome-glow absolute inset-0" aria-hidden="true" />
      <div className="snail-welcome-stripe snail-welcome-stripe-left" aria-hidden="true" />
      <div className="snail-welcome-stripe snail-welcome-stripe-right" aria-hidden="true" />

      <div className="snail-welcome-inner relative z-10 flex w-full flex-col items-center text-center">
        <div className="snail-welcome-copy">
          <h1 className="snail-welcome-title text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
            {siteName.toUpperCase()}
          </h1>
          <p className="snail-welcome-heading text-[#ffd21f] drop-shadow-[0_10px_24px_rgba(9,42,117,0.35)]">
            ยินดีต้อนรับ
          </p>
          <div className="snail-welcome-subtitle-wrap text-white/88">
            {heroDescriptionLines.map((line, index) => (
              <p
                key={line}
                className="snail-welcome-subtitle-line"
                style={{ animationDelay: `${0.95 + index * 0.32}s` }}
              >
                <span className="snail-welcome-subtitle">{line}</span>
              </p>
            ))}
          </div>

          <div className="snail-welcome-cta-row">
            <Link
              href="/"
              className="snail-welcome-cta inline-flex items-center justify-center rounded-full bg-[#ffd21f] font-black text-[#0c2877] shadow-[0_20px_45px_rgba(8,34,95,0.3)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#ffdd47] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
            >
              เข้าสู่หน้าแรก
            </Link>
          </div>
        </div>
      </div>

      {welcomeStripImages.length > 0 ? (
      <div className="snail-welcome-frame-band absolute inset-x-0 z-10" aria-hidden="true">
        <div className="snail-welcome-frame-track">
          {[0, 1].map((set) => (
            <div key={set} className="snail-welcome-frame-set">
              {marqueeImages.map((imageUrl, frame) => (
                <div key={`${set}-${frame}`} className="snail-welcome-frame">
                  {/* Frames render at ~71px max; request a 256px optimizer
                      variant instead of the raw full-size upload. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getOptimizedUploadSrc(imageUrl, 256, 65)} alt="" className="snail-welcome-frame-image" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      ) : null}
    </section>
  );
}
