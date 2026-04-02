import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 5 }]) }),
    query: {
      auditLogs: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
  auditLogs: {
    userId: "userId",
    action: "action",
    resource: "resource",
    createdAt: "createdAt",
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-from-session" } }),
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-01-01 00:00:00"),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  lt: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

import { db } from "@/lib/db";

describe("lib/auditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports AUDIT_ACTIONS constants", async () => {
    const { AUDIT_ACTIONS } = await import("@/lib/auditLog");
    expect(AUDIT_ACTIONS.LOGIN).toBe("LOGIN");
    expect(AUDIT_ACTIONS.PRODUCT_CREATE).toBe("PRODUCT_CREATE");
    expect(AUDIT_ACTIONS.PURCHASE).toBe("PURCHASE");
  });

  describe("getChanges", () => {
    it("detects changed fields", async () => {
      const { getChanges } = await import("@/lib/auditLog");
      const old = { name: "Old", price: "100" };
      const updated = { name: "New", price: "100" };
      const changes = getChanges(old, updated);
      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("name");
      expect(changes[0].oldValue).toBe("Old");
      expect(changes[0].newValue).toBe("New");
    });

    it("handles null old data", async () => {
      const { getChanges } = await import("@/lib/auditLog");
      const changes = getChanges(null, { name: "New" });
      expect(changes).toHaveLength(1);
      expect(changes[0].oldValue).toBeNull();
    });

    it("respects fieldsToTrack filter", async () => {
      const { getChanges } = await import("@/lib/auditLog");
      const old = { name: "Old", price: "100" };
      const updated = { name: "New", price: "200" };
      const changes = getChanges(old, updated, ["name"]);
      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("name");
    });

    it("skips undefined values", async () => {
      const { getChanges } = await import("@/lib/auditLog");
      const old = { name: "Old" };
      const changes = getChanges(old, { name: undefined });
      expect(changes).toHaveLength(0);
    });
  });

  describe("createAuditLog", () => {
    it("inserts a log entry", async () => {
      const { createAuditLog, AUDIT_ACTIONS } = await import("@/lib/auditLog");
      await createAuditLog({
        userId: "user-1",
        action: AUDIT_ACTIONS.LOGIN,
        ipAddress: "127.0.0.1",
      });
      expect(db.insert).toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      (db.insert as any).mockReturnValueOnce({ values: vi.fn().mockRejectedValue(new Error("DB error")) });
      const { createAuditLog, AUDIT_ACTIONS } = await import("@/lib/auditLog");
      // Should not throw
      await expect(createAuditLog({ action: AUDIT_ACTIONS.LOGIN })).resolves.not.toThrow();
    });
  });

  describe("auditFromRequest", () => {
    it("extracts IP and user-agent from request", async () => {
      const { auditFromRequest, AUDIT_ACTIONS } = await import("@/lib/auditLog");
      const req = new Request("http://localhost", {
        headers: { "user-agent": "TestAgent/1.0" },
      });
      await auditFromRequest(req, { action: AUDIT_ACTIONS.LOGIN });
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("getAuditLogs", () => {
    it("queries logs with no filters", async () => {
      const { getAuditLogs } = await import("@/lib/auditLog");
      const result = await getAuditLogs({});
      expect(result).toEqual([]);
    });

    it("queries logs with filters", async () => {
      const { getAuditLogs, AUDIT_ACTIONS } = await import("@/lib/auditLog");
      await getAuditLogs({
        userId: "user-1",
        action: AUDIT_ACTIONS.LOGIN,
        resource: "User",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        limit: 10,
        offset: 0,
      });
      expect(db.query.auditLogs.findMany).toHaveBeenCalled();
    });
  });

  describe("cleanupOldAuditLogs", () => {
    it("deletes old logs and returns affected count", async () => {
      const { cleanupOldAuditLogs } = await import("@/lib/auditLog");
      const count = await cleanupOldAuditLogs(90);
      expect(count).toBe(5);
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
