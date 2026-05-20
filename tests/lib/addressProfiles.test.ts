import { beforeEach, describe, expect, it, vi } from "vitest";

const updateWhereMock = vi.fn().mockResolvedValue({});
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const insertValuesMock = vi.fn().mockResolvedValue({});
const deleteWhereMock = vi.fn().mockResolvedValue({});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userAddressProfiles: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({ set: updateSetMock })),
    insert: vi.fn(() => ({ values: insertValuesMock })),
    delete: vi.fn(() => ({ where: deleteWhereMock })),
  },
  userAddressProfiles: {
    id: "id",
    userId: "userId",
    isDefaultTax: "isDefaultTax",
    isDefaultShipping: "isDefaultShipping",
    createdAt: "createdAt",
  },
  users: { id: "userId" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((value) => ({ desc: value })),
  eq: vi.fn((left, right) => ({ left, right })),
}));

vi.mock("@/lib/auditLog", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { PROFILE_UPDATE: "PROFILE_UPDATE" },
}));

vi.mock("@/lib/sensitiveData", () => ({
  decryptAddressProfileSensitiveFields: vi.fn((record) => record),
  encryptAddressProfileSensitiveFields: vi.fn((record) => record),
  encryptUserSensitiveFields: vi.fn((record) => record),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";

describe("lib/actions/addressProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockResolvedValue({});
    insertValuesMock.mockResolvedValue({});
    deleteWhereMock.mockResolvedValue({});
  });

  it("requires authentication before listing address profiles", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const { getUserAddressProfiles } = await import("@/lib/actions/addressProfiles");
    const result = await getUserAddressProfiles();

    expect(result.success).toBe(false);
    expect(result.message).toContain("เข้าสู่ระบบ");
  });

  it("returns decrypted address profiles for the current user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(db.query.userAddressProfiles.findMany).mockResolvedValue([
      {
        id: "addr1",
        label: "บ้าน",
        kind: "shipping",
        fullName: "สมชาย ใจดี",
        phone: "0812345678",
        address: "1 ถนนหลัก",
        province: "กรุงเทพมหานคร",
        district: "บางรัก",
        subdistrict: "สีลม",
        postalCode: "10500",
        taxId: null,
        isDefaultTax: false,
        isDefaultShipping: true,
        createdAt: "2026-05-19 10:00:00",
        updatedAt: "2026-05-19 10:00:00",
      },
    ] as any);

    const { getUserAddressProfiles } = await import("@/lib/actions/addressProfiles");
    const result = await getUserAddressProfiles();

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toMatchObject({
      id: "addr1",
      label: "บ้าน",
      isDefaultShipping: true,
    });
  });

  it("rejects invalid tax ids before saving", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const { saveUserAddressProfile } = await import("@/lib/actions/addressProfiles");
    const result = await saveUserAddressProfile({
      label: "บริษัท",
      kind: "tax",
      fullName: "สมชาย ใจดี",
      phone: "0812345678",
      address: "1 ถนนหลัก",
      province: "กรุงเทพมหานคร",
      district: "บางรัก",
      subdistrict: "สีลม",
      postalCode: "10500",
      taxId: "123",
      isDefaultTax: true,
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveProperty("taxId");
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("saves a default tax profile and syncs legacy user tax fields", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(db.query.userAddressProfiles.findFirst).mockResolvedValue({
      id: "addr1",
      label: "บริษัท",
      kind: "tax",
      fullName: "สมชาย ใจดี",
      phone: "0812345678",
      address: "1 ถนนหลัก",
      province: "กรุงเทพมหานคร",
      district: "บางรัก",
      subdistrict: "สีลม",
      postalCode: "10500",
      taxId: "1234567890123",
      isDefaultTax: true,
      isDefaultShipping: false,
      createdAt: "2026-05-19 10:00:00",
      updatedAt: "2026-05-19 10:00:00",
    } as any);

    const { saveUserAddressProfile } = await import("@/lib/actions/addressProfiles");
    const result = await saveUserAddressProfile({
      label: "บริษัท",
      kind: "tax",
      fullName: "สมชาย ใจดี",
      phone: "0812345678",
      address: "1 ถนนหลัก",
      province: "กรุงเทพมหานคร",
      district: "บางรัก",
      subdistrict: "สีลม",
      postalCode: "10500",
      taxId: "1234567890123",
      isDefaultTax: true,
    });

    expect(result.success).toBe(true);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      label: "บริษัท",
      kind: "tax",
      isDefaultTax: true,
    }));
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      taxFullName: "สมชาย ใจดี",
      taxPhone: "0812345678",
      taxAddress: "1 ถนนหลัก",
    }));
  });
});
