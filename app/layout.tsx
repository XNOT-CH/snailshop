import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBackground } from "@/components/DynamicBackground";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/providers/CartContext";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { SweetAlertProvider } from "@/components/SweetAlertProvider";
import { AnnouncementPopupWrapper } from "@/components/AnnouncementPopupWrapper";
import { GlobalLoadingWrapper } from "@/components/GlobalLoadingWrapper";
import { StructuredData } from "@/components/StructuredData";
import { getSiteSettings } from "@/lib/getSiteSettings";
import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  absoluteUrl,
  getBaseUrl,
  toAbsoluteAssetUrl,
} from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const logoUrl = toAbsoluteAssetUrl(settings?.logoUrl);
  const heroDescription = settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      ...(logoUrl ? { logo: logoUrl } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      inLanguage: "th",
      description: heroDescription,
    },
  ];

  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth">
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
              <div id="main-container" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
                <main className="animate-page-enter min-w-0">
                  {children}
                </main>
              </div>

              {/* Footer */}
              <div id="main-footer">
                <Footer />
              </div>

              {/* Floating Chat Button */}
              <div id="main-chat">
                <FloatingChatButton />
              </div>

              {/* Announcement Popup - Client Side Only */}
              <div id="main-popup">
                <AnnouncementPopupWrapper />
              </div>
            </CartProvider>
          </SweetAlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
