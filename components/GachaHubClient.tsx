"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";

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

interface GachaHubClientProps {
    readonly machines: GachaMachineLite[];
}

export function GachaHubClient({ machines }: Readonly<GachaHubClientProps>) {
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

    const categories = useMemo(() => {
        const cats = new Map<string, GachaCategoryLite>();
        for (const machine of machines) {
            if (machine.category && !machine.category.name.includes("กาชาปอง")) {
                cats.set(machine.category.id, machine.category);
            }
        }
        return Array.from(cats.values());
    }, [machines]);

    const filteredMachines = selectedCatId
        ? machines.filter((machine) => machine.categoryId === selectedCatId)
        : machines;

    return (
        <div className="overflow-hidden rounded-[1.6rem] border border-border/80 bg-card/95 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/30 py-3 px-5">
                <div className="flex items-center gap-2 font-bold text-foreground mr-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <LayoutGrid className="h-3.5 w-3.5 text-white" />
                    </div>
                    หมวดหมู่กาชา
                </div>

                <button
                    onClick={() => setSelectedCatId(null)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${selectedCatId === null
                        ? "bg-[#1a56db] text-white border-[#1a56db]"
                        : "bg-background/50 text-foreground border-border hover:border-[#1a56db] hover:text-[#1a56db] hover:bg-accent/70"
                        }`}
                >
                    ทั้งหมด
                </button>

                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCatId(category.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${selectedCatId === category.id
                            ? "bg-[#1a56db] text-white border-[#1a56db]"
                            : "bg-background/50 text-foreground border-border hover:border-[#1a56db] hover:text-[#1a56db] hover:bg-accent/70"
                            }`}
                    >
                        {category.name}
                    </button>
                ))}


            </div>

            <div className="grid grid-cols-1 gap-4 p-5">
                {filteredMachines.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                        <LayoutGrid className="w-10 h-10 opacity-20" />
                        <p className="text-sm">ยังไม่มีกาชาในหมวดนี้</p>
                        <p className="text-xs opacity-70">กรุณาเลือกหมวดอื่น หรือกลับมาดูใหม่ภายหลัง</p>
                    </div>
                ) : (
                    filteredMachines.map((machine) => (
                        <Link
                            key={machine.id}
                            href={machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 transition-all duration-200 hover:border-blue-400/60 hover:shadow-[0_22px_48px_-28px_rgba(37,99,235,0.45)]"
                        >
                            <div className="w-full overflow-hidden bg-muted/60" style={{ aspectRatio: "2000/500" }}>
                                {machine.imageUrl && (machine.imageUrl.startsWith("/") || machine.imageUrl.startsWith("http")) ? (
                                    <Image
                                        src={machine.imageUrl}
                                        alt={machine.name}
                                        width={2000}
                                        height={500}
                                        sizes="(max-width: 640px) 100vw, 800px"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <LayoutGrid className="w-10 h-10 text-muted-foreground/20" />
                                    </div>
                                )}
                            </div>

                            <div className="px-5 py-4 flex flex-col gap-1.5 min-h-[72px] justify-center">
                                <p className="text-base font-bold text-foreground leading-snug line-clamp-2">{machine.name}</p>
                                {machine.costType !== "FREE" ? (
                                    <p className="text-[#1a56db] text-sm font-semibold">
                                        ( เล่นครั้งละ {Number(machine.costAmount).toLocaleString()}.00 บาท )
                                    </p>
                                ) : (
                                    <p className="text-green-600 text-sm font-semibold">ฟรี!</p>
                                )}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
