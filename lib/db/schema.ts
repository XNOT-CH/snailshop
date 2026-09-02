import {
    mysqlTable,
    varchar,
    text,
    boolean,
    int,
    decimal,
    datetime,
    date,
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
    // Unique so concurrent registrations can't create duplicate-email accounts;
    // password reset and email verification look users up by email with findFirst,
    // so a duplicate would shadow one of the accounts. NULL stays allowed (MySQL
    // permits multiple NULLs in a unique index).
    email: varchar("email", { length: 255 }).unique(),
    password: varchar("password", { length: 255 }).notNull(),
    image: text("image"),
    role: varchar("role", { length: 50 }).default("USER").notNull(),
    bannedAt: datetime("bannedAt", { mode: "string" }),
    banReason: varchar("banReason", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    phoneVerified: boolean("phoneVerified").default(false).notNull(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    pinHash: varchar("pinHash", { length: 255 }),
    pinEnabledAt: datetime("pinEnabledAt", { mode: "string" }),
    pinUpdatedAt: datetime("pinUpdatedAt", { mode: "string" }),
    pinFailedAttempts: int("pinFailedAttempts").default(0).notNull(),
    pinLockedUntil: datetime("pinLockedUntil", { mode: "string" }),
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
    // Stamped on each successful credential login. Powers the dashboard
    // "active users today" KPI. NULL = has not logged in since the column existed.
    lastLoginAt: datetime("lastLoginAt", { mode: "string" }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_user_email").on(t.email),
    index("idx_user_lastLoginAt").on(t.lastLoginAt),
]);

export const usersRelations = relations(users, ({ many }) => ({
    orders: many(orders),
    topups: many(topups),
    auditLogs: many(auditLogs),
    emailVerificationTokens: many(emailVerificationTokens),
    addressProfiles: many(userAddressProfiles),
    gachaRollLogs: many(gachaRollLogs),
    chatConversations: many(chatConversations),
    chatMessages: many(chatMessages),
}));

export const userAddressProfiles = mysqlTable("UserAddressProfile", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 191 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
    kind: varchar("kind", { length: 20 }).default("both").notNull(),
    fullName: text("fullName"),
    phone: text("phone"),
    address: text("address"),
    province: text("province"),
    district: text("district"),
    subdistrict: text("subdistrict"),
    postalCode: text("postalCode"),
    taxId: text("taxId"),
    isDefaultTax: boolean("isDefaultTax").default(false).notNull(),
    isDefaultShipping: boolean("isDefaultShipping").default(false).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_user_address_profile_user").on(t.userId),
    index("idx_user_address_profile_user_kind").on(t.userId, t.kind),
    index("idx_user_address_profile_default_tax").on(t.userId, t.isDefaultTax),
    index("idx_user_address_profile_default_shipping").on(t.userId, t.isDefaultShipping),
]);

export const userAddressProfilesRelations = relations(userAddressProfiles, ({ one }) => ({
    user: one(users, { fields: [userAddressProfiles.userId], references: [users.id] }),
}));

export const emailVerificationTokens = mysqlTable("EmailVerificationToken", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 191 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 191 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    expiresAt: datetime("expiresAt", { mode: "string" }).notNull(),
    usedAt: datetime("usedAt", { mode: "string" }),
    createdAt: now(),
}, (t) => [
    uniqueIndex("uq_email_verification_token_hash").on(t.tokenHash),
    index("idx_email_verification_user_email").on(t.userId, t.email),
    index("idx_email_verification_expires").on(t.expiresAt),
]);

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
    user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
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
    imageUrls: json("imageUrls").$type<string[]>(),
    category: varchar("category", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("THB").notNull(),
    secretData: text("secretData").notNull(),
    stockSeparator: varchar("stockSeparator", { length: 20 }).default("newline").notNull(),
    stockCount: int("stockCount"),
    isSold: boolean("isSold").default(false).notNull(),
    isFeatured: boolean("isFeatured").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    orderId: varchar("orderId", { length: 36 }).unique().references(() => orders.id, { onDelete: "set null" }),
    autoDeleteAfterSale: int("autoDeleteAfterSale"),
    scheduledDeleteAt: datetime("scheduledDeleteAt", { mode: "string" }),
    deletedAt: datetime("deletedAt", { mode: "string" }),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_product_isSold_category").on(t.isSold, t.category),
    index("idx_product_isSold_stockCount_category").on(t.isSold, t.stockCount, t.category),
    index("idx_product_isFeatured_isSold").on(t.isFeatured, t.isSold),
    index("idx_product_sortOrder").on(t.sortOrder),
    index("idx_product_deletedAt").on(t.deletedAt),
]);

export const productsRelations = relations(products, ({ one, many }) => ({
    order: one(orders, { fields: [products.orderId], references: [orders.id] }),
    gachaRewards: many(gachaRewards),
    gachaRollLogs: many(gachaRollLogs),
}));

// ─────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────
// Daily product-page view counts (Thai calendar day), one row per product per
// day. Feeds the "viewed a lot but not selling" dashboard insight; rows follow
// the product on delete.
export const productViewsDaily = mysqlTable("ProductViewDaily", {
    id: int("id").autoincrement().primaryKey(),
    productId: varchar("productId", { length: 36 })
        .notNull()
        .references(() => products.id, { onDelete: "cascade" }),
    viewDate: date("viewDate", { mode: "string" }).notNull(),
    views: int("views").default(0).notNull(),
}, (t) => [
    uniqueIndex("uq_product_view_daily").on(t.productId, t.viewDate),
    index("idx_product_view_daily_date").on(t.viewDate),
]);

export const orders = mysqlTable("Order", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "restrict" }),
    givenData: text("givenData"),
    // Snapshot of the purchased product captured at order time. Plain columns (no FK)
    // so the order keeps showing what was bought even after the product row is
    // deleted or its single `Product.orderId` pointer is overwritten by a later sale.
    productId: varchar("productId", { length: 36 }),
    productName: varchar("productName", { length: 255 }),
    productImage: varchar("productImage", { length: 500 }),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).default("COMPLETED").notNull(),
    purchasedAt: datetime("purchasedAt", { mode: "string" }).default(sql`now()`).notNull(),
    // Soft-delete marker. A user hiding an order from their inventory sets this
    // instead of deleting the row, so the sale stays in admin revenue/exports and
    // still counts toward new-user promo eligibility (which reads order rows).
    deletedAt: datetime("deletedAt", { mode: "string" }),
}, (t) => [
    index("idx_order_userId_purchasedAt").on(t.userId, t.purchasedAt),
    index("idx_order_user_status").on(t.userId, t.status),
    index("idx_order_status").on(t.status),
    index("idx_order_purchasedAt").on(t.purchasedAt),
    index("idx_order_userId_deletedAt").on(t.userId, t.deletedAt),
    index("idx_order_productId_status").on(t.productId, t.status),
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
    // Channel the top-up came through ("bank" | "truewallet"), captured from slip
    // verification. Powers the dashboard top-up channel distribution. NULL = legacy.
    paymentMethod: varchar("paymentMethod", { length: 20 }),
    createdAt: now(),
}, (t) => [
    index("idx_topup_userId_createdAt").on(t.userId, t.createdAt),
    index("idx_topup_status_createdAt").on(t.status, t.createdAt),
    index("idx_topup_status_paymentMethod").on(t.status, t.paymentMethod),
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
    // What this sale actually charged. NULL on rows bought before the column
    // existed; revenue used to be recomputed from the plan's current price, so
    // changing the price rewrote every past month.
    pricePaid: decimal("pricePaid", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
    startAt: datetime("startAt", { mode: "string" }).default(sql`now()`).notNull(),
    endAt: datetime("endAt", { mode: "string" }).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_season_pass_subscription_user_status").on(t.userId, t.status),
    index("idx_season_pass_subscription_user_status_endAt").on(t.userId, t.status, t.endAt),
    index("idx_season_pass_subscription_endAt").on(t.endAt),
    index("idx_season_pass_subscription_createdAt").on(t.createdAt),
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
    welcomeStripImagesJson: text("welcomeStripImagesJson"),
    logoUrl: text("logoUrl"),
    ogImageUrl: text("ogImageUrl"),
    backgroundImage: text("backgroundImage"),
    backgroundBlur: boolean("backgroundBlur").default(true).notNull(),
    showAllProducts: boolean("showAllProducts").default(true).notNull(),
    // Footer contact + social
    footerDescription: text("footerDescription"),
    contactPhone: varchar("contactPhone", { length: 50 }),
    contactEmail: varchar("contactEmail", { length: 255 }),
    facebookUrl: text("facebookUrl"),
    twitterUrl: text("twitterUrl"),
    instagramUrl: text("instagramUrl"),
    lineUrl: text("lineUrl"),
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
    requiresApproval: boolean("requiresApproval").default(false).notNull(),
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

export const promoUsagesRelations = relations(promoUsages, ({ one }) => ({
    user: one(users, { fields: [promoUsages.userId], references: [users.id] }),
}));

// ─────────────────────────────────────────────
// FooterWidgetSettings
// ─────────────────────────────────────────────
export const footerWidgetSettings = mysqlTable("FooterWidgetSettings", {
    id: varchar("id", { length: 36 }).primaryKey().default("default"),
    isActive: boolean("isActive").default(true).notNull(),
    title: varchar("title", { length: 100 }).default("เมนูลัด").notNull(),
    secondaryTitle: varchar("secondaryTitle", { length: 100 }).default("บัตรเติมเกม").notNull(),
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
    column: varchar("column", { length: 20 }).default("services").notNull(),
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
    symbol: varchar("symbol", { length: 10 }).default("").notNull(),
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
    // Admin currently responsible for this conversation. NULL = unassigned.
    assigneeId: varchar("assigneeId", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
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
    index("idx_chat_conversation_assignee").on(t.assigneeId, t.lastMessageAt),
]);

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
    user: one(users, { fields: [chatConversations.userId], references: [users.id] }),
    assignee: one(users, { fields: [chatConversations.assigneeId], references: [users.id] }),
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
    // เพดานเครดิตชดเชยเมื่อสินค้ารางวัลหมดสต็อก (0 = ไม่จำกัด = จ่ายเต็มราคา)
    fallbackCreditCap: decimal("fallbackCreditCap", { precision: 10, scale: 2 }).default("0").notNull(),
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
    // เพดานเครดิตชดเชยเมื่อสินค้ารางวัลหมดสต็อก (0 = ไม่จำกัด = จ่ายเต็มราคา)
    fallbackCreditCap: decimal("fallbackCreditCap", { precision: 10, scale: 2 }).default("0").notNull(),
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
    // Baht value of the reward snapshotted at roll time (product sale price or
    // currency amount). Null on rows from before 2026-07-11; RTP math falls
    // back to the product's current price for those.
    rewardValue: decimal("rewardValue", { precision: 10, scale: 2 }),
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

// ─────────────────────────────────────────────
// Daily Quests
// ─────────────────────────────────────────────
// Quest progress is derived on the fly from existing activity tables
// (Order/Topup/GachaRollLog/SeasonPassClaim) scoped to the Thai calendar
// day — no per-quest progress rows, only the claim record below.
export const dailyQuests = mysqlTable("DailyQuest", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 500 }),
    // CHECK_IN | PURCHASE_COUNT | TOPUP_AMOUNT | GACHA_SPINS | SEASON_PASS_CLAIM
    goalType: varchar("goalType", { length: 30 }).notNull(),
    goalValue: int("goalValue").default(1).notNull(),
    rewardPoints: int("rewardPoints").notNull(),
    // Where "ไปทำเลย" sends the user (e.g. /shop, /gachapons).
    ctaHref: varchar("ctaHref", { length: 255 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    index("idx_daily_quest_active_sort").on(t.isActive, t.sortOrder),
]);

export const dailyQuestClaims = mysqlTable("DailyQuestClaim", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: varchar("questId", { length: 36 }).notNull().references(() => dailyQuests.id, { onDelete: "cascade" }),
    // Thai calendar day key (YYYY-MM-DD); the unique index is the concurrency
    // guard against double claims.
    dateKey: varchar("dateKey", { length: 10 }).notNull(),
    rewardPoints: int("rewardPoints").notNull(),
    createdAt: now(),
}, (t) => [
    uniqueIndex("uq_daily_quest_claim_user_quest_date").on(t.userId, t.questId, t.dateKey),
    index("idx_daily_quest_claim_user_date").on(t.userId, t.dateKey),
]);

export const dailyQuestClaimsRelations = relations(dailyQuestClaims, ({ one }) => ({
    user: one(users, { fields: [dailyQuestClaims.userId], references: [users.id] }),
    quest: one(dailyQuests, { fields: [dailyQuestClaims.questId], references: [dailyQuests.id] }),
}));

export const gachaDailySpinCounters = mysqlTable("GachaDailySpinCounter", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 36 }).notNull(),
    machineScope: varchar("machineScope", { length: 64 }).notNull(),
    spinDate: varchar("spinDate", { length: 10 }).notNull(),
    spinCount: int("spinCount").default(0).notNull(),
    createdAt: now(),
    updatedAt: updatedAt(),
}, (t) => [
    uniqueIndex("uq_gacha_daily_spin_counter_scope").on(t.userId, t.machineScope, t.spinDate),
    index("idx_gacha_daily_spin_counter_date").on(t.spinDate),
]);
