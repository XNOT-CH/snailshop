import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/getSiteSettings";
import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  toAbsoluteAssetUrl,
} from "@/lib/seo";

export const alt = "Site preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function canRenderOgAsset(value?: string | null) {
  if (!value) return false;
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("data:");
}

export default async function OpenGraphImage() {
  const settings = await getSiteSettings();
  const siteName = settings?.heroTitle?.trim() || SITE_NAME;
  const description = settings?.heroDescription?.trim() || DEFAULT_SITE_DESCRIPTION;
  const bannerImage = canRenderOgAsset(settings?.ogImageUrl || settings?.bannerImage1)
    ? toAbsoluteAssetUrl(settings?.ogImageUrl || settings?.bannerImage1)
    : undefined;
  const logoUrl = canRenderOgAsset(settings?.logoUrl)
    ? toAbsoluteAssetUrl(settings?.logoUrl)
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #031525 0%, #0d4f8f 55%, #38bdf8 100%)",
          color: "#ffffff",
          overflow: "hidden",
        }}
      >
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={siteName}
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: bannerImage
              ? "linear-gradient(90deg, rgba(2, 6, 23, 0.88) 0%, rgba(2, 6, 23, 0.7) 44%, rgba(2, 6, 23, 0.2) 100%)"
              : "linear-gradient(135deg, rgba(2, 6, 23, 0.25) 0%, rgba(2, 6, 23, 0.1) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "52px 56px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${siteName} logo`}
                width={80}
                height={80}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 20,
                  background: "rgba(255, 255, 255, 0.14)",
                  padding: 8,
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 80,
                  height: 80,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                  background: "rgba(255, 255, 255, 0.16)",
                  fontSize: 36,
                  fontWeight: 700,
                }}
              >
                {siteName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  opacity: 0.82,
                }}
              >
                {absoluteUrl("/").replace(/^https?:\/\//, "")}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                บริการเกมออนไลน์
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 720,
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 72,
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              {siteName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                lineHeight: 1.35,
                opacity: 0.94,
              }}
            >
              {description}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
