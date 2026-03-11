"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Loader2, ChevronLeft } from "lucide-react";

interface GachaCategory {
    id: string;
    name: string;
}

interface GachaMachine {
    id: string;
    name: string;
    imageUrl: string | null;
    gameType: string;
    costType: string;
    costAmount: number;
    categoryId: string | null;
    category: GachaCategory | null;
}

export default function GachaHubPage() {
    const [machines, setMachines] = useState<GachaMachine[]>([]);
    const [categories, setCategories] = useState<GachaCategory[]>([]);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/gacha/machines");
                const json = await res.json() as { success: boolean; data: GachaMachine[] };
                if (json.success) {
                    setMachines(json.data);
                    // Build unique categories from machines (exclude กาชาปอง categories)
                    const cats = new Map<string, GachaCategory>();
                    for (const m of json.data) {
                        if (m.category && !m.category.name.includes("กาชาปอง")) {
                            cats.set(m.category.id, m.category);
                        }
                    }
                    setCategories(Array.from(cats.values()));
                }
            } catch {/* ignore */ } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    const filtered = selectedCatId
        ? machines.filter((m) => m.categoryId === selectedCatId)
        : machines;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-950">

            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-[#1a56db] via-[#1e40af] to-[#1e3a5f] relative overflow-hidden py-10 px-6 text-center">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px"
                }} />
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10 tracking-wide">หมวดหมู่กาชา</h1>
                <p className="text-blue-200 text-sm relative z-10 font-medium flex items-center justify-center gap-1.5">
                    <Link href="/" className="hover:text-white transition-colors">หน้าหลัก</Link>
                    <span className="opacity-60">&gt;</span>
                    <span className="text-white font-semibold">หมวดหมู่กาชา</span>
                </p>
            </div>

            {/* Body */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-border overflow-hidden">
                    {/* Header with horizontal category pills */}
                    <div className="border-b border-border py-3 px-5 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 font-bold text-foreground mr-2">
                            <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                                <LayoutGrid className="h-3.5 w-3.5 text-white" />
                            </div>
                            หมวดหมู่กาชา
                        </div>
                        {/* ทั้งหมด pill */}
                        <button
                            onClick={() => setSelectedCatId(null)}
                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${!selectedCatId ? "bg-[#1a56db] text-white border-[#1a56db]" : "bg-transparent text-foreground border-border hover:border-[#1a56db] hover:text-[#1a56db]"}`}
                        >
                            ทั้งหมด
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCatId(cat.id)}
                                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${selectedCatId === cat.id ? "bg-[#1a56db] text-white border-[#1a56db]" : "bg-transparent text-foreground border-border hover:border-[#1a56db] hover:text-[#1a56db]"}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                        <button
                            className="ml-auto hidden sm:flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
                            onClick={() => setSelectedCatId(null)}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            ย้อนกลับ
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 p-5">

                            {/* DB machines */}
                            {filtered.length === 0 && selectedCatId ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                                    <LayoutGrid className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">ยังไม่มีกาชาในหมวดหมู่นี้</p>
                                    <p className="text-xs opacity-70">แอดมินสามารถเพิ่มตู้กาชาได้ที่หน้าจัดการกาชา</p>
                                </div>
                            ) : (
                                filtered.map((machine) => (
                                    <Link
                                        key={machine.id}
                                        href={machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`}
                                        className="group flex flex-col rounded-xl border border-border hover:border-blue-400 hover:shadow-md transition-all duration-200 overflow-hidden bg-card"
                                    >
                                        {/* รูปภาพแนวนอน (wide banner) */}
                                        <div className="w-full aspect-[2/1] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                            {machine.imageUrl && (machine.imageUrl.startsWith("/") || machine.imageUrl.startsWith("http")) ? (
                                                <Image
                                                    src={machine.imageUrl}
                                                    alt={machine.name}
                                                    width={1200}
                                                    height={400}
                                                    sizes="(max-width: 640px) 100vw, 800px"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <LayoutGrid className="w-10 h-10 text-muted-foreground/20" />
                                                </div>
                                            )}
                                        </div>
                                        {/* ข้อความ/ราคาด้านล่าง */}
                                        <div className="px-5 py-4 flex flex-col gap-1.5 min-h-[72px] justify-center">
                                            <p className="text-base font-bold text-foreground leading-snug line-clamp-2">{machine.name}</p>
                                            {machine.costType !== "FREE" && (
                                                <p className="text-[#1a56db] text-sm font-semibold">
                                                    ( เล่นครั้งละ {Number(machine.costAmount).toLocaleString()}.00 บาท )
                                                </p>
                                            )}
                                            {machine.costType === "FREE" && (
                                                <p className="text-green-600 text-sm font-semibold">ฟรี!</p>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
