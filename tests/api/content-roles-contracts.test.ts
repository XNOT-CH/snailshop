import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    auditFromRequestMock,
    dbMock,
    deleteWhereMock,
    insertValuesMock,
    normalizePermissionSelectionMock,
    requirePermissionMock,
    resolveUniqueRoleCodeMock,
    updateSetMock,
    updateWhereMock,
    validateBodyMock,
} = vi.hoisted(() => {
    const auditFromRequestMock = vi.fn();
    const deleteWhereMock = vi.fn();
    const insertValuesMock = vi.fn();
    const updateWhereMock = vi.fn();
    const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));

    const dbMock = {
        insert: vi.fn(() => ({ values: insertValuesMock })),
        update: vi.fn(() => ({ set: updateSetMock })),
        delete: vi.fn(() => ({ where: deleteWhereMock })),
        query: {
            roles: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
            },
        },
    };

    return {
        auditFromRequestMock,
        dbMock,
        deleteWhereMock,
        insertValuesMock,
        normalizePermissionSelectionMock: vi.fn((permissions) => permissions ?? []),
        requirePermissionMock: vi.fn(),
        resolveUniqueRoleCodeMock: vi.fn(),
        updateSetMock,
        updateWhereMock,
        validateBodyMock: vi.fn(),
    };
});

vi.mock("@/lib/auth", () => ({
    requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/db", () => ({
    db: dbMock,
    roles: {
        code: "code",
        createdAt: "createdAt",
        id: "id",
        sortOrder: "sortOrder",
    },
}));

vi.mock("drizzle-orm", () => ({
    asc: vi.fn((value) => value),
    eq: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
    AUDIT_ACTIONS: {
        ROLE_CREATE: "ROLE_CREATE",
        ROLE_DELETE: "ROLE_DELETE",
        ROLE_UPDATE: "ROLE_UPDATE",
    },
    auditFromRequest: auditFromRequestMock,
}));

vi.mock("@/lib/permissions", () => ({
    PERMISSIONS: {
        USER_MANAGE_ROLE: "user:manage-role",
    },
    normalizePermissionSelection: normalizePermissionSelectionMock,
}));

vi.mock("@/lib/roleCode", () => ({
    resolveUniqueRoleCode: resolveUniqueRoleCodeMock,
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: vi.fn(() => "2026-05-14 00:00:00"),
}));

vi.mock("@/lib/validations/content", () => ({
    roleSchema: {},
}));

vi.mock("@/lib/validations/validate", () => ({
    validateBody: validateBodyMock,
}));

const ADMIN_OK = { success: true, userId: "admin-1" };
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

const role = {
    id: "role-1",
    name: "Moderator",
    code: "MODERATOR",
    iconUrl: null,
    description: "Moderates content",
    permissions: ["content:view"],
    sortOrder: 1,
    isSystem: false,
};

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (url: string, method = "GET", body?: unknown) =>
    new Request(url, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

describe("admin roles API response contracts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        requirePermissionMock.mockResolvedValue(ADMIN_OK);
        resolveUniqueRoleCodeMock.mockResolvedValue("MODERATOR");
        validateBodyMock.mockResolvedValue({
            data: {
                name: "Moderator",
                description: "Moderates content",
                permissions: ["content:view"],
            },
        });
    });

    it("preserves roles list raw success and error contracts", async () => {
        dbMock.query.roles.findMany.mockResolvedValue([role]);
        const { GET } = await import("@/app/api/admin/roles/route");

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([role]);

        vi.resetModules();
        requirePermissionMock.mockResolvedValueOnce(UNAUTHORIZED);
        const { GET: getUnauthorized } = await import("@/app/api/admin/roles/route");
        const unauthorizedResponse = await getUnauthorized();

        expect(unauthorizedResponse.status).toBe(401);
        await expect(unauthorizedResponse.json()).resolves.toEqual({ error: "Unauthorized" });

        vi.resetModules();
        dbMock.query.roles.findMany.mockRejectedValueOnce(new Error("roles db offline"));
        const { GET: getWithError } = await import("@/app/api/admin/roles/route");
        const errorResponse = await getWithError();

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual({ error: "Failed to fetch roles" });
    });

    it("preserves role create success and error contracts", async () => {
        dbMock.query.roles.findFirst.mockResolvedValueOnce(role);
        const { POST } = await import("@/app/api/admin/roles/route");

        const response = await POST(request("http://localhost/api/admin/roles", "POST"));

        expect(response.status).toBe(201);
        await expect(response.json()).resolves.toEqual(role);

        vi.resetModules();
        insertValuesMock.mockRejectedValueOnce(new Error("role insert offline"));
        const { POST: postWithError } = await import("@/app/api/admin/roles/route");
        const errorResponse = await postWithError(request("http://localhost/api/admin/roles", "POST"));

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual({ error: "Failed to create role" });
    });

    it("preserves role detail read/update error contracts", async () => {
        dbMock.query.roles.findFirst.mockResolvedValueOnce(null);
        const { GET } = await import("@/app/api/admin/roles/[id]/route");
        const notFoundResponse = await GET(request("http://localhost/api/admin/roles/role-1"), routeParams("role-1"));

        expect(notFoundResponse.status).toBe(404);
        await expect(notFoundResponse.json()).resolves.toEqual({ error: "Role not found" });

        vi.resetModules();
        const { PUT: putMissingName } = await import("@/app/api/admin/roles/[id]/route");
        const missingNameResponse = await putMissingName(
            request("http://localhost/api/admin/roles/role-1", "PUT", { code: "MODERATOR" }),
            routeParams("role-1"),
        );

        expect(missingNameResponse.status).toBe(400);
        await expect(missingNameResponse.json()).resolves.toEqual({ error: "Name is required" });

        vi.resetModules();
        dbMock.query.roles.findFirst.mockResolvedValueOnce(role).mockResolvedValueOnce({ ...role, name: "Updated" });
        const { PUT } = await import("@/app/api/admin/roles/[id]/route");
        const updateResponse = await PUT(
            request("http://localhost/api/admin/roles/role-1", "PUT", { name: "Updated", permissions: ["content:view"] }),
            routeParams("role-1"),
        );

        expect(updateResponse.status).toBe(200);
        await expect(updateResponse.json()).resolves.toEqual({ ...role, name: "Updated" });
    });

    it("preserves role delete guard and success contracts", async () => {
        dbMock.query.roles.findFirst.mockResolvedValueOnce({ ...role, isSystem: true });
        const { DELETE } = await import("@/app/api/admin/roles/[id]/route");
        const systemRoleResponse = await DELETE(request("http://localhost/api/admin/roles/role-1", "DELETE"), routeParams("role-1"));

        expect(systemRoleResponse.status).toBe(400);
        await expect(systemRoleResponse.json()).resolves.toEqual({ error: "Cannot delete system role" });

        vi.resetModules();
        dbMock.query.roles.findFirst.mockResolvedValueOnce(role);
        const { DELETE: deleteRole } = await import("@/app/api/admin/roles/[id]/route");
        const deleteResponse = await deleteRole(request("http://localhost/api/admin/roles/role-1", "DELETE"), routeParams("role-1"));

        expect(deleteResponse.status).toBe(200);
        await expect(deleteResponse.json()).resolves.toEqual({ success: true });

        vi.resetModules();
        dbMock.query.roles.findFirst.mockRejectedValueOnce(new Error("role delete offline"));
        const { DELETE: deleteWithError } = await import("@/app/api/admin/roles/[id]/route");
        const errorResponse = await deleteWithError(request("http://localhost/api/admin/roles/role-1", "DELETE"), routeParams("role-1"));

        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.json()).resolves.toEqual({ error: "Failed to delete role" });
    });
});
