"use client";

import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { HomeGachaMachines } from "@/components/HomeSections";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";

export interface GachaCategoryLite {
    id: string;
    name: string;
}

export interface GachaMachineLite {
    id: string;
    name: string;
    imageUrl: string | null;
    gameType: string;
    costType: string;
    costAmount: number;
    categoryId: string | null;
    category: GachaCategoryLite | null;
}

// Same chip as the home game picker and the shop filters.
const chipClass = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-300 ease-out ${
        active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
    }`;

interface GachaHubClientProps {
    readonly machines: GachaMachineLite[];
}

export function GachaHubClient({ machines }: Readonly<GachaHubClientProps>) {
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const currencySettings = useCurrencySettings();

    const categories = useMemo(() => {
        const cats = new Map<string, GachaCategoryLite>();
        for (const machine of machines) {
            if (machine.category) {
                cats.set(machine.category.id, machine.category);
            }
        }
        return Array.from(cats.values());
    }, [machines]);

    const filteredMachines = selectedCatId
        ? machines.filter((machine) => machine.categoryId === selectedCatId)
        : machines;

    return (
        <>
            {/* With no categories assigned the row would hold a lone "ทั้งหมด",
                so it only appears once there is something to filter by. */}
            {categories.length > 0 && (
                <div className="-mx-[calc(50vw-50%)] mb-6 flex gap-2 overflow-x-auto px-[calc(50vw-50%)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                    <button type="button" onClick={() => setSelectedCatId(null)} className={chipClass(selectedCatId === null)}>
                        ทั้งหมด
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCatId(category.id)}
                            className={chipClass(selectedCatId === category.id)}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            )}

            {filteredMachines.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
                    <LayoutGrid className="h-12 w-12 opacity-40" />
                    <p className="text-lg">ยังไม่มีกาชาในหมวดนี้</p>
                    <p className="text-sm">กรุณาเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง</p>
                </div>
            ) : (
                <HomeGachaMachines machines={filteredMachines} currencySettings={currencySettings} />
            )}
        </>
    );
}
