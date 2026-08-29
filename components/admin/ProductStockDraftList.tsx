"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatStockEntry, getStockUser } from "@/lib/stock";

interface ProductStockDraftListProps {
    items: string[];
    onChange: (items: string[]) => void;
    /** Index of the most recently added row, briefly highlighted. */
    highlightFrom?: number | null;
    disabled?: boolean;
}

function getStockPass(item: string) {
    const separatorIndex = item.indexOf(" / ");
    return separatorIndex === -1 ? "" : item.slice(separatorIndex + 3);
}

/**
 * The draft stock list on the create form. Passwords are hidden by default —
 * filling in twenty accounts used to leave every customer password sitting in
 * plain sight on screen — and a row can be corrected in place instead of being
 * deleted and retyped.
 */
export function ProductStockDraftList({
    items,
    onChange,
    highlightFrom = null,
    disabled = false,
}: ProductStockDraftListProps) {
    const [showPasswords, setShowPasswords] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editUser, setEditUser] = useState("");
    const [editPass, setEditPass] = useState("");
    const [editError, setEditError] = useState<string | null>(null);

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditUser(getStockUser(items[index]));
        setEditPass(getStockPass(items[index]));
        setEditError(null);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditError(null);
    };

    const saveEditing = () => {
        if (editingIndex === null) return;

        const user = editUser.trim();
        const pass = editPass.trim();
        if (!user || !pass) {
            setEditError("กรอกทั้ง User และ Pass");
            return;
        }

        const clashesWithAnotherRow = items.some(
            (item, index) => index !== editingIndex && getStockUser(item) === user
        );
        if (clashesWithAnotherRow) {
            setEditError(`User "${user}" มีในรายการนี้อยู่แล้ว`);
            return;
        }

        const next = [...items];
        next[editingIndex] = formatStockEntry(user, pass);
        onChange(next);
        cancelEditing();
    };

    const removeRow = (index: number) => {
        onChange(items.filter((_, itemIndex) => itemIndex !== index));
        if (editingIndex === index) cancelEditing();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{items.length} รายการ</Badge>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowPasswords((previous) => !previous)}
                >
                    {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPasswords ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                </Button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
                {items.map((item, index) => {
                    const user = getStockUser(item);
                    const pass = getStockPass(item);
                    const isNew = highlightFrom !== null && index >= highlightFrom;

                    if (editingIndex === index) {
                        return (
                            <div
                                key={`edit-${index}`}
                                className="space-y-2 rounded-xl border border-primary/40 bg-muted/40 p-3"
                            >
                                <Input
                                    value={editUser}
                                    onChange={(event) => setEditUser(event.target.value)}
                                    placeholder="User"
                                    className="h-8 font-mono text-xs"
                                    aria-label={`แก้ไข User รายการที่ ${index + 1}`}
                                />
                                <Input
                                    value={editPass}
                                    onChange={(event) => setEditPass(event.target.value)}
                                    placeholder="Pass"
                                    className="h-8 font-mono text-xs"
                                    aria-label={`แก้ไข Pass รายการที่ ${index + 1}`}
                                />
                                {editError ? <p className="text-xs text-destructive">{editError}</p> : null}
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" className="h-7 gap-1 text-xs" onClick={saveEditing}>
                                        <Check className="h-3.5 w-3.5" />
                                        บันทึก
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditing}>
                                        <X className="h-3.5 w-3.5" />
                                        ยกเลิก
                                    </Button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`${item}-${index}`}
                            className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition-colors ${
                                isNew
                                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                                    : "border-border bg-muted/40"
                            }`}
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    #{index + 1}
                                </Badge>
                                <span className="max-w-[200px] truncate font-mono text-xs">
                                    {user} / {showPasswords ? pass : "•".repeat(Math.min(pass.length, 10))}
                                </span>
                            </div>
                            <div className="flex flex-shrink-0 items-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => startEditing(index)}
                                    disabled={disabled}
                                    aria-label={`แก้ไขรายการที่ ${index + 1}`}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                    onClick={() => removeRow(index)}
                                    disabled={disabled}
                                    aria-label={`ลบรายการที่ ${index + 1}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
