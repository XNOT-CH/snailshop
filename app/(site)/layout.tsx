import "sweetalert2/dist/sweetalert2.min.css";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/providers/CartContext";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { FloatingChatButtonWrapper } from "@/components/FloatingChatButtonWrapper";
import { AnnouncementPopupWrapper } from "@/components/AnnouncementPopupWrapper";
import { GlobalLoadingWrapper } from "@/components/GlobalLoadingWrapper";
import { StructuredData } from "@/components/StructuredData";
import { FloatingPromoBanner } from "@/components/FloatingPromoBanner";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { RouteShell } from "@/components/RouteShell";
import { getSiteSettings } from "@/lib/getSiteSettings";
import {
  DEFAULT_SITE_DESCRIPTION,
  absoluteUrl,
  resolveSiteName,
  toAbsoluteAssetUrl,
} from "@/lib/seo";

export default async function SiteLayout({
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
    <>
      <StructuredData data={structuredData} />
      <ThemeProvider>
        <ToastProvider>
          <CartProvider initialAuthenticated={Boolean(session?.user)}>
            <DynamicBackground
              backgroundImage={settings?.backgroundImage}
              backgroundBlur={settings?.backgroundBlur}
            />
            <GlobalLoadingWrapper />
            <RouteShell
              navbar={<Navbar />}
              mobileBottomNav={<MobileBottomNav />}
              footer={<Footer />}
              floatingChat={<FloatingChatButtonWrapper />}
              floatingPromo={<FloatingPromoBanner />}
              announcementPopup={<AnnouncementPopupWrapper enabled={Boolean(session?.user)} />}
            >
              {children}
            </RouteShell>
          </CartProvider>
        </ToastProvider>
      </ThemeProvider>
    </>
  );
}
