import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Kanit } from "next/font/google";
import { getSiteSettings } from "@/lib/getSiteSettings";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE_PATH,
  SITE_LOCALE,
  absoluteUrl,
  getBaseUrl,
  resolveSiteName,
  toAbsoluteAssetUrl,
} from "@/lib/seo";
import { getOptimizedUploadSrc } from "@/lib/imageUrl";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-kanit",
});

// Runs before the browser restores scroll, so it has to be an inline script
// rather than a useEffect. Two unrelated jobs share it because a second inline
// script would be a second thing to hand a CSP nonce to.
//
// 1. Disable automatic scroll restoration. It was restoring the previous
//    position (with an overshoot while the layout was still settling), making
//    the page visibly jump on refresh.
// 2. Warn about self-XSS. The scam is to tell a player they can get free
//    credit by pasting something here; pasted code runs as them and can take
//    the account. The warning cannot stop someone determined to paste, but it
//    is the one console risk that is real.
const SCROLL_AND_CONSOLE_WARNING = [
  'window.history.scrollRestoration = "manual";',
  'console.log("%cหยุด!", "color:#e11d48;font-size:38px;font-weight:bold");',
  'console.log("%cถ้ามีคนบอกให้คุณ copy โค้ดมาวางตรงนี้ นั่นคือการโกง เขากำลังขโมยบัญชีของคุณ อย่าวางเด็ดขาด", "font-size:15px");',
].join("");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = resolveSiteName(settings?.heroTitle);
  const siteDescription = settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION;
  const siteTitle = `${siteName} - Game ID Marketplace`;
  // The stored logo is a full-size upload (can be 100KB+); browsers fetch the
  // favicon on every cold page view, so serve a 128px optimizer variant.
  const faviconUrl = toAbsoluteAssetUrl(
    settings?.logoUrl ? getOptimizedUploadSrc(settings.logoUrl, 128, 75) : settings?.logoUrl,
  );
  const socialImage =
    toAbsoluteAssetUrl(settings?.ogImageUrl || settings?.bannerImage1 || settings?.logoUrl) ||
    absoluteUrl(DEFAULT_OG_IMAGE_PATH);

  return {
    metadataBase: new URL(getBaseUrl()),
    title: {
      default: siteTitle,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: absoluteUrl("/"),
      siteName,
      locale: SITE_LOCALE,
      type: "website",
      images: [
        {
          url: socialImage,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [socialImage],
    },
    ...(faviconUrl
      ? {
          icons: {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          },
        }
      : {}),
    robots: {
      index: true,
      follow: true,
    },
    other: {
      // App มี dark mode ของตัวเองอยู่แล้ว สั่งให้ Dark Reader ไม่แก้ DOM
      // ป้องกัน hydration mismatch จาก --darkreader-inline-* ที่ extension เติมเข้ามา
      "darkreader-lock": "",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by middleware.ts, which also puts it in this request's CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="th"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={kanit.variable}
    >
      <body className="font-sans antialiased min-h-screen bg-background flex flex-col">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: SCROLL_AND_CONSOLE_WARNING }}
        />
        {children}
      </body>
    </html>
  );
}
