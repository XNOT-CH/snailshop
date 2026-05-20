import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { resolveSiteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Welcome",
  description: "หน้าแนะนำร้านแบบเต็มหน้าจอ",
};

export default async function WelcomePage() {
  const settings = await getSiteSettings();
  const siteName = resolveSiteName(settings?.heroTitle || "Snail Shop");
  const heroDescriptionLines = [
    "แหล่งรวมไอดีเกมและกาชาพรีเมียม ที่ SnailShop",
    "เราเน้นระบบที่ใช้งานง่ายและปลอดภัย เพื่อให้คุณช้อปได้รวดเร็วและมั่นใจ 100%",
  ];

  return (
    <section className="snail-welcome-page relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden text-white">
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
              href="/home"
              className="snail-welcome-cta inline-flex items-center justify-center rounded-full bg-[#ffd21f] font-black text-[#0c2877] shadow-[0_20px_45px_rgba(8,34,95,0.3)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#ffdd47] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
            >
              เข้าสู่หน้าแรก
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
