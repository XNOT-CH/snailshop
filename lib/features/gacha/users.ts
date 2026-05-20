import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";

export type GachaRollUser = {
    id: string;
};

export type FindGachaRollUserById = (userId: string) => Promise<GachaRollUser | null | undefined>;
export type GachaUserResult =
    | { user: GachaRollUser }
    | { error: string; status: number };

async function findGachaRollUserById(userId: string) {
    return db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true },
    });
}

export async function fetchGachaUserOrError(
    userId: string,
    findUserById: FindGachaRollUserById = findGachaRollUserById,
): Promise<GachaUserResult> {
    const user = await findUserById(userId);

    if (!user) {
        return { error: "ไม่พบผู้ใช้งาน", status: 404 };
    }

    return { user };
}
