/**
 * Tests for lib/actions/user.ts server actions:
 * - updateProfile
 * - getCurrentUserProfile
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) }),
  },
  users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getChanges: vi.fn().mockReturnValue([]),
  AUDIT_ACTIONS: { PROFILE_UPDATE: "PROFILE_UPDATE" },
}));

vi.mock("@/lib/validations/profile", () => ({
  updateProfileSchema: {
    safeParse: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/profile";

const mkSession = (userId?: string) => (
  userId ? { user: { id: userId } } : null
);

// ════════════════════════════════════════════════════════════════
// updateProfile
// ════════════════════════════════════════════════════════════════
describe("lib/actions/user: updateProfile", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when auth session is missing", async () => {
    (auth as any).mockResolvedValue(mkSession(undefined));
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "Test" } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain("เข้าสู่ระบบ");
  });

  it("returns validation error when schema fails", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: false,
      error: { issues: [{ path: ["name"], message: "Name is required" }] },
    });
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "" } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ไม่ถูกต้อง");
    expect(result.errors).toHaveProperty("name");
  });

  it("returns error when user not found in DB", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: { name: "John", email: null, phone: null },
    });
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "John" } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ไม่พบผู้ใช้");
  });

  it("updates profile successfully without password change", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: { name: "John Updated", email: "john@test.com", phone: "0812345678" },
    });
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", name: "John", email: null, image: null, password: "hash",
      firstName: null, lastName: null, firstNameEn: null, lastNameEn: null,
    });
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "John Updated" } as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain("อัปเดตโปรไฟล์เรียบร้อยแล้ว");
  });

  it("updates profile with password change", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: { name: "John", password: "newpass123", email: null, phone: null },
    });
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", name: "John", email: null, image: null, password: "oldhash",
      firstName: null, lastName: null, firstNameEn: null, lastNameEn: null,
    });
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "John", password: "newpass123" } as any);
    expect(result.success).toBe(true);
    expect(result.message).toContain("รหัสผ่าน");
  });

  it("updates profile with image field", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: { name: "Jane", image: "/uploads/avatar.webp", email: null },
    });
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", name: "Jane", email: null, image: null, password: null,
      firstName: null, lastName: null, firstNameEn: null, lastNameEn: null,
    });
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "Jane", image: "/uploads/avatar.webp" } as any);
    expect(result.success).toBe(true);
  });

  it("updates profile with taxAddress fields", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: {
        name: "Jane",
        email: null,
        taxAddress: { fullName: "Jane Doe", phone: "0811111111", address: "123 st.", province: "Bangkok", district: "Bangrak", subdistrict: "Si Lom", postalCode: "10500" },
        shippingAddress: { fullName: "Jane Doe", phone: "0822222222", address: "456 st.", province: "Chiang Mai", district: "Mueang", subdistrict: "Chang Phueak", postalCode: "50300" },
      },
    });
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", name: "Jane", email: null, image: null, password: null,
      firstName: null, lastName: null, firstNameEn: null, lastNameEn: null,
    });
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "Jane" } as any);
    expect(result.success).toBe(true);
  });

  it("returns error when DB throws", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (updateProfileSchema.safeParse as any).mockReturnValue({
      success: true,
      data: { name: "Error User", email: null },
    });
    (db.query.users.findFirst as any).mockRejectedValue(new Error("DB connection lost"));
    const { updateProfile } = await import("@/lib/actions/user");
    const result = await updateProfile({ name: "Error User" } as any);
    expect(result.success).toBe(false);
    expect(result.message).toContain("DB connection lost");
  });
});

// ════════════════════════════════════════════════════════════════
// getCurrentUserProfile
// ════════════════════════════════════════════════════════════════
describe("lib/actions/user: getCurrentUserProfile", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns null when auth session is missing", async () => {
    (auth as any).mockResolvedValue(mkSession(undefined));
    const { getCurrentUserProfile } = await import("@/lib/actions/user");
    const result = await getCurrentUserProfile();
    expect(result).toBeNull();
  });

  it("returns null when user not found in DB", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (db.query.users.findFirst as any).mockResolvedValue(null);
    const { getCurrentUserProfile } = await import("@/lib/actions/user");
    const result = await getCurrentUserProfile();
    expect(result).toBeNull();
  });

  it("returns user profile with creditBalance as string", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (db.query.users.findFirst as any).mockResolvedValue({
      id: "u1", name: "John", username: "john", email: "john@test.com",
      phone: null, image: null, role: "USER", creditBalance: { toString: () => "1500" },
      phoneVerified: null, emailVerified: null,
      firstName: "John", lastName: "Doe", firstNameEn: "John", lastNameEn: "Doe",
      taxFullName: null, taxPhone: null, taxAddress: null, taxProvince: null,
      taxDistrict: null, taxSubdistrict: null, taxPostalCode: null,
      shipFullName: null, shipPhone: null, shipAddress: null, shipProvince: null,
      shipDistrict: null, shipSubdistrict: null, shipPostalCode: null, createdAt: "2026-03-14",
    });
    const { getCurrentUserProfile } = await import("@/lib/actions/user");
    const result = await getCurrentUserProfile();
    expect(result).not.toBeNull();
    expect(result?.creditBalance).toBe("1500");
    expect(result?.name).toBe("John");
  });

  it("returns null when DB throws", async () => {
    (auth as any).mockResolvedValue(mkSession("u1"));
    (db.query.users.findFirst as any).mockRejectedValue(new Error("DB fail"));
    const { getCurrentUserProfile } = await import("@/lib/actions/user");
    const result = await getCurrentUserProfile();
    expect(result).toBeNull();
  });
});
