import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { isAdminMock } = vi.hoisted(() => ({
  isAdminMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isAdmin: isAdminMock,
  isAdminWithCsrf: isAdminMock,
  requirePermission: isAdminMock,
  requirePermissionWithCsrf: isAdminMock,
  requireAnyPermission: isAdminMock,
  requireAnyPermissionWithCsrf: isAdminMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      topups: {
        findFirst: vi.fn(),
      },
    },
  },
  topups: {
    id: "id",
  },
}));

vi.mock("@/lib/sensitiveData", () => ({
  decryptTopupSensitiveFields: vi.fn((value) => value),
}));

vi.mock("@/lib/slipStorage", () => ({
  readStoredSlipFile: vi.fn(),
}));

describe("API: /api/admin/slips/[id]/image", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when caller is not admin", async () => {
    const { isAdmin } = await import("@/lib/auth");
    (isAdmin as any).mockResolvedValue({ success: false, error: "Unauthorized" });
    const { GET } = await import("@/app/api/admin/slips/[id]/image/route");
    const res = await GET(new NextRequest("http://localhost/api/admin/slips/t1/image"), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });

  it("streams the slip image for admins", async () => {
    const { isAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { readStoredSlipFile } = await import("@/lib/slipStorage");

    (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
    (db.query.topups.findFirst as any).mockResolvedValue({
      id: "t1",
      proofImage: "/private/slips/example.webp",
    });
    (readStoredSlipFile as any).mockResolvedValue({
      body: new Uint8Array(Buffer.from("image-bytes")).buffer,
      contentType: "image/webp",
      filename: "admin-slip-image.webp",
      size: 11,
    });

    const { GET } = await import("@/app/api/admin/slips/[id]/image/route");
    const res = await GET(new NextRequest("http://localhost/api/admin/slips/t1/image"), {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
  });
});
