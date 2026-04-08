"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCcw, Save, Sparkles, Ticket, Upload } from "lucide-react";
import { RewardImageCropDialog } from "@/components/gacha/RewardImageCropDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/swal";

type SeasonPassPlanSettings = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price: string;
    durationDays: number;
    isActive: boolean;
};

type RewardType = "credits" | "points" | "tickets";

type SeasonPassRewardRow = {
    dayNumber: number;
    rewardType: RewardType;
    label: string;
    amount: string;
    imageUrl: string | null;
    highlight: boolean;
};

const defaultPlan: SeasonPassPlanSettings = {
    id: "",
    slug: "monthly-30-days",
    name: "Season Pass 30 วัน",
    description: "ปลดล็อกตารางรับของรายวัน 30 วัน",
    price: "50.00",
    durationDays: 30,
    isActive: true,
};

const rewardTypeOptions: Array<{ value: RewardType; label: string }> = [
    { value: "credits", label: "รางวัลเครดิต" },
    { value: "points", label: "รางวัลพอยต์" },
    { value: "tickets", label: "รางวัลตั๋วสุ่ม" },
];

const rewardTypeDisplayName: Record<RewardType, string> = {
    credits: "เครดิต",
    points: "พอยต์",
    tickets: "ตั๋วสุ่ม",
};

const rewardTypePreviewImage: Partial<Record<RewardType, { src: string; alt: string }>> = {
    credits: {
        src: "/season-pass-credit.png",
        alt: "Credit reward preview",
    },
    points: {
        src: "/season-pass-points.png",
        alt: "Points reward preview",
    },
    tickets: {
        src: "/season-pass-ticket.png",
        alt: "Ticket reward preview",
    },
};

function getDefaultRewardImage(type: RewardType) {
    return rewardTypePreviewImage[type]?.src ?? null;
}

function normalizeRewardType(value: string): RewardType {
    if (value === "credits" || value === "points" || value === "tickets") {
        return value;
    }

    if (value === "coins") {
        return "credits";
    }

    if (value === "ticket" || value === "grand") {
        return "tickets";
    }

    return "points";
}

function fallbackRewards(): SeasonPassRewardRow[] {
    return Array.from({ length: 30 }, (_, index) => ({
        dayNumber: index + 1,
        rewardType: "tickets",
        label: "ตั๋วสุ่ม",
        amount: "1",
        imageUrl: getDefaultRewardImage("tickets"),
        highlight: false,
    }));
}

export default function AdminSeasonPassEditPage() {
    const cropUrlRef = useRef<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingPlan, setSavingPlan] = useState(false);
    const [savingRewards, setSavingRewards] = useState(false);
    const [uploadingDay, setUploadingDay] = useState<number | null>(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropFileName, setCropFileName] = useState("");
    const [cropDayNumber, setCropDayNumber] = useState<number | null>(null);
    const [plan, setPlan] = useState<SeasonPassPlanSettings>(defaultPlan);
    const [rewards, setRewards] = useState<SeasonPassRewardRow[]>(fallbackRewards());

    useEffect(() => {
        void Promise.all([fetchPlan(), fetchRewards()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        return () => {
            if (cropUrlRef.current) {
                URL.revokeObjectURL(cropUrlRef.current);
                cropUrlRef.current = null;
            }
        };
    }, []);

    const rewardSummary = useMemo(
        () => rewards.filter((reward) => reward.highlight).map((reward) => `Day ${reward.dayNumber}`).join(", "),
        [rewards],
    );

    const clearCropDialog = () => {
        if (cropUrlRef.current) {
            URL.revokeObjectURL(cropUrlRef.current);
            cropUrlRef.current = null;
        }

        setCropDialogOpen(false);
        setCropImageSrc(null);
        setCropFileName("");
        setCropDayNumber(null);
    };

    const fetchPlan = async () => {
        try {
            const response = await fetch("/api/admin/season-pass/plan");
            if (!response.ok) {
                throw new Error("fetch_failed");
            }

            const data = await response.json() as SeasonPassPlanSettings;
            setPlan({
                ...defaultPlan,
                ...data,
            });
        } catch {
            showError("ไม่สามารถโหลดข้อมูลแพ็กเกจ Season Pass ได้");
        }
    };

    const fetchRewards = async () => {
        try {
            const response = await fetch("/api/admin/season-pass/rewards");
            if (!response.ok) {
                throw new Error("fetch_rewards_failed");
            }

            const data = await response.json() as Array<{
                dayNumber: number;
                rewardType: RewardType;
                label: string;
                amount: string;
                imageUrl?: string | null;
                highlight: boolean;
            }>;

            setRewards(
                data.length > 0
                    ? data.map((reward) => {
                          const rewardType = normalizeRewardType(reward.rewardType);
                          return {
                              dayNumber: reward.dayNumber,
                              rewardType,
                              label: reward.label,
                              amount: reward.amount,
                              imageUrl: reward.imageUrl ?? getDefaultRewardImage(rewardType),
                              highlight: reward.highlight,
                          };
                      })
                    : fallbackRewards(),
            );
        } catch {
            showError("ไม่สามารถโหลดรางวัลรายวันได้");
        }
    };

    const handleSavePlan = async () => {
        if (!plan.name.trim()) {
            showError("กรุณากรอกชื่อแพ็กเกจ");
            return;
        }

        if (!Number.isFinite(Number(plan.price)) || Number(plan.price) < 0) {
            showError("กรุณากรอกราคาให้ถูกต้อง");
            return;
        }

        if (!Number.isInteger(Number(plan.durationDays)) || Number(plan.durationDays) <= 0) {
            showError("กรุณากรอกจำนวนวันให้ถูกต้อง");
            return;
        }

        setSavingPlan(true);

        try {
            const response = await fetch("/api/admin/season-pass/plan", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: plan.name,
                    description: plan.description,
                    price: plan.price,
                    durationDays: Number(plan.durationDays),
                    isActive: plan.isActive,
                }),
            });

            if (!response.ok) {
                throw new Error("save_failed");
            }

            const data = await response.json() as SeasonPassPlanSettings;
            setPlan({ ...defaultPlan, ...data });
            showSuccess("บันทึกแพ็กเกจ Season Pass เรียบร้อย");
        } catch {
            showError("ไม่สามารถบันทึกแพ็กเกจ Season Pass ได้");
        } finally {
            setSavingPlan(false);
        }
    };

    const handleSaveRewards = async () => {
        for (const reward of rewards) {
            if (!reward.label.trim() || !reward.amount.trim()) {
                showError(`กรุณากรอกชื่อและจำนวนของ Day ${reward.dayNumber}`);
                return;
            }
        }

        setSavingRewards(true);

        try {
            const response = await fetch("/api/admin/season-pass/rewards", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rewards: rewards.map((reward) => ({
                        dayNumber: reward.dayNumber,
                        rewardType: normalizeRewardType(reward.rewardType),
                        label: reward.label,
                        amount: reward.amount,
                        imageUrl: reward.imageUrl,
                        highlight: reward.highlight,
                    })),
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null) as { error?: string } | null;
                throw new Error(payload?.error || "save_rewards_failed");
            }

            const data = await response.json() as Array<{
                dayNumber: number;
                rewardType: RewardType;
                label: string;
                amount: string;
                imageUrl?: string | null;
                highlight: boolean;
            }>;

            setRewards(
                data.map((reward) => {
                    const rewardType = normalizeRewardType(reward.rewardType);
                    return {
                        dayNumber: reward.dayNumber,
                        rewardType,
                        label: reward.label,
                        amount: reward.amount,
                        imageUrl: reward.imageUrl ?? getDefaultRewardImage(rewardType),
                        highlight: reward.highlight,
                    };
                }),
            );
            showSuccess("บันทึกรางวัลรายวันเรียบร้อย");
        } catch (error) {
            showError(error instanceof Error ? error.message : "ไม่สามารถบันทึกรางวัลรายวันได้");
        } finally {
            setSavingRewards(false);
        }
    };

    const updateReward = <K extends keyof SeasonPassRewardRow>(dayNumber: number, key: K, value: SeasonPassRewardRow[K]) => {
        setRewards((current) =>
            current.map((reward) => (reward.dayNumber === dayNumber ? { ...reward, [key]: value } : reward)),
        );
    };

    const updateRewardType = (dayNumber: number, nextType: RewardType) => {
        setRewards((current) =>
            current.map((reward) => {
                if (reward.dayNumber !== dayNumber) {
                    return reward;
                }

                const currentDefaultName = rewardTypeDisplayName[normalizeRewardType(reward.rewardType)];
                const nextDefaultName = rewardTypeDisplayName[nextType];
                const nextLabel =
                    !reward.label.trim() || reward.label === currentDefaultName
                        ? nextDefaultName
                        : reward.label;

                return {
                    ...reward,
                    rewardType: nextType,
                    label: nextLabel,
                    imageUrl: getDefaultRewardImage(nextType),
                };
            }),
        );
    };

    const uploadRewardImage = async (dayNumber: number, file: File) => {
        setUploadingDay(dayNumber);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/admin/season-pass/upload-image", {
                method: "POST",
                body: formData,
            });

            const payload = await response.json() as { success?: boolean; url?: string; message?: string };
            if (!response.ok || !payload.url) {
                throw new Error(payload.message || "อัปโหลดรูปไม่สำเร็จ");
            }

            updateReward(dayNumber, "imageUrl", payload.url);
            showSuccess("อัปเดตรูปรางวัลเรียบร้อย");
            return true;
        } catch (error) {
            showError(error instanceof Error ? error.message : "ไม่สามารถอัปโหลดรูปรางวัลได้");
            return false;
        } finally {
            setUploadingDay(null);
        }
    };

    const handleRewardImageUpload = async (dayNumber: number, file: File | null) => {
        if (!file) {
            return;
        }

        if (file.type !== "image/gif" && file.type !== "image/svg+xml") {
            if (cropUrlRef.current) {
                URL.revokeObjectURL(cropUrlRef.current);
            }

            const objectUrl = URL.createObjectURL(file);
            cropUrlRef.current = objectUrl;
            setCropDayNumber(dayNumber);
            setCropFileName(file.name);
            setCropImageSrc(objectUrl);
            setCropDialogOpen(true);
            return;
        }

        await uploadRewardImage(dayNumber, file);
    };

    const handleCropConfirm = async (croppedFile: File) => {
        if (!cropDayNumber) {
            return;
        }

        const uploaded = await uploadRewardImage(cropDayNumber, croppedFile);
        if (uploaded) {
            clearCropDialog();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <Button asChild variant="outline" size="icon" className="rounded-full">
                    <Link href="/admin/season-pass">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <Ticket className="h-6 w-6 text-[#1a56db]" />
                        แก้ไขแพ็กเกจ Season Pass
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ปรับราคา ระยะเวลา คำอธิบาย และของรางวัลรายวันทั้ง 30 วันได้จากหน้านี้
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-6 py-4">
                    <p className="text-sm font-semibold text-[#1a56db]">Package Settings</p>
                </div>

                <div className="space-y-6 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="season-pass-name">ชื่อแพ็กเกจ</Label>
                            <Input
                                id="season-pass-name"
                                value={plan.name}
                                onChange={(event) => setPlan((current) => ({ ...current, name: event.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="season-pass-slug">Slug</Label>
                            <Input id="season-pass-slug" value={plan.slug} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="season-pass-price">ราคา (บาท)</Label>
                            <Input
                                id="season-pass-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={plan.price}
                                onChange={(event) => setPlan((current) => ({ ...current, price: event.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="season-pass-duration">ระยะเวลา (วัน)</Label>
                            <Input
                                id="season-pass-duration"
                                type="number"
                                min="1"
                                step="1"
                                value={plan.durationDays}
                                onChange={(event) =>
                                    setPlan((current) => ({ ...current, durationDays: Number(event.target.value) || 0 }))
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="season-pass-description">คำอธิบาย</Label>
                        <Textarea
                            id="season-pass-description"
                            rows={4}
                            value={plan.description ?? ""}
                            onChange={(event) => setPlan((current) => ({ ...current, description: event.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium text-slate-900">เปิดขายแพ็กเกจนี้</p>
                            <p className="text-sm text-muted-foreground">
                                ถ้าปิดไว้ ผู้ใช้จะไม่สามารถซื้อ Season Pass แพ็กเกจนี้ได้
                            </p>
                        </div>
                        <Switch
                            checked={plan.isActive}
                            onCheckedChange={(checked) => setPlan((current) => ({ ...current, isActive: checked }))}
                        />
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <p className="text-sm font-semibold text-slate-900">ตัวอย่างที่จะแสดง</p>
                        <p className="mt-2 text-sm text-slate-600">
                            {plan.name} · {Number(plan.price || 0).toLocaleString()} บาท · ใช้งาน {plan.durationDays} วัน
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{plan.description || "ยังไม่ได้ตั้งคำอธิบายแพ็กเกจ"}</p>
                    </div>

                    <Button onClick={() => void handleSavePlan()} disabled={savingPlan} className="w-full sm:w-auto">
                        {savingPlan ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                บันทึกแพ็กเกจ
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-2 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-[#1a56db]">
                            <Sparkles className="h-4 w-4" />
                            Reward Board 30 วัน
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            แก้ของรางวัลแต่ละวันได้โดยตรง รวมถึงวันพิเศษและรูปรางวัลที่จะโชว์จริงบนกระดาน
                        </p>
                    </div>
                    <div className="text-sm text-slate-500">วันพิเศษ: {rewardSummary || "ยังไม่ได้เลือก"}</div>
                </div>

                <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
                    {rewards.map((reward) => (
                        <div key={reward.dayNumber} className="rounded-2xl border border-border bg-background/70 p-4">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-base font-semibold text-slate-900">Day {String(reward.dayNumber).padStart(2, "0")}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>พิเศษ</span>
                                    <Switch
                                        checked={reward.highlight}
                                        onCheckedChange={(checked) => updateReward(reward.dayNumber, "highlight", checked)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor={`reward-type-${reward.dayNumber}`}>ประเภทรางวัล</Label>
                                    <select
                                        id={`reward-type-${reward.dayNumber}`}
                                        value={reward.rewardType}
                                        onChange={(event) => updateRewardType(reward.dayNumber, event.target.value as RewardType)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {rewardTypeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                                    <p className="text-xs font-medium text-amber-700">รูปของรางวัล {rewardTypeDisplayName[reward.rewardType]}</p>
                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
                                            {reward.imageUrl ? (
                                                <Image
                                                    src={reward.imageUrl}
                                                    alt={`${rewardTypeDisplayName[reward.rewardType]} reward preview`}
                                                    fill
                                                    sizes="80px"
                                                    className="object-contain p-2"
                                                />
                                            ) : (
                                                <span className="px-3 text-center text-[11px] font-medium leading-4 text-slate-400">
                                                    ยังไม่ได้ตั้งรูป
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm leading-6 text-slate-600">
                                                {getDefaultRewardImage(reward.rewardType)
                                                    ? "มีรูปเริ่มต้นให้ก่อน และถ้าไม่ชอบสามารถเปลี่ยนรูปพร้อมครอปใหม่ได้จากตรงนี้"
                                                    : "ถ้ายังไม่ตั้งรูป ระบบจะใช้ไอคอนมาตรฐานของรางวัลนี้ไปก่อน และคุณสามารถอัปโหลดรูปพร้อมครอปได้"}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700">
                                                    {uploadingDay === reward.dayNumber ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-3.5 w-3.5" />
                                                    )}
                                                    เปลี่ยนรูปและครอป
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                                        className="hidden"
                                                        disabled={uploadingDay === reward.dayNumber}
                                                        onChange={(event) => {
                                                            const file = event.target.files?.[0] ?? null;
                                                            void handleRewardImageUpload(reward.dayNumber, file);
                                                            event.currentTarget.value = "";
                                                        }}
                                                    />
                                                </label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-full"
                                                    onClick={() =>
                                                        updateReward(
                                                            reward.dayNumber,
                                                            "imageUrl",
                                                            getDefaultRewardImage(reward.rewardType),
                                                        )
                                                    }
                                                >
                                                    <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                                                    ใช้ค่าปกติ
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`reward-label-${reward.dayNumber}`}>ชื่อที่แสดง</Label>
                                    <Input
                                        id={`reward-label-${reward.dayNumber}`}
                                        value={reward.label}
                                        onChange={(event) => updateReward(reward.dayNumber, "label", event.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`reward-amount-${reward.dayNumber}`}>จำนวนรางวัล</Label>
                                    <Input
                                        id={`reward-amount-${reward.dayNumber}`}
                                        value={reward.amount}
                                        onChange={(event) => updateReward(reward.dayNumber, "amount", event.target.value)}
                                    />
                                </div>

                                <p className="text-xs leading-6 text-slate-500">
                                    ระบบจะนำจำนวนนี้ไปใช้จริงอัตโนมัติตามชนิดรางวัลที่เลือก
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border px-6 py-4">
                    <Button onClick={() => void handleSaveRewards()} disabled={savingRewards} className="w-full sm:w-auto">
                        {savingRewards ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังบันทึกรางวัล...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                บันทึกรางวัลรายวัน
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <RewardImageCropDialog
                open={cropDialogOpen}
                imageSrc={cropImageSrc}
                fileName={cropFileName}
                onClose={clearCropDialog}
                onConfirm={handleCropConfirm}
            />
        </div>
    );
}
