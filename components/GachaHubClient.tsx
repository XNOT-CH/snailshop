"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";

import { getGachaCostLabel, normalizeGachaCost, normalizeGachaCostType } from "@/lib/gachaCost";
import { IMAGE_UPLOAD_RECOMMENDATIONS } from "@/lib/imageUploadRecommendations";

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

function MachineImagePlaceholder() {
    return (
        <div className="flex aspect-[4/1] w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/40">
            <LayoutGrid className="h-10 w-10" />
            <span className="text-xs">{IMAGE_UPLOAD_RECOMMENDATIONS.gachaMachineBanner}</span>
        </div>
    );
}

function HubImage({ src, alt }: { src: string; alt: string }) {
    const [err, setErr] = useState(false);

    if (err) {
        return <MachineImagePlaceholder />;
    }

    // Renders at the image's own aspect ratio so the whole banner is visible;
    // max-h keeps an extreme portrait upload from blowing up the card.
    return (
        <Image
            src={src}
            alt={alt}
            width={1920}
            height={960}
            sizes="(max-width: 640px) 100vw, 800px"
            className="h-auto max-h-[560px] w-full object-contain"
            onError={() => setErr(true)}
        />
    );
}

function getMachineCostCopy(
    costType: string,
    costAmount: number,
    currencySettings?: ReturnType<typeof useCurrencySettings>,
) {
    const normalizedCost = normalizeGachaCost(costType, costAmount);

    if (normalizeGachaCostType(normalizedCost.costType) === "FREE") {
        return {
            text: "เล่นฟรี!",
            className: "text-sm font-semibold text-green-600",
        };
    }

    return {
        text: `( เล่นครั้งละ ${normalizedCost.costAmount.toLocaleString()} ${getGachaCostLabel(normalizedCost.costType, currencySettings)} )`,
        className: "text-sm font-semibold text-[#145de7]",
    };
}

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
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
                <div className="mr-2 flex items-center gap-2 font-bold text-foreground">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#145de7]">
                        <LayoutGrid className="h-3.5 w-3.5 text-white" />
                    </div>
                    หมวดหมู่กาชา
                </div>

                <button
                    onClick={() => setSelectedCatId(null)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        selectedCatId === null
                            ? "border-[#145de7] bg-[#145de7] text-white"
                            : "border-border bg-background/50 text-foreground hover:border-[#145de7] hover:bg-accent/70 hover:text-[#145de7]"
                    }`}
                >
                    ทั้งหมด
                </button>

                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCatId(category.id)}
                        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            selectedCatId === category.id
                                ? "border-[#145de7] bg-[#145de7] text-white"
                                : "border-border bg-background/50 text-foreground hover:border-[#145de7] hover:bg-accent/70 hover:text-[#145de7]"
                        }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 p-5">
                {filteredMachines.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
                        <LayoutGrid className="h-10 w-10 opacity-20" />
                        <p className="text-sm">ยังไม่มีกาชาในหมวดนี้</p>
                        <p className="text-xs opacity-70">กรุณาเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง</p>
                    </div>
                ) : (
                    filteredMachines.map((machine) => {
                        const costCopy = getMachineCostCopy(machine.costType, Number(machine.costAmount), currencySettings);

                        return (
                            <Link
                                key={machine.id}
                                href={machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`}
                                prefetch={false}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/90 transition-all duration-200 hover:border-blue-400/60 hover:shadow-[0_22px_48px_-28px_rgba(15,23,42,0.22)]"
                            >
                                <div className="w-full overflow-hidden bg-muted/60">
                                    {machine.imageUrl && (machine.imageUrl.startsWith("/") || machine.imageUrl.startsWith("http")) ? (
                                        <HubImage src={machine.imageUrl} alt={machine.name} />
                                    ) : (
                                        <MachineImagePlaceholder />
                                    )}
                                </div>

                                <div className="flex min-h-[72px] flex-col justify-center gap-1.5 px-5 py-4">
                                    <p className="line-clamp-2 text-base font-bold leading-snug text-foreground">{machine.name}</p>
                                    <p className={costCopy.className}>{costCopy.text}</p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
