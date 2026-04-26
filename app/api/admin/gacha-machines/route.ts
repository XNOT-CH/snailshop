import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateBody } from "@/lib/validations/validate";
import { gachaMachineSchema } from "@/lib/validations/gacha";
import { PERMISSIONS } from "@/lib/permissions";
import { getMachineProbabilitySummary } from "@/lib/gachaMachineProbability";
import { normalizeGachaCost } from "@/lib/gachaCost";

export async function GET() {
    const auth = await requirePermission(PERMISSIONS.GACHA_VIEW);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const machines = await db.query.gachaMachines.findMany({
        orderBy: (t, { asc }) => asc(t.sortOrder),
        with: {
            category: { columns: { name: true } },
            rewards: { columns: { id: true } },
        },
    });
    const machineProbabilities = await Promise.all(machines.map(async (machine) => ({
        machineId: machine.id,
        probability: await getMachineProbabilitySummary(machine.id),
    })));
    const probabilityByMachineId = new Map(
        machineProbabilities.map(({ machineId, probability }) => [machineId, probability]),
    );

    const data = machines.map((machine) => {
        const probability = probabilityByMachineId.get(machine.id);
        return {
            ...machine,
            _count: { rewards: machine.rewards.length },
            probabilityTotal: probability?.totalProbability ?? 0,
            isProbabilityComplete: probability?.isComplete ?? false,
            rewards: undefined,
        };
    });
    return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });

    const result = await validateBody(req, gachaMachineSchema);
    if ("error" in result) return result.error;
    const body = result.data;
    const normalizedCost = normalizeGachaCost(body.costType, body.costAmount);

    const newId = crypto.randomUUID();
    await db.insert(gachaMachines).values({
        id: newId,
        name: body.name,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        gameType: body.gameType,
        categoryId: body.categoryId ?? null,
        costType: normalizedCost.costType,
        costAmount: String(normalizedCost.costAmount),
        dailySpinLimit: body.dailySpinLimit,
        tierMode: body.tierMode,
        isActive: false,
        isEnabled: body.isEnabled,
        sortOrder: body.sortOrder,
        createdAt: mysqlNow(),
        updatedAt: mysqlNow(),
    });
    const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, newId) });
    return NextResponse.json({ success: true, data: machine });
}
