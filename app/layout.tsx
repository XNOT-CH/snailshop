import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBackground } from "@/components/DynamicBackground";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/providers/CartContext";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { SweetAlertProvider } from "@/components/SweetAlertProvider";
import { AnnouncementPopupWrapper } from "@/components/AnnouncementPopupWrapper";
import { GlobalLoading } from "@/components/GlobalLoading";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Manashop - Game ID Marketplace",
    template: "%s | Manashop",
  },
  description: "แหล่งซื้อขายไอดีเกมที่ปลอดภัยที่สุด",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="font-sans antialiased min-h-screen bg-background flex flex-col overflow-x-hidden">
        <ThemeProvider>
          <SweetAlertProvider>
            <CartProvider>
              {/* Dynamic Background Image */}
              <DynamicBackground />

              {/* Dynamic Favicon from Settings */}
              <DynamicFavicon />

              {/* Global Navigation Loading Screen */}
              <Suspense fallback={null}>
                <GlobalLoading />
              </Suspense>

              {/* Navbar */}
              <Navbar />

              {/* Main Content - Responsive Container with Page Transition */}
              <div id="main-container" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
                <main className="animate-page-enter">
                  {children}
                </main>
              </div>

              {/* Footer */}
              <div id="main-footer">
                <Footer />
              </div>

              {/* Floating Chat Button */}
              <div id="main-chat">
                <FloatingChatButton href="https://m.me/61571169820803" />
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


