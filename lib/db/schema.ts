import {
    mysqlTable,
    varchar,
    text,
    boolean,
    int,
    decimal,
    datetime,
    index,
    json,
    uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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
    phone: varchar("phone", { length: 20 }),
    phoneVerified: boolean("phoneVerified").default(false).notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    firstName: varchar("firstName", { length: 100 }),
    lastName: varchar("lastName", { length: 100 }),
    firstNameEn: varchar("firstNameEn", { length: 100 }),
    lastNameEn: varchar("lastNameEn", { length: 100 }),
    taxFullName: text("taxFullName"),
    taxPhone: text("taxPhone"),
    taxAddress: text("taxAddress"),
    taxProvince: text("taxProvince"),
    taxDistrict: text("taxDistrict"),
    taxSubdistrict: text("taxSubdistrict"),
    taxPostalCode: text("taxPostalCode"),
    shipFullName: text("shipFullName"),
    shipPhone: text("shipPhone"),
    shipAddress: text("shipAddress"),
    shipProvince: text("shipProvince"),
    shipDistrict: text("shipDistrict"),
    shipSubdistrict: text("shipSubdistrict"),
    shipPostalCode: text("shipPostalCode"),
    creditBalance: decimal("creditBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
    pointBalance: int("pointBalance").default(0).notNull(),
    ticketBalance: int("ticketBalance").default(0).notNull(),
    totalTopup: decimal("totalTopup", { precision: 10, scale: 2 }).default("0.00").notNull(),
    lifetimePoints: int("lifetimePoints").default(0).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_user_email").on(t.email),
]);

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    topups: many(topups),
    apiKeys: many(apiKeys),
    auditLogs: many(auditLogs),
    gachaRollLogs: many(gachaRollLogs),
    chatConversations: many(chatConversations),
    chatMessages: many(chatMessages),
}));

// ─────────────────────────────────────────────
// ApiKey
// ─────────────────────────────────────────────
export const apiKeys = mysqlTable("ApiKey", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 64 }).unique().notNull(),
    keyPrefix: varchar("keyPrefix", { length: 8 }).notNull(),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    permissions: json("permissions").$type<string[]>(),
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
    userId: varchar("userId", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
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
    index("idx_auditlog_resource_createdAt").on(t.resource, t.createdAt),
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
    orderId: varchar("orderId", { length: 36 }).unique().references(() => orders.id, { onDelete: "set null" }),
    autoDeleteAfterSale: int("autoDeleteAfterSale"),
    scheduledDeleteAt: datetime("scheduledDeleteAt", { mode: "string" }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_product_isSold_category").on(t.isSold, t.category),
    index("idx_product_isFeatured_isSold").on(t.isFeatured, t.isSold),
    index("idx_product_sortOrder").on(t.sortOrder),
]);

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
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
    givenData: text("givenData"),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("COMPLETED").notNull(),
    purchasedAt: datetime("purchasedAt", { mode: "string" }).default(sql`now()`).notNull(),
}, (t) => [
    index("idx_order_userId_purchasedAt").on(t.userId, t.purchasedAt),
    index("idx_order_status").on(t.status),
    index("idx_order_purchasedAt").on(t.purchasedAt),
]);

export const ordersRelations = relations(orders, ({ one }) => ({
    user: one(users, { fields: [orders.userId], references: [users.id] }),
    product: one(products, { fields: [orders.id], references: [products.orderId] }),
}));

// ─────────────────────────────────────────────
// Topup
// ─────────────────────────────────────────────
export const topups = mysqlTable("Topup", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    proofImage: text("proofImage"),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(),
    transactionRef: varchar("transactionRef", { length: 100 }).unique(),
    senderName: text("senderName"),
    senderBank: varchar("senderBank", { length: 100 }),
    rejectReason: varchar("rejectReason", { length: 500 }),
    receiverName: text("receiverName"),
    receiverBank: text("receiverBank"),
    createdAt: now(),
}, (t) => [
    index("idx_topup_userId_createdAt").on(t.userId, t.createdAt),
    index("idx_topup_status_createdAt").on(t.status, t.createdAt),
]);

export const topupsRelations = relations(topups, ({ one }) => ({
    user: one(users, { fields: [topups.userId], references: [users.id] }),
}));

// Season Pass
export const seasonPassPlans = mysqlTable("SeasonPassPlan", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    durationDays: int("durationDays").default(30).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_season_pass_plan_active").on(t.isActive),
]);

export const seasonPassSubscriptions = mysqlTable("SeasonPassSubscription", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: varchar("planId", { length: 36 }).notNull().references(() => seasonPassPlans.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
    startAt: datetime("startAt", { mode: "string" }).default(sql`now()`).notNull(),
    endAt: datetime("endAt", { mode: "string" }).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_season_pass_subscription_user_status").on(t.userId, t.status),
    index("idx_season_pass_subscription_endAt").on(t.endAt),
]);

export const seasonPassClaims = mysqlTable("SeasonPassClaim", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    subscriptionId: varchar("subscriptionId", { length: 36 }).notNull().references(() => seasonPassSubscriptions.id, { onDelete: "cascade" }),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    dayNumber: int("dayNumber").notNull(),
    claimDateKey: varchar("claimDateKey", { length: 10 }).notNull(),
    rewardType: varchar("rewardType", { length: 30 }).notNull(),
    rewardLabel: varchar("rewardLabel", { length: 120 }).notNull(),
    rewardAmount: varchar("rewardAmount", { length: 50 }).notNull(),
    rewardPayload: json("rewardPayload").$type<Record<string, unknown> | null>(),
    createdAt: now(),
}, (t) => [
    index("idx_season_pass_claim_user_created").on(t.userId, t.createdAt),
    uniqueIndex("uq_season_pass_claim_subscription_day").on(t.subscriptionId, t.dayNumber),
]);

export const seasonPassRewards = mysqlTable("SeasonPassReward", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    planId: varchar("planId", { length: 36 }).notNull().references(() => seasonPassPlans.id, { onDelete: "cascade" }),
    dayNumber: int("dayNumber").notNull(),
    rewardType: varchar("rewardType", { length: 30 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    amount: varchar("amount", { length: 50 }).notNull(),
    imageUrl: varchar("imageUrl", { length: 500 }),
    highlight: boolean("highlight").default(false).notNull(),
    creditReward: int("creditReward"),
    pointReward: int("pointReward"),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_season_pass_reward_plan_day").on(t.planId, t.dayNumber),
    uniqueIndex("uq_season_pass_reward_plan_day").on(t.planId, t.dayNumber),
]);

// ─────────────────────────────────────────────
// SiteSettings
// ─────────────────────────────────────────────
export const siteSettings = mysqlTable("SiteSettings", {
    id: varchar("id", { length: 36 }).primaryKey().default("default"),
    heroTitle: varchar("heroTitle", { length: 255 }),
    heroDescription: text("heroDescription"),
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
    bannersJson: text("bannersJson"),
    logoUrl: text("logoUrl"),
    backgroundImage: text("backgroundImage"),
    backgroundBlur: boolean("backgroundBlur").default(true).notNull(),
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
}, (t) => [
    index("idx_help_article_active_category_sort").on(t.isActive, t.category, t.sortOrder),
]);

export const helpVideos = mysqlTable("HelpVideo", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }).notNull(),
    youtubeUrl: text("youtubeUrl").notNull(),
    videoId: varchar("videoId", { length: 32 }).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_help_video_active_sort").on(t.isActive, t.sortOrder, t.createdAt),
]);

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
}, (t) => [
    index("idx_news_article_active_sort_created").on(t.isActive, t.sortOrder, t.createdAt),
]);

// ─────────────────────────────────────────────
// PromoCode
// ─────────────────────────────────────────────
export const promoCodes = mysqlTable("PromoCode", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    code: varchar("code", { length: 50 }).unique().notNull(),
    codeType: varchar("codeType", { length: 20 }).default("DISCOUNT").notNull(),
    discountType: varchar("discountType", { length: 20 }).default("PERCENTAGE").notNull(),
    discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
    minPurchase: decimal("minPurchase", { precision: 10, scale: 2 }),
    maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
    usageLimit: int("usageLimit"),
    usagePerUser: int("usagePerUser"),
    usedCount: int("usedCount").default(0).notNull(),
    startsAt: datetime("startsAt", { mode: "string" }).default(sql`now()`).notNull(),
    expiresAt: datetime("expiresAt", { mode: "string" }),
    applicableCategories: json("applicableCategories").$type<string[]>(),
    excludedCategories: json("excludedCategories").$type<string[]>(),
    isNewUserOnly: boolean("isNewUserOnly").default(false).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_promocode_isActive_expiresAt").on(t.isActive, t.expiresAt),
]);

export const promoUsages = mysqlTable("PromoUsage", {
    id: varchar("id", { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    promoCodeId: varchar("promoCodeId", { length: 191 }).notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
    userId: varchar("userId", { length: 191 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: varchar("orderId", { length: 191 }).references(() => orders.id, { onDelete: "set null" }),
    promoCode: varchar("promoCode", { length: 50 }).notNull(),
    discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("COMPLETED").notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_promousage_promo_user_status").on(t.promoCodeId, t.userId, t.status),
    index("idx_promousage_order").on(t.orderId),
]);

// ─────────────────────────────────────────────
// FooterWidgetSettings
// ─────────────────────────────────────────────
export const footerWidgetSettings = mysqlTable("FooterWidgetSettings", {
    id: varchar("id", { length: 36 }).primaryKey().default("default"),
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
}, (t) => [
    index("idx_footer_link_active_sort").on(t.isActive, t.sortOrder),
]);

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
}, (t) => [
    index("idx_nav_item_active_sort").on(t.isActive, t.sortOrder),
]);

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

export const chatConversations = mysqlTable("ChatConversation", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("OPEN").notNull(),
    subject: varchar("subject", { length: 255 }),
    isPinned: boolean("isPinned").default(false).notNull(),
    tags: json("tags").$type<string[]>().notNull(),
    customerLastReadAt: datetime("customerLastReadAt", { mode: "string" }),
    adminLastReadAt: datetime("adminLastReadAt", { mode: "string" }),
    lastMessageAt: datetime("lastMessageAt", { mode: "string" }).default(sql`now()`).notNull(),
    closedAt: datetime("closedAt", { mode: "string" }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_chat_conversation_user_last_message").on(t.userId, t.lastMessageAt),
    index("idx_chat_conversation_status_last_message").on(t.status, t.lastMessageAt),
    index("idx_chat_conversation_pinned_last_message").on(t.isPinned, t.lastMessageAt),
]);

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
    user: one(users, { fields: [chatConversations.userId], references: [users.id] }),
    messages: many(chatMessages),
}));

export const chatMessages = mysqlTable("ChatMessage", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: varchar("conversationId", { length: 36 }).notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
    senderType: varchar("senderType", { length: 20 }).notNull(),
    senderUserId: varchar("senderUserId", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: now(),
}, (t) => [
    index("idx_chat_message_conversation_created").on(t.conversationId, t.createdAt),
    index("idx_chat_message_sender_created").on(t.senderType, t.createdAt),
]);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
    senderUser: one(users, { fields: [chatMessages.senderUserId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
export const chatQuickReplies = mysqlTable("ChatQuickReply", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_chat_quick_reply_active_sort").on(t.isActive, t.sortOrder),
]);

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
}, (t) => [
    index("idx_popup_active_sort_created").on(t.isActive, t.sortOrder, t.createdAt),
]);

// ─────────────────────────────────────────────
// Role
// ─────────────────────────────────────────────
export const roles = mysqlTable("Role", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 100 }).unique().notNull(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    iconUrl: text("iconUrl"),
    description: varchar("description", { length: 500 }),
    permissions: json("permissions").$type<string[]>(),
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
    categoryId: varchar("categoryId", { length: 36 }).references(() => gachaCategories.id, { onDelete: "set null" }),
    costType: varchar("costType", { length: 20 }).default("FREE").notNull(),
    costAmount: decimal("costAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    dailySpinLimit: int("dailySpinLimit").default(0).notNull(),
    tierMode: varchar("tierMode", { length: 20 }).default("PRICE").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_gacha_machine_categoryId").on(t.categoryId),
    index("idx_gacha_machine_active_enabled_sort").on(t.isActive, t.isEnabled, t.sortOrder),
]);

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
    productId: varchar("productId", { length: 36 }).unique().references(() => products.id, { onDelete: "set null" }),
    rewardName: varchar("rewardName", { length: 255 }),
    rewardAmount: decimal("rewardAmount", { precision: 10, scale: 2 }),
    rewardImageUrl: text("rewardImageUrl"),
    tier: varchar("tier", { length: 20 }).default("common").notNull(),
    probability: decimal("probability", { precision: 6, scale: 2 }).default("1").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    gachaMachineId: varchar("gachaMachineId", { length: 36 }).references(() => gachaMachines.id, { onDelete: "set null" }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_gacha_reward_machine_active_created").on(t.gachaMachineId, t.isActive, t.createdAt),
]);

export const gachaRewardsRelations = relations(gachaRewards, ({ one }) => ({
    product: one(products, { fields: [gachaRewards.productId], references: [products.id] }),
    gachaMachine: one(gachaMachines, { fields: [gachaRewards.gachaMachineId], references: [gachaMachines.id] }),
}));

// ─────────────────────────────────────────────
// GachaRollLog
// ─────────────────────────────────────────────
export const gachaRollLogs = mysqlTable("GachaRollLog", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
    productId: varchar("productId", { length: 36 }).references(() => products.id, { onDelete: "set null" }),
    rewardName: varchar("rewardName", { length: 255 }),
    rewardImageUrl: text("rewardImageUrl"),
    tier: varchar("tier", { length: 20 }).notNull(),
    selectorLabel: varchar("selectorLabel", { length: 10 }),
    costType: varchar("costType", { length: 20 }).notNull(),
    costAmount: decimal("costAmount", { precision: 10, scale: 2 }).default("0").notNull(),
    gachaMachineId: varchar("gachaMachineId", { length: 36 }).references(() => gachaMachines.id, { onDelete: "set null" }),
    createdAt: now(),
}, (t) => [
    index("idx_gacha_roll_userId_createdAt").on(t.userId, t.createdAt),
    index("idx_gacha_roll_machineId_createdAt").on(t.gachaMachineId, t.createdAt),
]);

export const gachaRollLogsRelations = relations(gachaRollLogs, ({ one }) => ({
    user: one(users, { fields: [gachaRollLogs.userId], references: [users.id] }),
    product: one(products, { fields: [gachaRollLogs.productId], references: [products.id] }),
    gachaMachine: one(gachaMachines, { fields: [gachaRollLogs.gachaMachineId], references: [gachaMachines.id] }),
}));
