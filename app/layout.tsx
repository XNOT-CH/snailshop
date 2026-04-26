import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBackground } from "@/components/DynamicBackground";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/providers/CartContext";
import { FloatingChatButtonWrapper } from "@/components/FloatingChatButtonWrapper";
import { SweetAlertProvider } from "@/components/SweetAlertProvider";
import { AnnouncementPopupWrapper } from "@/components/AnnouncementPopupWrapper";
import { GlobalLoadingWrapper } from "@/components/GlobalLoadingWrapper";
import { StructuredData } from "@/components/StructuredData";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-prompt",
});

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
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const settings = await getSiteSettings();
  const siteName = resolveSiteName(settings?.heroTitle);
  const logoUrl = toAbsoluteAssetUrl(settings?.logoUrl);
  const heroDescription = settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl("/"),
      ...(logoUrl ? { logo: logoUrl } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
      inLanguage: "th",
      description: heroDescription,
    },
  ];

  return (
    <html
      lang="th"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={prompt.variable}
    >
      <body className="font-sans antialiased min-h-screen bg-background flex flex-col">
        <StructuredData data={structuredData} />
        <ThemeProvider>
          <SweetAlertProvider>
            <CartProvider>
              {/* Dynamic Background Image */}
              <DynamicBackground />

              {/* Dynamic Favicon from Settings */}
              <DynamicFavicon />

              {/* Global Navigation Loading Screen - client-only, no SSR to avoid hydration mismatch */}
              <GlobalLoadingWrapper />

              {/* Navbar */}
              <Navbar />

              {/* Main Content - Responsive Container with Page Transition */}
              <div id="main-container" className="flex-1 w-full max-w-7xl mx-auto px-3 pb-[calc(var(--mobile-bottom-nav-height)+0.75rem)] sm:px-4 md:pb-0 lg:px-6 xl:px-8">
                <main className="animate-page-enter min-w-0">
                  {children}
                </main>
              </div>

              <MobileBottomNav />

              {/* Footer */}
              <div id="main-footer">
                <Footer />
              </div>

              {/* Floating Chat Button */}
              <div id="main-chat">
                <FloatingChatButtonWrapper />
              </div>

              {/* Announcement Popup - Client Side Only */}
              <div id="main-popup">
                <AnnouncementPopupWrapper enabled={Boolean(session?.user)} />
              </div>
            </CartProvider>
          </SweetAlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
