import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  cacheOrFetchMock,
  dbMock,
  deleteWhereMock,
  getCurrencySettingsMock,
  insertValuesMock,
  requirePermissionMock,
  requirePermissionWithCsrfMock,
  sanitizePublicFooterLinksMock,
  updateSetMock,
  validateBodyMock,
} = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const updateWhereMock = vi.fn();
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
  const deleteWhereMock = vi.fn();

  const dbMock = {
    insert: vi.fn(() => ({ values: insertValuesMock })),
    select: vi.fn(),
    update: vi.fn(() => ({ set: updateSetMock })),
    delete: vi.fn(() => ({ where: deleteWhereMock })),
    query: {
      announcementPopups: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      currencySettings: {
        findFirst: vi.fn(),
      },
      footerLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      footerWidgetSettings: {
        findFirst: vi.fn(),
      },
      newsArticles: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      navItems: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      siteSettings: {
        findFirst: vi.fn(),
      },
    },
  };

  return {
    cacheOrFetchMock: vi.fn(),
    dbMock,
    deleteWhereMock,
    getCurrencySettingsMock: vi.fn(),
    insertValuesMock,
    requirePermissionMock: vi.fn(),
    requirePermissionWithCsrfMock: vi.fn(),
    sanitizePublicFooterLinksMock: vi.fn((links) => links),
    updateSetMock,
    validateBodyMock: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  requirePermission: requirePermissionMock,
  requirePermissionWithCsrf: requirePermissionWithCsrfMock,
}));

vi.mock("@/lib/cache", () => ({
  CACHE_KEYS: {
    ANNOUNCEMENT_POPUPS: "announcement-popups",
    NEWS_ARTICLES: "news-articles",
  },
  CACHE_TTL: {
    MEDIUM: 300,
  },
  cacheOrFetch: cacheOrFetchMock,
  invalidateNewsCaches: vi.fn(),
  invalidatePopupCaches: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  announcementPopups: {
    createdAt: "createdAt",
    id: "id",
    isActive: "isActive",
    sortOrder: "sortOrder",
  },
  currencySettings: { id: "id" },
  db: dbMock,
  footerLinks: {
    id: "id",
    isActive: "isActive",
    sortOrder: "sortOrder",
  },
  footerWidgetSettings: { id: "id" },
  newsArticles: {
    createdAt: "createdAt",
    id: "id",
    isActive: "isActive",
    sortOrder: "sortOrder",
  },
  navItems: {
    id: "id",
    isActive: "isActive",
    sortOrder: "sortOrder",
  },
  siteSettings: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((value) => value),
  count: vi.fn(() => "count"),
  desc: vi.fn((value) => value),
  eq: vi.fn(),
  max: vi.fn(),
}));

vi.mock("@/lib/auditLog", () => ({
  AUDIT_ACTIONS: {
    NEWS_DELETE: "NEWS_DELETE",
    POPUP_DELETE: "POPUP_DELETE",
    SETTINGS_UPDATE: "SETTINGS_UPDATE",
  },
  auditFromRequest: vi.fn(),
  auditUpdate: vi.fn(),
  getChanges: vi.fn(() => []),
}));

vi.mock("@/lib/footerLinks", () => ({
  sanitizePublicFooterLinks: sanitizePublicFooterLinksMock,
}));

vi.mock("@/lib/getCurrencySettings", () => ({
  getCurrencySettings: getCurrencySettingsMock,
}));

vi.mock("@/lib/utils/date", () => ({
  mysqlNow: vi.fn(() => "2026-05-13 00:00:00"),
}));

vi.mock("@/lib/validations/content", () => ({
  currencySettingsSchema: {},
  footerLinkSchema: {
    partial: vi.fn(() => ({})),
  },
  navItemSchema: {
    partial: vi.fn(() => ({})),
  },
  newsItemSchema: {
    partial: vi.fn(() => ({})),
  },
  popupSchema: {
    partial: vi.fn(() => ({})),
  },
}));

vi.mock("@/lib/validations/settings", () => ({
  siteSettingsSchema: {
    partial: vi.fn(() => ({})),
  },
}));

vi.mock("@/lib/validations/validate", () => ({
  validateBody: validateBodyMock,
}));

const ADMIN_OK = { success: true, userId: "admin-1" };
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("content/settings API response contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    requirePermissionMock.mockResolvedValue(ADMIN_OK);
    requirePermissionWithCsrfMock.mockResolvedValue(ADMIN_OK);
  });

  it("preserves admin settings success and unauthorized wrapper shape", async () => {
    const settings = { id: "site-settings", heroTitle: "Game Store" };
    dbMock.query.siteSettings.findFirst.mockResolvedValue(settings);
    const { GET } = await import("@/app/api/admin/settings/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: settings,
    });

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(UNAUTHORIZED);
    const { GET: getUnauthorized } = await import("@/app/api/admin/settings/route");
    const unauthorizedResponse = await getUnauthorized();

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({
      success: false,
      message: "Unauthorized",
    });
  });

  it("preserves admin news raw array and delete success shape", async () => {
    const article = { id: "news-1", title: "Launch", isActive: true };
    dbMock.query.newsArticles.findMany.mockResolvedValue([article]);
    const { GET } = await import("@/app/api/admin/news/route");

    const response = await GET(new Request("http://localhost/api/admin/news"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([article]);

    vi.resetModules();
    dbMock.query.newsArticles.findFirst.mockResolvedValue(article);
    const { DELETE } = await import("@/app/api/admin/news/[id]/route");
    const deleteResponse = await DELETE(new Request("http://localhost/api/admin/news/news-1"), routeParams("news-1"));

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ success: true });
  });

  it("preserves admin popups raw array and delete success shape", async () => {
    const popup = { id: "popup-1", title: "Sale", imageUrl: "/sale.webp" };
    dbMock.query.announcementPopups.findMany.mockResolvedValue([popup]);
    const { GET } = await import("@/app/api/admin/popups/route");

    const response = await GET(new Request("http://localhost/api/admin/popups"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([popup]);

    vi.resetModules();
    dbMock.query.announcementPopups.findFirst.mockResolvedValue(popup);
    const { DELETE } = await import("@/app/api/admin/popups/[id]/route");
    const deleteResponse = await DELETE(new Request("http://localhost/api/admin/popups/popup-1"), routeParams("popup-1"));

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ success: true });
  });

  it("preserves admin footer links raw settings/links and raw settings contracts", async () => {
    const settings = { id: "footer-settings", isActive: true, title: "เมนูลัด" };
    const link = { id: "link-1", label: "Help", href: "/help", openInNewTab: false };
    dbMock.query.footerWidgetSettings.findFirst.mockResolvedValue(settings);
    dbMock.query.footerLinks.findMany.mockResolvedValue([link]);
    const { GET } = await import("@/app/api/admin/footer-links/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings,
      links: [link],
    });

    vi.resetModules();
    dbMock.query.footerWidgetSettings.findFirst.mockResolvedValue(settings);
    const { GET: getSettings } = await import("@/app/api/admin/footer-links/settings/route");
    const settingsResponse = await getSettings();

    expect(settingsResponse.status).toBe(200);
    await expect(settingsResponse.json()).resolves.toEqual(settings);
  });

  it("preserves admin currency settings raw object and error body contracts", async () => {
    const settings = { id: "default", name: "พอยท์", symbol: "💎", isActive: true };
    dbMock.query.currencySettings.findFirst.mockResolvedValue(settings);
    const { GET } = await import("@/app/api/admin/currency-settings/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(settings);

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(UNAUTHORIZED);
    const { GET: getUnauthorized } = await import("@/app/api/admin/currency-settings/route");
    const unauthorizedResponse = await getUnauthorized();

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("preserves public raw news, popups, and currency response contracts", async () => {
    const article = { id: "news-1", title: "Public News" };
    cacheOrFetchMock.mockResolvedValueOnce([article]);
    const { GET: getNews } = await import("@/app/api/news/route");

    const newsResponse = await getNews();

    expect(newsResponse.status).toBe(200);
    await expect(newsResponse.json()).resolves.toEqual([article]);

    vi.resetModules();
    const popup = { id: "popup-1", imageUrl: "/popup.webp" };
    cacheOrFetchMock.mockResolvedValueOnce([popup]);
    const { GET: getPopups } = await import("@/app/api/popups/route");
    const popupsResponse = await getPopups();

    expect(popupsResponse.status).toBe(200);
    await expect(popupsResponse.json()).resolves.toEqual([popup]);

    vi.resetModules();
    const currency = { name: "พอยท์", symbol: "💎", code: "POINT" };
    getCurrencySettingsMock.mockResolvedValue(currency);
    const { GET: getCurrency } = await import("@/app/api/currency-settings/route");
    const currencyResponse = await getCurrency();

    expect(currencyResponse.status).toBe(200);
    await expect(currencyResponse.json()).resolves.toEqual(currency);
  });

  it("preserves public content error response contracts", async () => {
    cacheOrFetchMock.mockRejectedValueOnce(new Error("news db offline"));
    const { GET: getNews } = await import("@/app/api/news/route");

    const newsResponse = await getNews();

    expect(newsResponse.status).toBe(500);
    await expect(newsResponse.json()).resolves.toEqual({
      error: "Failed to fetch news",
    });

    vi.resetModules();
    cacheOrFetchMock.mockRejectedValueOnce(new Error("popup db offline"));
    const { GET: getPopups } = await import("@/app/api/popups/route");
    const popupsResponse = await getPopups();

    expect(popupsResponse.status).toBe(500);
    await expect(popupsResponse.json()).resolves.toEqual({
      error: "Failed to fetch popups",
    });

    vi.resetModules();
    getCurrencySettingsMock.mockRejectedValueOnce(new Error("currency db offline"));
    const { GET: getCurrency } = await import("@/app/api/currency-settings/route");
    const currencyResponse = await getCurrency();

    expect(currencyResponse.status).toBe(500);
    await expect(currencyResponse.json()).resolves.toEqual({
      error: "Failed to fetch currency settings",
    });
  });

  it("preserves nav-items raw and error response contracts", async () => {
    const navItem = { id: "nav-1", label: "หน้าแรก", href: "/", icon: "home" };
    dbMock.query.navItems.findMany.mockResolvedValue([navItem]);
    const { GET: getPublicNav } = await import("@/app/api/nav-items/route");

    const publicResponse = await getPublicNav();

    expect(publicResponse.status).toBe(200);
    await expect(publicResponse.json()).resolves.toEqual([navItem]);

    vi.resetModules();
    dbMock.query.navItems.findMany.mockRejectedValueOnce(new Error("nav db offline"));
    const { GET: getPublicNavWithError } = await import("@/app/api/nav-items/route");
    const publicErrorResponse = await getPublicNavWithError();

    expect(publicErrorResponse.status).toBe(500);
    await expect(publicErrorResponse.json()).resolves.toEqual({
      error: "Failed to fetch nav items",
    });

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(UNAUTHORIZED);
    const { GET: getAdminNavUnauthorized } = await import("@/app/api/admin/nav-items/route");
    const unauthorizedResponse = await getAdminNavUnauthorized();

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(ADMIN_OK);
    dbMock.select.mockReturnValue({
      from: vi.fn().mockRejectedValue(new Error("nav count offline")),
    });
    const { GET: getAdminNavWithError } = await import("@/app/api/admin/nav-items/route");
    const adminErrorResponse = await getAdminNavWithError();

    expect(adminErrorResponse.status).toBe(500);
    await expect(adminErrorResponse.json()).resolves.toEqual({
      error: "Failed to fetch nav items",
    });
  });

  it("preserves admin nav-items detail error and delete success contracts", async () => {
    requirePermissionMock.mockResolvedValue(UNAUTHORIZED);
    const { PUT: putUnauthorized } = await import("@/app/api/admin/nav-items/[id]/route");
    const unauthorizedResponse = await putUnauthorized(
      new Request("http://localhost/api/admin/nav-items/nav-1", { method: "PUT" }),
      routeParams("nav-1"),
    );

    expect(unauthorizedResponse.status).toBe(401);
    await expect(unauthorizedResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(ADMIN_OK);
    const { DELETE } = await import("@/app/api/admin/nav-items/[id]/route");
    const deleteResponse = await DELETE(
      new Request("http://localhost/api/admin/nav-items/nav-1", { method: "DELETE" }),
      routeParams("nav-1"),
    );

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ success: true });

    vi.resetModules();
    requirePermissionMock.mockResolvedValue(ADMIN_OK);
    deleteWhereMock.mockRejectedValueOnce(new Error("nav delete offline"));
    const { DELETE: deleteWithError } = await import("@/app/api/admin/nav-items/[id]/route");
    const deleteErrorResponse = await deleteWithError(
      new Request("http://localhost/api/admin/nav-items/nav-1", { method: "DELETE" }),
      routeParams("nav-1"),
    );

    expect(deleteErrorResponse.status).toBe(500);
    await expect(deleteErrorResponse.json()).resolves.toEqual({
      error: "Failed to delete nav item",
    });
  });

  it("preserves footer widget active and error fallback contracts", async () => {
    const settings = { id: "footer-settings", isActive: true, title: "เมนูลัด" };
    const link = { id: "link-1", label: "Help", href: "/help", openInNewTab: false };
    dbMock.query.footerWidgetSettings.findFirst.mockResolvedValue(settings);
    dbMock.query.footerLinks.findMany.mockResolvedValue([link]);
    const { GET } = await import("@/app/api/footer-widget/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: { isActive: true, title: "เมนูลัด" },
      links: [link],
    });

    vi.resetModules();
    dbMock.query.footerWidgetSettings.findFirst.mockRejectedValue(new Error("db offline"));
    const { GET: getWithError } = await import("@/app/api/footer-widget/route");
    const errorResponse = await getWithError();

    expect(errorResponse.status).toBe(500);
    await expect(errorResponse.json()).resolves.toEqual({
      settings: { isActive: false, title: "" },
      links: [],
    });
  });

  it("preserves deprecated user settings PATCH contract", async () => {
    const { PATCH } = await import("@/app/api/user/settings/route");

    const response = await PATCH();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Legacy password settings endpoint is disabled.",
    });
  });
});
