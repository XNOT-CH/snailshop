"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import {
    QUEST_GOAL_TYPE_META,
    QUEST_GOAL_TYPE_OPTIONS,
} from "@/lib/features/quests/questGoalTypes";
import type { QuestGoalType } from "@/lib/features/quests/dailyQuests";

interface QuestRow {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    goalType: QuestGoalType;
    goalValue: number;
    rewardPoints: number;
    ctaHref: string | null;
    sortOrder: number;
    isActive: boolean;
    claimsToday: number;
    claimsTotal: number;
}

interface QuestSummary {
    dateKey: string;
    claimsToday: number;
    pointsToday: number;
    activeQuests: number;
}

type QuestForm = {
    slug: string;
    title: string;
    description: string;
    goalType: QuestGoalType;
    goalValue: string;
    rewardPoints: string;
    ctaHref: string;
    sortOrder: string;
    isActive: boolean;
};

const EMPTY_FORM: QuestForm = {
    slug: "",
    title: "",
    description: "",
    goalType: "CHECK_IN",
    goalValue: "1",
    rewardPoints: "10",
    ctaHref: "",
    sortOrder: "",
    isActive: true,
};

function toForm(quest: QuestRow): QuestForm {
    return {
        slug: quest.slug,
        title: quest.title,
        description: quest.description ?? "",
        goalType: quest.goalType,
        goalValue: String(quest.goalValue),
        rewardPoints: String(quest.rewardPoints),
        ctaHref: quest.ctaHref ?? "",
        sortOrder: String(quest.sortOrder),
        isActive: quest.isActive,
    };
}

export default function AdminQuestsPage() {
    const permissions = useAdminPermissions();
    const canEdit = permissions.includes(PERMISSIONS.QUEST_EDIT);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quests, setQuests] = useState<QuestRow[]>([]);
    const [summary, setSummary] = useState<QuestSummary | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<QuestForm>(EMPTY_FORM);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/quests", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message ?? "โหลดภารกิจไม่สำเร็จ");
            }
            setQuests(data.quests);
            setSummary(data.summary);
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดภารกิจไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const goalMeta = QUEST_GOAL_TYPE_META[form.goalType];
    const goalValueLocked = goalMeta?.fixedGoalValue !== undefined;

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (quest: QuestRow) => {
        setEditingId(quest.id);
        setForm(toForm(quest));
        setDialogOpen(true);
    };

    const updateForm = (patch: Partial<QuestForm>) => setForm((prev) => ({ ...prev, ...patch }));

    const handleGoalTypeChange = (goalType: QuestGoalType) => {
        const fixed = QUEST_GOAL_TYPE_META[goalType]?.fixedGoalValue;
        updateForm({ goalType, goalValue: fixed === undefined ? form.goalValue : String(fixed) });
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = {
                slug: form.slug.trim(),
                title: form.title.trim(),
                description: form.description.trim() || null,
                goalType: form.goalType,
                goalValue: Number(form.goalValue),
                rewardPoints: Number(form.rewardPoints),
                ctaHref: form.ctaHref.trim() || null,
                isActive: form.isActive,
                ...(form.sortOrder.trim() ? { sortOrder: Number(form.sortOrder) } : {}),
            };

            const res = await fetchWithCsrf(
                editingId ? `/api/admin/quests/${editingId}` : "/api/admin/quests",
                {
                    method: editingId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message ?? "บันทึกไม่สำเร็จ");
            }

            showSuccess(data.message ?? "บันทึกแล้ว");
            setDialogOpen(false);
            await load();
        } catch (error) {
            showError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (quest: QuestRow) => {
        try {
            const res = await fetchWithCsrf(`/api/admin/quests/${quest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !quest.isActive }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
            }
            await load();
        } catch (error) {
            showError(error instanceof Error ? error.message : "เปลี่ยนสถานะไม่สำเร็จ");
        }
    };

    const remove = async (quest: QuestRow) => {
        const confirmed = await showDeleteConfirm(`ลบภารกิจ "${quest.title}"?`);
        if (!confirmed) return;

        try {
            const res = await fetchWithCsrf(`/api/admin/quests/${quest.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message ?? "ลบไม่สำเร็จ");
            }
            showSuccess(data.message ?? "ลบภารกิจแล้ว");
            await load();
        } catch (error) {
            showError(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
        }
    };

    if (loading) {
        return <SpinnerScreen />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#145de7]">
                        <ListChecks className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">ภารกิจรายวัน</h1>
                        <p className="text-sm text-muted-foreground">
                            ตั้งค่าภารกิจที่ลูกค้าเห็นบนหน้า /quests — ความคืบหน้าคิดจากกิจกรรมจริงของวันนั้น รีเซ็ตตามวันไทย
                        </p>
                    </div>
                </div>

                {canEdit ? (
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        เพิ่มภารกิจ
                    </Button>
                ) : null}
            </div>

            {summary ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">ภารกิจที่เปิดอยู่</p>
                            <p className="text-2xl font-bold text-foreground">{summary.activeQuests}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">รับรางวัลวันนี้</p>
                            <p className="text-2xl font-bold text-foreground">
                                {summary.claimsToday.toLocaleString("th-TH")}{" "}
                                <span className="text-sm font-normal text-muted-foreground">ครั้ง</span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">แต้มที่จ่ายวันนี้</p>
                            <p className="text-2xl font-bold text-foreground">
                                {summary.pointsToday.toLocaleString("th-TH")}{" "}
                                <span className="text-sm font-normal text-muted-foreground">แต้ม</span>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {quests.length === 0 ? (
                <Card className="border-dashed border-border/70">
                    <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                        <ListChecks className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium text-foreground">ยังไม่มีภารกิจ</p>
                        <p className="text-sm text-muted-foreground">
                            เพิ่มภารกิจแรกเพื่อให้หน้า /quests มีอะไรให้ลูกค้าทำ
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {quests.map((quest) => (
                        <Card key={quest.id} className="border-border/50">
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-foreground">{quest.title}</span>
                                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                            {quest.slug}
                                        </span>
                                        {!quest.isActive ? (
                                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                ปิดอยู่
                                            </span>
                                        ) : null}
                                    </div>
                                    {quest.description ? (
                                        <p className="truncate text-sm text-muted-foreground">{quest.description}</p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        {QUEST_GOAL_TYPE_META[quest.goalType]?.label ?? quest.goalType}
                                        {" · เป้าหมาย "}
                                        {quest.goalValue.toLocaleString("th-TH")}{" "}
                                        {QUEST_GOAL_TYPE_META[quest.goalType]?.unit ?? "ครั้ง"}
                                        {" · ให้ "}
                                        {quest.rewardPoints.toLocaleString("th-TH")} แต้ม
                                        {" · รับแล้ววันนี้ "}
                                        {quest.claimsToday.toLocaleString("th-TH")} ครั้ง
                                        {" · ทั้งหมด "}
                                        {quest.claimsTotal.toLocaleString("th-TH")} ครั้ง
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <Switch
                                        checked={quest.isActive}
                                        onCheckedChange={() => toggleActive(quest)}
                                        disabled={!canEdit}
                                        aria-label={`เปิดใช้งานภารกิจ ${quest.title}`}
                                    />
                                    {canEdit ? (
                                        <>
                                            <Button variant="outline" size="icon" onClick={() => openEdit(quest)} aria-label={`แก้ไข ${quest.title}`}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => remove(quest)}
                                                aria-label={`ลบ ${quest.title}`}
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "แก้ไขภารกิจ" : "เพิ่มภารกิจ"}</DialogTitle>
                        <DialogDescription>
                            ลูกค้าจะเห็นภารกิจนี้บนหน้า /quests เมื่อเปิดใช้งาน
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="quest-title">ชื่อภารกิจ</Label>
                            <Input
                                id="quest-title"
                                value={form.title}
                                onChange={(e) => updateForm({ title: e.target.value })}
                                placeholder="เช่น เช็คอินรับแต้ม"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quest-slug">รหัสภารกิจ (slug)</Label>
                            <Input
                                id="quest-slug"
                                value={form.slug}
                                onChange={(e) => updateForm({ slug: e.target.value })}
                                placeholder="เช่น daily-check-in"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">ใช้ a-z, 0-9 และ - เท่านั้น ห้ามซ้ำกับภารกิจอื่น</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quest-description">คำอธิบาย</Label>
                            <Textarea
                                id="quest-description"
                                value={form.description}
                                onChange={(e) => updateForm({ description: e.target.value })}
                                placeholder="อธิบายสั้น ๆ ว่าต้องทำอะไร"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quest-goal-type">เงื่อนไข</Label>
                            <Select value={form.goalType} onValueChange={(v) => handleGoalTypeChange(v as QuestGoalType)}>
                                <SelectTrigger id="quest-goal-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {QUEST_GOAL_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">{goalMeta?.progressSource}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="quest-goal-value">เป้าหมาย ({goalMeta?.unit})</Label>
                                <Input
                                    id="quest-goal-value"
                                    type="number"
                                    min={1}
                                    value={form.goalValue}
                                    onChange={(e) => updateForm({ goalValue: e.target.value })}
                                    disabled={goalValueLocked}
                                />
                                {goalValueLocked ? (
                                    <p className="text-xs text-muted-foreground">เช็คอินนับเป็น 1 เสมอ</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quest-reward">แต้มรางวัล</Label>
                                <Input
                                    id="quest-reward"
                                    type="number"
                                    min={1}
                                    value={form.rewardPoints}
                                    onChange={(e) => updateForm({ rewardPoints: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="quest-cta">ลิงก์ปุ่ม &quot;ไปทำเลย&quot;</Label>
                                <Input
                                    id="quest-cta"
                                    value={form.ctaHref}
                                    onChange={(e) => updateForm({ ctaHref: e.target.value })}
                                    placeholder="/shop"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quest-sort">ลำดับการแสดง</Label>
                                <Input
                                    id="quest-sort"
                                    type="number"
                                    min={0}
                                    value={form.sortOrder}
                                    onChange={(e) => updateForm({ sortOrder: e.target.value })}
                                    placeholder="ต่อท้ายอัตโนมัติ"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
                            <div>
                                <Label htmlFor="quest-active">เปิดใช้งาน</Label>
                                <p className="text-xs text-muted-foreground">ปิดไว้ถ้ายังไม่อยากให้ลูกค้าเห็น</p>
                            </div>
                            <Switch
                                id="quest-active"
                                checked={form.isActive}
                                onCheckedChange={(checked) => updateForm({ isActive: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            ยกเลิก
                        </Button>
                        <Button onClick={save} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
