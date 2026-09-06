import { and, asc, eq, inArray } from "drizzle-orm";
import { db, productCheckboxes } from "@/lib/db";
import type {
    CreateProductCheckboxInput,
    UpdateProductCheckboxInput,
} from "@/lib/validations/productCheckbox";

export interface ProductCheckboxRow {
    id: string;
    productId: string;
    title: string;
    description: string | null;
    isRequired: boolean;
}

/**
 * What gets written into `Order`.`acceptedChecks`. `productId` is carried along
 * so a cart checkout can store each order row only the boxes of its own product;
 * it is dropped before the JSON is written.
 */
export interface AcceptedCheckSnapshot {
    id: string;
    title: string;
    productId: string;
}

export class ProductCheckboxNotFoundError extends Error {
    constructor() {
        super("ไม่พบช่องติ๊กนี้");
        this.name = "ProductCheckboxNotFoundError";
    }
}

export class ProductChecksNotAcceptedError extends Error {
    /** Titles the buyer still has to tick — shown back to them as-is. */
    readonly missingTitles: string[];

    constructor(missingTitles: string[]) {
        super("กรุณาติ๊กยอมรับเงื่อนไขของสินค้าก่อนสั่งซื้อ");
        this.name = "ProductChecksNotAcceptedError";
        this.missingTitles = missingTitles;
    }
}

const CHECKBOX_COLUMNS = {
    id: productCheckboxes.id,
    productId: productCheckboxes.productId,
    title: productCheckboxes.title,
    description: productCheckboxes.description,
    isRequired: productCheckboxes.isRequired,
} as const;

function normalizeDescription(description: string | null | undefined) {
    const trimmed = description?.trim();
    return trimmed ? trimmed : null;
}

export async function listProductCheckboxes(productId: string): Promise<ProductCheckboxRow[]> {
    return db
        .select(CHECKBOX_COLUMNS)
        .from(productCheckboxes)
        .where(eq(productCheckboxes.productId, productId))
        .orderBy(asc(productCheckboxes.createdAt));
}

/** One query for many products — the cart needs every item's boxes at once. */
export async function listCheckboxesForProducts(productIds: string[]): Promise<ProductCheckboxRow[]> {
    if (productIds.length === 0) {
        return [];
    }

    return db
        .select(CHECKBOX_COLUMNS)
        .from(productCheckboxes)
        .where(inArray(productCheckboxes.productId, productIds))
        .orderBy(asc(productCheckboxes.createdAt));
}

export async function createProductCheckbox(
    productId: string,
    input: CreateProductCheckboxInput,
): Promise<string> {
    const id = crypto.randomUUID();

    await db.insert(productCheckboxes).values({
        id,
        productId,
        title: input.title,
        description: normalizeDescription(input.description),
        isRequired: input.isRequired ?? true,
    });

    return id;
}

export async function updateProductCheckbox(
    productId: string,
    checkboxId: string,
    input: UpdateProductCheckboxInput,
): Promise<ProductCheckboxRow> {
    const existing = await db.query.productCheckboxes.findFirst({
        where: and(eq(productCheckboxes.id, checkboxId), eq(productCheckboxes.productId, productId)),
        columns: { id: true, productId: true, title: true, description: true, isRequired: true },
    });

    if (!existing) {
        throw new ProductCheckboxNotFoundError();
    }

    const values: Partial<typeof productCheckboxes.$inferInsert> = {};
    if (input.title !== undefined) values.title = input.title;
    if (input.description !== undefined) values.description = normalizeDescription(input.description);
    if (input.isRequired !== undefined) values.isRequired = input.isRequired;

    if (Object.keys(values).length > 0) {
        await db.update(productCheckboxes).set(values).where(eq(productCheckboxes.id, checkboxId));
    }

    return existing;
}

export async function deleteProductCheckbox(
    productId: string,
    checkboxId: string,
): Promise<ProductCheckboxRow> {
    const existing = await db.query.productCheckboxes.findFirst({
        where: and(eq(productCheckboxes.id, checkboxId), eq(productCheckboxes.productId, productId)),
        columns: { id: true, productId: true, title: true, description: true, isRequired: true },
    });

    if (!existing) {
        throw new ProductCheckboxNotFoundError();
    }

    await db.delete(productCheckboxes).where(eq(productCheckboxes.id, checkboxId));
    return existing;
}

/**
 * The purchase guard. Runs before the money transaction opens: every required
 * checkbox on every product being bought has to appear in `acceptedIds`, or the
 * order is refused. Returns the snapshot to store on the order.
 */
export async function assertProductChecksAccepted(
    productIds: string[],
    acceptedIds: unknown,
): Promise<AcceptedCheckSnapshot[]> {
    const rows = await listCheckboxesForProducts(productIds);
    if (rows.length === 0) {
        return [];
    }

    const accepted = new Set(
        Array.isArray(acceptedIds) ? acceptedIds.filter((id): id is string => typeof id === "string") : [],
    );

    const missing = rows.filter((row) => row.isRequired && !accepted.has(row.id));
    if (missing.length > 0) {
        throw new ProductChecksNotAcceptedError(missing.map((row) => row.title));
    }

    // Only boxes that belong to the products being bought are recorded, so a
    // client cannot pad the order with ids of its own.
    return rows
        .filter((row) => accepted.has(row.id))
        .map((row) => ({ id: row.id, title: row.title, productId: row.productId }));
}
