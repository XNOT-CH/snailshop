import { db } from "@/lib/db";

let ensureTicketBalancePromise: Promise<void> | null = null;

export async function ensureTicketBalanceColumn() {
    if (!ensureTicketBalancePromise) {
        ensureTicketBalancePromise = (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = (db as any).$client;

            try {
                await client.execute(
                    "ALTER TABLE `User` ADD COLUMN `ticketBalance` int NOT NULL DEFAULT 0 AFTER `pointBalance`;",
                );
            } catch {
                // Column may already exist.
            }
        })().catch((error: unknown) => {
            ensureTicketBalancePromise = null;
            throw error;
        });
    }

    await ensureTicketBalancePromise;
}
