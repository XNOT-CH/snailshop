/**
 * Guards and payload contract for the signup TOS/PP admin API.
 *
 * The three things worth pinning here are the ones that fail silently:
 * a missing permission check, a `?type=` that leaks the other list, and a PUT
 * that writes fields the client never sent (the `.partial()` trap).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { permissionMock, csrfPermissionMock } = vi.hoisted(() => ({
    permissionMock: vi.fn(),
    csrfPermissionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    requirePermission: permissionMock,
    requirePermissionWithCsrf: csrfPermissionMock,
}));

const ROWS = [
    { id: "tos-1", type: "TOS", titleTh: "ข้อ 1", titleEn: null, contentTh: "เนื้อหา 1", contentEn: null, sortOrder: 0, isActive: true },
    { id: "tos-2", type: "TOS", titleTh: "ข้อ 2", titleEn: "Clause 2", contentTh: "เนื้อหา 2", contentEn: null, sortOrder: 1, isActive: true },
    { id: "pp-1", type: "PP", titleTh: "ความเป็นส่วนตัว", titleEn: null, contentTh: "เนื้อหา PP", contentEn: null, sortOrder: 0, isActive: true },
];

const { dbMock, setMock, insertValuesMock, deleteWhereMock, selectWhereMock, inserted } = vi.hoisted(() => {
    // The `where` callbacks are real closures over drizzle's operator object, so
    // running them against a stub table is what actually proves the type filter.
    const runWhere = (callback: unknown, row: Record<string, unknown>) => {
        if (typeof callback !== "function") return true;
        const columns = new Proxy({}, { get: (_t, key) => key });
        return (callback as (t: unknown, ops: unknown) => boolean)(columns, {
            eq: (column: string, value: unknown) => row[column] === value,
        });
    };

    const findMany = vi.fn(async (args?: { where?: unknown }) =>
        ROWS.filter((row) => runWhere(args?.where, row)),
    );
    // Rows created during a test are readable afterwards, the way the real
    // insert-then-read-back in the route is.
    const inserted: Record<string, unknown>[] = [];
    const findFirst = vi.fn(async (args?: { where?: unknown }) =>
        [...ROWS, ...inserted].find((row) => runWhere(args?.where, row)),
    );

    const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    const insertValuesMock = vi.fn(async (values: Record<string, unknown>) => {
        inserted.push(values);
    });
    const selectWhereMock = vi.fn().mockResolvedValue([{ maxSort: 1 }]);

    const dbMock = {
        query: { registrationPolicies: { findMany, findFirst } },
        select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhereMock })) })),
        insert: vi.fn(() => ({ values: insertValuesMock })),
        update: vi.fn(() => ({ set: setMock })),
        delete: vi.fn(() => ({ where: deleteWhereMock })),
    };

    return { dbMock, setMock, insertValuesMock, deleteWhereMock, selectWhereMock, inserted };
});

vi.mock("@/lib/db", () => ({
    db: dbMock,
    registrationPolicies: { id: "id", type: "type", sortOrder: "sortOrder" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), max: vi.fn() }));

vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { SETTINGS_UPDATE: "SETTINGS_UPDATE" },
}));

const { invalidateMock } = vi.hoisted(() => ({ invalidateMock: vi.fn() }));
vi.mock("@/lib/cache", () => ({ invalidateRegistrationPolicyCaches: invalidateMock }));

vi.mock("@/lib/utils/date", () => ({ mysqlNow: vi.fn(() => "2026-01-01 00:00:00") }));

function request(url: string, method: string, body?: unknown) {
    return new NextRequest(`http://localhost${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}

const validBody = {
    type: "TOS",
    titleTh: "หัวข้อใหม่",
    titleEn: "New clause",
    contentTh: "เนื้อหาใหม่",
    contentEn: "",
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
    vi.clearAllMocks();
    permissionMock.mockResolvedValue({ success: true, userId: "admin-1" });
    csrfPermissionMock.mockResolvedValue({ success: true, userId: "admin-1" });
    selectWhereMock.mockResolvedValue([{ maxSort: 1 }]);
    inserted.length = 0;
});

describe("API: /api/admin/registration-policies", () => {
    it("returns 401 for GET without CONTENT_VIEW", async () => {
        permissionMock.mockResolvedValue({ success: false });
        const { GET } = await import("@/app/api/admin/registration-policies/route");

        const res = await GET(request("/api/admin/registration-policies?type=TOS", "GET"));

        expect(res.status).toBe(401);
    });

    it("returns 401 for POST without CONTENT_EDIT or CSRF", async () => {
        csrfPermissionMock.mockResolvedValue({ success: false });
        const { POST } = await import("@/app/api/admin/registration-policies/route");

        const res = await POST(request("/api/admin/registration-policies", "POST", validBody));

        expect(res.status).toBe(401);
        expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it("only returns rows of the requested type", async () => {
        const { GET } = await import("@/app/api/admin/registration-policies/route");

        const res = await GET(request("/api/admin/registration-policies?type=TOS", "GET"));
        const rows = (await res.json()) as { id: string; type: string }[];

        expect(res.status).toBe(200);
        expect(rows.map((row) => row.id)).toEqual(["tos-1", "tos-2"]);
        expect(rows.every((row) => row.type === "TOS")).toBe(true);
    });

    it("rejects a missing or unknown ?type= instead of returning everything", async () => {
        const { GET, DELETE } = await import("@/app/api/admin/registration-policies/route");

        for (const query of ["", "?type=", "?type=ALL", "?type=tos"]) {
            expect((await GET(request(`/api/admin/registration-policies${query}`, "GET"))).status, query).toBe(400);
            expect((await DELETE(request(`/api/admin/registration-policies${query}`, "DELETE"))).status, query).toBe(400);
        }
        expect(dbMock.delete).not.toHaveBeenCalled();
    });

    it("rejects an invalid POST body without writing", async () => {
        const { POST } = await import("@/app/api/admin/registration-policies/route");

        for (const body of [
            {},
            { ...validBody, type: "OTHER" },
            { ...validBody, titleTh: "" },
            { ...validBody, contentTh: "" },
            { ...validBody, titleTh: "x".repeat(256) },
        ]) {
            const res = await POST(request("/api/admin/registration-policies", "POST", body));
            expect(res.status, JSON.stringify(body)).toBe(400);
        }

        expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it("stores an empty English field as NULL and appends to the end of its own type", async () => {
        const { POST } = await import("@/app/api/admin/registration-policies/route");

        const res = await POST(request("/api/admin/registration-policies", "POST", validBody));

        expect(res.status).toBe(201);
        expect(insertValuesMock).toHaveBeenCalledWith(
            expect.objectContaining({ type: "TOS", contentEn: null, sortOrder: 2 }),
        );
        expect(invalidateMock).toHaveBeenCalled();
    });

    it("deletes only the requested type in bulk", async () => {
        const { DELETE } = await import("@/app/api/admin/registration-policies/route");

        const res = await DELETE(request("/api/admin/registration-policies?type=PP", "DELETE"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, deleted: 1 });
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });
});

describe("API: /api/admin/registration-policies/[id]", () => {
    it("returns 401 for PUT without CONTENT_EDIT or CSRF", async () => {
        csrfPermissionMock.mockResolvedValue({ success: false });
        const { PUT } = await import("@/app/api/admin/registration-policies/[id]/route");

        const res = await PUT(request("/api/admin/registration-policies/tos-1", "PUT", { isActive: false }), params("tos-1"));

        expect(res.status).toBe(401);
        expect(dbMock.update).not.toHaveBeenCalled();
    });

    it("writes only the fields the client sent — a lone isActive must not reset sortOrder", async () => {
        const { PUT } = await import("@/app/api/admin/registration-policies/[id]/route");

        const res = await PUT(
            request("/api/admin/registration-policies/tos-2", "PUT", { isActive: false }),
            params("tos-2"),
        );

        expect(res.status).toBe(200);
        expect(setMock).toHaveBeenCalledTimes(1);
        expect(setMock).toHaveBeenCalledWith({ isActive: false });
    });

    it("returns 404 for an unknown id without writing", async () => {
        const { PUT, DELETE } = await import("@/app/api/admin/registration-policies/[id]/route");

        expect(
            (await PUT(request("/api/admin/registration-policies/nope", "PUT", { isActive: false }), params("nope"))).status,
        ).toBe(404);
        expect(
            (await DELETE(request("/api/admin/registration-policies/nope", "DELETE"), params("nope"))).status,
        ).toBe(404);
        expect(dbMock.update).not.toHaveBeenCalled();
        expect(dbMock.delete).not.toHaveBeenCalled();
    });
});

describe("API: /api/admin/registration-policies/reorder", () => {
    it("returns 401 without CONTENT_EDIT or CSRF", async () => {
        csrfPermissionMock.mockResolvedValue({ success: false });
        const { POST } = await import("@/app/api/admin/registration-policies/reorder/route");

        const res = await POST(
            request("/api/admin/registration-policies/reorder", "POST", { orders: [{ id: "tos-1", sortOrder: 0 }] }),
        );

        expect(res.status).toBe(401);
        expect(dbMock.update).not.toHaveBeenCalled();
    });

    it("rejects a malformed payload without writing", async () => {
        const { POST } = await import("@/app/api/admin/registration-policies/reorder/route");

        for (const body of [{}, { orders: [] }, { orders: "nope" }, { orders: [{ id: "a" }] }, { orders: [{ id: "a", sortOrder: 1.5 }] }]) {
            const res = await POST(request("/api/admin/registration-policies/reorder", "POST", body));
            expect(res.status, JSON.stringify(body)).toBe(400);
        }

        expect(dbMock.update).not.toHaveBeenCalled();
    });

    it("writes the new sortOrder for every item", async () => {
        const { POST } = await import("@/app/api/admin/registration-policies/reorder/route");

        const res = await POST(
            request("/api/admin/registration-policies/reorder", "POST", {
                orders: [
                    { id: "tos-2", sortOrder: 0 },
                    { id: "tos-1", sortOrder: 1 },
                ],
            }),
        );

        expect(res.status).toBe(200);
        expect(setMock).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
        expect(setMock).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
        expect(invalidateMock).toHaveBeenCalled();
    });
});
