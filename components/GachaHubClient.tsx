"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { shouldBypassImageOptimization } from "@/lib/imageUrl";

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

function HubImage({ src, alt }: { src: string; alt: string }) {
    const [err, setErr] = useState(false);

    if (err) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <LayoutGrid className="h-10 w-10 text-muted-foreground/20" />
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            width={2000}
            height={500}
            sizes="(max-width: 640px) 100vw, 800px"
            className="h-full w-full object-cover"
            unoptimized={shouldBypassImageOptimization(src)}
            onError={() => setErr(true)}
        />
    );
}

function getMachineCostCopy(costType: string, costAmount: number) {
    if (costType === "FREE") {
        return {
            text: "เล่นฟรี!",
            className: "text-sm font-semibold text-green-600",
        };
    }

    const unit = costType === "CREDIT" ? "เครดิต" : costType === "POINT" ? "พอยต์" : "บาท";

    return {
        text: `( เล่นครั้งละ ${costAmount.toLocaleString()} ${unit} )`,
        className: "text-sm font-semibold text-[#1a56db]",
    };
}

interface GachaHubClientProps {
    readonly machines: GachaMachineLite[];
}

export function GachaHubClient({ machines }: Readonly<GachaHubClientProps>) {
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

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
        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-card shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-muted/30 px-5 py-3">
                <div className="mr-2 flex items-center gap-2 font-bold text-foreground">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1a56db]">
                        <LayoutGrid className="h-3.5 w-3.5 text-white" />
                    </div>
                    หมวดหมู่กาชา
                </div>

                <button
                    onClick={() => setSelectedCatId(null)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        selectedCatId === null
                            ? "border-[#1a56db] bg-[#1a56db] text-white"
                            : "border-border bg-background/50 text-foreground hover:border-[#1a56db] hover:bg-accent/70 hover:text-[#1a56db]"
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
                                ? "border-[#1a56db] bg-[#1a56db] text-white"
                                : "border-border bg-background/50 text-foreground hover:border-[#1a56db] hover:bg-accent/70 hover:text-[#1a56db]"
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
                        const costCopy = getMachineCostCopy(machine.costType, Number(machine.costAmount));

                        return (
                            <Link
                                key={machine.id}
                                href={machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-card/90 transition-all duration-200 hover:border-blue-400/60 hover:shadow-[0_22px_48px_-28px_rgba(37,99,235,0.45)]"
                            >
                                <div className="w-full overflow-hidden bg-muted/60" style={{ aspectRatio: "2000/500" }}>
                                    {machine.imageUrl && (machine.imageUrl.startsWith("/") || machine.imageUrl.startsWith("http")) ? (
                                        <HubImage src={machine.imageUrl} alt={machine.name} />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <LayoutGrid className="h-10 w-10 text-muted-foreground/20" />
                                        </div>
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
