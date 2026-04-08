"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Gem, Save } from "lucide-react";
import { showSuccess, showError } from "@/lib/swal";

interface CurrencySettings {
    id: string;
    name: string;
    symbol: string;
    code: string;
    description: string | null;
    isActive: boolean;
}

const SYMBOL_OPTIONS = ["💎", "🪙", "⭐", "💰", "🎮", "🔮", "⚡", "🏆"];

export default function CurrencySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<CurrencySettings>({
        id: "default",
        name: "พอยท์",
        symbol: "💎",
        code: "POINT",
        description: null,
        isActive: true,
    });

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/currency-settings");
            if (res.ok) setSettings(await res.json());
        } catch {
            showError("ไม่สามารถโหลดการตั้งค่าได้");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings.name.trim() || !settings.symbol.trim()) {
            showError("กรุณากรอกชื่อและสัญลักษณ์");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/currency-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) showSuccess("บันทึกการตั้งค่าเรียบร้อย 🎉");
            else showError("ไม่สามารถบันทึกได้");
        } catch {
            showError("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gem className="h-6 w-6 text-[#1a56db]" />
                    ตั้งค่าสกุลเงินพิเศษ
                </h1>
                <p className="text-muted-foreground mt-1">
                    กำหนดชื่อ สัญลักษณ์ และการตั้งค่าสกุลเงิน POINT
                </p>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <Gem className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">การตั้งค่าทั่วไป</span>
                    <span className="text-sm text-muted-foreground ml-1">— ปรับแต่งชื่อและสัญลักษณ์ที่แสดงในเว็บไซต์</span>
                </div>

                <div className="p-6 space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">ชื่อสกุลเงิน *</Label>
                        <Input
                            id="name"
                            value={settings.name}
                            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                            placeholder="เช่น พอยท์, เพชร, เหรียญ"
                        />
                        <p className="text-xs text-muted-foreground">ชื่อนี้จะแสดงในหน้าสินค้าและ checkout</p>
                    </div>

                    {/* Symbol */}
                    <div className="space-y-3">
                        <Label>สัญลักษณ์ *</Label>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                            {SYMBOL_OPTIONS.map((symbol) => {
                                const isSelected = settings.symbol === symbol;
                                return (
                                    <button
                                        key={symbol}
                                        type="button"
                                        onClick={() => setSettings({ ...settings, symbol })}
                                        className={`
                                            relative flex items-center justify-center h-12 w-full rounded-xl text-2xl
                                            transition-all duration-150 select-none
                                            ${isSelected
                                                ? "ring-2 ring-[#1a56db] ring-offset-2 bg-blue-50 dark:bg-blue-950/40 shadow-md scale-105"
                                                : "bg-gray-50 dark:bg-zinc-800 border border-border hover:border-[#1a56db] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:scale-105 shadow-sm"
                                            }
                                        `}
                                    >
                                        {symbol}
                                        {isSelected && (
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#1a56db] rounded-full flex items-center justify-center">
                                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
                                                    <path d="M10.28 2.28L5 7.56 1.72 4.28 0.28 5.72l4.72 4.72 6.72-6.72z" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                            <Label htmlFor="custom-symbol" className="text-sm shrink-0 text-muted-foreground">หรือพิมพ์เอง:</Label>
                            <Input
                                id="custom-symbol"
                                value={settings.symbol}
                                onChange={(e) => setSettings({ ...settings, symbol: e.target.value })}
                                className="w-20 text-center text-xl font-bold"
                                maxLength={2}
                            />
                        </div>
                    </div>


                    {/* Preview */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
                        <p className="text-xs font-semibold text-[#1a56db] uppercase tracking-wide mb-2">ตัวอย่างการแสดงผล</p>
                        <div className="flex items-center gap-4">
                            <div className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-2.5 border border-border shadow-sm">
                                <span className="text-lg font-semibold">
                                    {settings.symbol} 500 {settings.name}
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">→ ราคาสินค้า</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">คำอธิบาย (ไม่บังคับ)</Label>
                        <Textarea
                            id="description"
                            value={settings.description || ""}
                            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                            placeholder="อธิบายวิธีการได้รับหรือใช้สกุลเงินนี้..."
                            rows={3}
                        />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-gray-50 dark:bg-zinc-800">
                        <div>
                            <p className="font-medium text-sm">เปิดใช้งานระบบ</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                เมื่อปิด ระบบจะไม่แสดงตัวเลือกสกุลเงินนี้
                            </p>
                        </div>
                        <Switch
                            checked={settings.isActive}
                            onCheckedChange={(checked) => setSettings({ ...settings, isActive: checked })}
                        />
                    </div>

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[#1a56db] hover:bg-[#1e40af]"
                        size="lg"
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" />บันทึกการตั้งค่า</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
