import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { DynamicBackground } from "@/components/DynamicBackground";
import { DynamicFavicon } from "@/components/DynamicFavicon";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GameStore - Game ID Marketplace",
  description: "แหล่งซื้อขายไอดีเกมที่ปลอดภัยที่สุด",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={notoSansThai.variable} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-background flex flex-col">
        <ThemeProvider>
          {/* Dynamic Background Image */}
          <DynamicBackground />

          {/* Dynamic Favicon from Settings */}
          <DynamicFavicon />

          {/* Navbar */}
          <Navbar />

          {/* Main Content - Responsive Container with Page Transition */}
          <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <main className="animate-page-enter">
              {children}
            </main>
          </div>

          {/* Footer */}
          <Footer />

          {/* Toaster */}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
