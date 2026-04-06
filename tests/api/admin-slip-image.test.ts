import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";

vi.mock("@/lib/auth", () => ({
  isAdmin: vi.fn(),
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
  resolveStoredSlipPath: vi.fn(),
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
    const { resolveStoredSlipPath } = await import("@/lib/slipStorage");
    const tempDir = path.join(process.cwd(), "storage", "tmp-tests");
    const tempFile = path.join(tempDir, "admin-slip-image.webp");

    (isAdmin as any).mockResolvedValue({ success: true, userId: "admin-1" });
    (db.query.topups.findFirst as any).mockResolvedValue({
      id: "t1",
      proofImage: "/private/slips/example.webp",
    });
    await mkdir(tempDir, { recursive: true });
    await writeFile(tempFile, Buffer.from("image-bytes"));
    (resolveStoredSlipPath as any).mockReturnValue(tempFile);

    const { GET } = await import("@/app/api/admin/slips/[id]/image/route");
    const res = await GET(new NextRequest("http://localhost/api/admin/slips/t1/image"), {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    await rm(tempFile, { force: true });
  });
});
