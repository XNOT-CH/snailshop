import {
    mysqlTable,
    varchar,
    text,
    boolean,
    int,
    decimal,
    datetime,
    index,
    unique,
    primaryKey,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const uuid = () => varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID());
const now = () => datetime("createdAt", { mode: "string" }).default(sql`now()`).notNull();
const updatedAt = () => datetime("updatedAt", { mode: "string" }).default(sql`now()`).notNull().$onUpdateFn(() => new Date().toISOString().slice(0, 19).replace("T", " "));

// ─────────────────────────────────────────────
// User
// ─────────────────────────────────────────────
export const users = mysqlTable("User", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }),
    username: varchar("username", { length: 255 }).unique().notNull(),
    email: varchar("email", { length: 255 }),
    password: varchar("password", { length: 255 }).notNull(),
    image: text("image"),
    role: varchar("role", { length: 50 }).default("USER").notNull(),
    permissions: text("permissions"),
    phone: varchar("phone", { length: 20 }),
    phoneVerified: boolean("phoneVerified").default(false).notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    firstName: varchar("firstName", { length: 100 }),
    lastName: varchar("lastName", { length: 100 }),
    firstNameEn: varchar("firstNameEn", { length: 100 }),
    lastNameEn: varchar("lastNameEn", { length: 100 }),
    taxFullName: varchar("taxFullName", { length: 255 }),
    taxPhone: varchar("taxPhone", { length: 20 }),
    taxAddress: text("taxAddress"),
    taxProvince: varchar("taxProvince", { length: 100 }),
    taxDistrict: varchar("taxDistrict", { length: 100 }),
    taxSubdistrict: varchar("taxSubdistrict", { length: 100 }),
    taxPostalCode: varchar("taxPostalCode", { length: 10 }),
    shipFullName: varchar("shipFullName", { length: 255 }),
    shipPhone: varchar("shipPhone", { length: 20 }),
    shipAddress: text("shipAddress"),
    shipProvince: varchar("shipProvince", { length: 100 }),
    shipDistrict: varchar("shipDistrict", { length: 100 }),
    shipSubdistrict: varchar("shipSubdistrict", { length: 100 }),
    shipPostalCode: varchar("shipPostalCode", { length: 10 }),
    creditBalance: decimal("creditBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
    pointBalance: int("pointBalance").default(0).notNull(),
    totalTopup: decimal("totalTopup", { precision: 10, scale: 2 }).default("0.00").notNull(),
    lifetimePoints: int("lifetimePoints").default(0).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    topups: many(topups),
    sessions: many(sessions),
    apiKeys: many(apiKeys),
    auditLogs: many(auditLogs),
    gachaRollLogs: many(gachaRollLogs),
}));

// ─────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────
export const sessions = mysqlTable("Session", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: varchar("token", { length: 255 }).unique().notNull(),
    userId: varchar("userId", { length: 36 }).notNull(),
    expiresAt: datetime("expiresAt", { mode: "string" }).notNull(),
    lastActivity: datetime("lastActivity", { mode: "string" }).default(sql`now()`).notNull(),
    userAgent: text("userAgent"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    createdAt: now(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
// ApiKey
// ─────────────────────────────────────────────
export const apiKeys = mysqlTable("ApiKey", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 64 }).unique().notNull(),
    keyPrefix: varchar("keyPrefix", { length: 8 }).notNull(),
    userId: varchar("userId", { length: 36 }).notNull(),
    permissions: text("permissions"),
    expiresAt: datetime("expiresAt", { mode: "string" }),
    lastUsedAt: datetime("lastUsedAt", { mode: "string" }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
}, (t) => [index("idx_apikey_prefix").on(t.keyPrefix)]);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
    user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
// AuditLog
// ─────────────────────────────────────────────
export const auditLogs = mysqlTable("AuditLog", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }),
    action: varchar("action", { length: 100 }).notNull(),
    resource: varchar("resource", { length: 100 }),
    resourceId: varchar("resourceId", { length: 36 }),
    details: text("details"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    status: varchar("status", { length: 20 }).default("SUCCESS").notNull(),
    createdAt: now(),
}, (t) => [
    index("idx_auditlog_userId").on(t.userId),
    index("idx_auditlog_action").on(t.action),
    index("idx_auditlog_createdAt").on(t.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────
export const products = mysqlTable("Product", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    discountPrice: decimal("discountPrice", { precision: 10, scale: 2 }),
    imageUrl: varchar("imageUrl", { length: 500 }),
    category: varchar("category", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("THB").notNull(),
    secretData: text("secretData").notNull(),
    stockSeparator: varchar("stockSeparator", { length: 20 }).default("newline").notNull(),
    isSold: boolean("isSold").default(false).notNull(),
    isFeatured: boolean("isFeatured").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    orderId: varchar("orderId", { length: 36 }).unique(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
    order: one(orders, { fields: [products.orderId], references: [orders.id] }),
    gachaRewards: many(gachaRewards),
    gachaRollLogs: many(gachaRollLogs),
}));

// ─────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────
export const orders = mysqlTable("Order", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull(),
    givenData: text("givenData"),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("COMPLETED").notNull(),
    purchasedAt: datetime("purchasedAt", { mode: "string" }).default(sql`now()`).notNull(),
});

export const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    product: one(products, { fields: [orders.id], references: [products.orderId] }),
}));

// ─────────────────────────────────────────────
// Topup
// ─────────────────────────────────────────────
export const topups = mysqlTable("Topup", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    proofImage: text("proofImage"),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(),
    transactionRef: varchar("transactionRef", { length: 100 }).unique(),
    senderName: varchar("senderName", { length: 255 }),
    senderBank: varchar("senderBank", { length: 100 }),
    rejectReason: varchar("rejectReason", { length: 500 }),
    receiverName: varchar("receiverName", { length: 255 }),
    receiverBank: varchar("receiverBank", { length: 100 }),
    createdAt: now(),
});

export const topupsRelations = relations(topups, ({ one }) => ({
    user: one(users, { fields: [topups.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
// SiteSettings
// ─────────────────────────────────────────────
export const siteSettings = mysqlTable("SiteSettings", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    heroTitle: varchar("heroTitle", { length: 255 }).notNull(),
    heroDescription: text("heroDescription").notNull(),
    announcement: text("announcement"),
    bannerImage1: text("bannerImage1"),
    bannerTitle1: varchar("bannerTitle1", { length: 255 }),
    bannerSubtitle1: varchar("bannerSubtitle1", { length: 255 }),
    bannerImage2: text("bannerImage2"),
    bannerTitle2: varchar("bannerTitle2", { length: 255 }),
    bannerSubtitle2: varchar("bannerSubtitle2", { length: 255 }),
    bannerImage3: text("bannerImage3"),
    bannerTitle3: varchar("bannerTitle3", { length: 255 }),
    bannerSubtitle3: varchar("bannerSubtitle3", { length: 255 }),
    logoUrl: text("logoUrl"),
    backgroundImage: text("backgroundImage"),
    showAllProducts: boolean("showAllProducts").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// HelpArticle
// ─────────────────────────────────────────────
export const helpArticles = mysqlTable("HelpArticle", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: varchar("category", { length: 50 }).default("general").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// NewsArticle
// ─────────────────────────────────────────────
export const newsArticles = mysqlTable("NewsArticle", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    imageUrl: text("imageUrl"),
    link: varchar("link", { length: 500 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// PromoCode
// ─────────────────────────────────────────────
export const promoCodes = mysqlTable("PromoCode", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    code: varchar("code", { length: 50 }).unique().notNull(),
    discountType: varchar("discountType", { length: 20 }).default("PERCENTAGE").notNull(),
    discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
    minPurchase: decimal("minPurchase", { precision: 10, scale: 2 }),
    maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
    usageLimit: int("usageLimit"),
    usedCount: int("usedCount").default(0).notNull(),
    startsAt: datetime("startsAt", { mode: "string" }).default(sql`now()`).notNull(),
    expiresAt: datetime("expiresAt", { mode: "string" }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// FooterWidgetSettings
// ─────────────────────────────────────────────
export const footerWidgetSettings = mysqlTable("FooterWidgetSettings", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    isActive: boolean("isActive").default(true).notNull(),
    title: varchar("title", { length: 100 }).default("เมนูลัด").notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// FooterLink
// ─────────────────────────────────────────────
export const footerLinks = mysqlTable("FooterLink", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    label: varchar("label", { length: 100 }).notNull(),
    href: varchar("href", { length: 500 }).notNull(),
    openInNewTab: boolean("openInNewTab").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────
export const navItems = mysqlTable("NavItem", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    label: varchar("label", { length: 100 }).notNull(),
    href: varchar("href", { length: 500 }).notNull(),
    icon: varchar("icon", { length: 50 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// CurrencySettings
// ─────────────────────────────────────────────
export const currencySettings = mysqlTable("CurrencySettings", {
    id: varchar("id", { length: 36 }).primaryKey().default("default"),
    name: varchar("name", { length: 50 }).default("พอยท์").notNull(),
    symbol: varchar("symbol", { length: 10 }).default("💎").notNull(),
    code: varchar("code", { length: 20 }).default("POINT").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// AnnouncementPopup
// ─────────────────────────────────────────────
export const announcementPopups = mysqlTable("AnnouncementPopup", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }),
    imageUrl: text("imageUrl").notNull(),
    linkUrl: text("linkUrl"),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    dismissOption: varchar("dismissOption", { length: 30 }).default("show_always").notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// Role
// ─────────────────────────────────────────────
export const roles = mysqlTable("Role", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 100 }).unique().notNull(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    iconUrl: text("iconUrl"),
    description: varchar("description", { length: 500 }),
    permissions: text("permissions"),
    sortOrder: int("sortOrder").default(0).notNull(),
    isSystem: boolean("isSystem").default(false).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// GachaCategory
// ─────────────────────────────────────────────
export const gachaCategories = mysqlTable("GachaCategory", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
});

export const gachaCategoriesRelations = relations(gachaCategories, ({ many }) => ({
    machines: many(gachaMachines),
}));

// ─────────────────────────────────────────────
// GachaMachine
// ─────────────────────────────────────────────
export const gachaMachines = mysqlTable("GachaMachine", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    imageUrl: text("imageUrl"),
    gameType: varchar("gameType", { length: 20 }).default("SPIN_X").notNull(),
    categoryId: varchar("categoryId", { length: 36 }),
    costType: varchar("costType", { length: 20 }).default("FREE").notNull(),
    costAmount: decimal("costAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    dailySpinLimit: int("dailySpinLimit").default(0).notNull(),
    tierMode: varchar("tierMode", { length: 20 }).default("PRICE").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [index("idx_gacha_machine_categoryId").on(t.categoryId)]);

export const gachaMachinesRelations = relations(gachaMachines, ({ one, many }) => ({
    category: one(gachaCategories, { fields: [gachaMachines.categoryId], references: [gachaCategories.id] }),
    rewards: many(gachaRewards),
    rollLogs: many(gachaRollLogs),
}));

// ─────────────────────────────────────────────
// GachaSettings
// ─────────────────────────────────────────────
export const gachaSettings = mysqlTable("GachaSettings", {
    id: varchar("id", { length: 36 }).primaryKey().default("default"),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    costType: varchar("costType", { length: 20 }).default("FREE").notNull(),
    costAmount: decimal("costAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    dailySpinLimit: int("dailySpinLimit").default(0).notNull(),
    tierMode: varchar("tierMode", { length: 20 }).default("PRICE").notNull(),
    updatedAt: updatedAt(),
});

// ─────────────────────────────────────────────
// GachaReward
// ─────────────────────────────────────────────
export const gachaRewards = mysqlTable("GachaReward", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    rewardType: varchar("rewardType", { length: 20 }).default("PRODUCT").notNull(),
    productId: varchar("productId", { length: 36 }).unique(),
    rewardName: varchar("rewardName", { length: 255 }),
    rewardAmount: decimal("rewardAmount", { precision: 10, scale: 2 }),
    rewardImageUrl: text("rewardImageUrl"),
    tier: varchar("tier", { length: 20 }).default("common").notNull(),
    probability: decimal("probability", { precision: 6, scale: 2 }).default("1").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    gachaMachineId: varchar("gachaMachineId", { length: 36 }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [index("idx_gacha_reward_machineId").on(t.gachaMachineId)]);

export const gachaRewardsRelations = relations(gachaRewards, ({ one }) => ({
    product: one(products, { fields: [gachaRewards.productId], references: [products.id] }),
    gachaMachine: one(gachaMachines, { fields: [gachaRewards.gachaMachineId], references: [gachaMachines.id] }),
}));

// ─────────────────────────────────────────────
// GachaRollLog
// ─────────────────────────────────────────────
export const gachaRollLogs = mysqlTable("GachaRollLog", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull(),
    productId: varchar("productId", { length: 36 }),
    rewardName: varchar("rewardName", { length: 255 }),
    rewardImageUrl: text("rewardImageUrl"),
    tier: varchar("tier", { length: 20 }).notNull(),
    selectorLabel: varchar("selectorLabel", { length: 10 }),
    costType: varchar("costType", { length: 20 }).notNull(),
    costAmount: decimal("costAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    gachaMachineId: varchar("gachaMachineId", { length: 36 }),
    createdAt: now(),
}, (t) => [
    index("idx_gacha_roll_userId_createdAt").on(t.userId, t.createdAt),
    index("idx_gacha_roll_machineId").on(t.gachaMachineId),
]);

export const gachaRollLogsRelations = relations(gachaRollLogs, ({ one }) => ({
    user: one(users, { fields: [gachaRollLogs.userId], references: [users.id] }),
    product: one(products, { fields: [gachaRollLogs.productId], references: [products.id] }),
    gachaMachine: one(gachaMachines, { fields: [gachaRollLogs.gachaMachineId], references: [gachaMachines.id] }),
}));
