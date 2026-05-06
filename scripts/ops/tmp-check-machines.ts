import { db, gachaMachines } from "../lib/db";

async function main() {
    const rows = await db
        .select({
            id: gachaMachines.id,
            name: gachaMachines.name,
            costType: gachaMachines.costType,
            costAmount: gachaMachines.costAmount,
            isActive: gachaMachines.isActive,
            isEnabled: gachaMachines.isEnabled,
        })
        .from(gachaMachines);

    console.log(JSON.stringify(rows, null, 2));
}

void main();
