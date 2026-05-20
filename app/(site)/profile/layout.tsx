import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { HideMainLayout } from "@/components/HideMainLayout";

export const metadata: Metadata = buildPageMetadata({
    title: "ตั้งค่าโปรไฟล์",
    path: "/profile/settings",
    noIndex: true,
});

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <HideMainLayout />
            {children}
        </>
    );
}
